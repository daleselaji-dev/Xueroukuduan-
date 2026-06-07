import http from 'node:http'
import crypto from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || join(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

const db = new Database(process.env.DB_PATH || join(dataDir, 'community.sqlite'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const port = Number(process.env.PORT || 18082)
const adminToken = process.env.ADMIN_TOKEN || ''
const publicBaseUrl = process.env.PUBLIC_BASE_URL || ''
const wechatAppId = process.env.WECHAT_APP_ID || ''
const wechatSecret = process.env.WECHAT_APP_SECRET || ''
const wechatRedirectUri = process.env.WECHAT_REDIRECT_URI || ''
const allowedTypes = new Set(['news', 'tools', 'discussions', 'submissions', 'magazine'])
const allowedEmoji = new Set([
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🤔', '👀', '🔥',
  '🚀', '💯', '✨', '🎉', '💡', '🧠', '🫡', '🤝', '☕', '🌊', '🧩', '🛠️',
])
const rateBuckets = new Map()

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'manual',
  provider_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_refs (
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (type, item_id)
);
CREATE TABLE IF NOT EXISTS reactions (
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (type, item_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL,
  matched_keyword TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS moderation_keywords (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);
`)

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const path = normalizePath(url.pathname)
    const cookies = parseCookies(req.headers.cookie || '')
    const context = ensureVisitor(req, res, cookies)

    setSecurityHeaders(res)

    if (req.method === 'OPTIONS') return sendJson(res, 204, {})
    if (req.method === 'GET' && path === '/api/health') return sendJson(res, 200, { ok: true })
    if (req.method === 'GET' && path === '/api/identity/status') return handleIdentityStatus(res, context)
    if (req.method === 'POST' && path === '/api/identity/manual') return await handleManualIdentity(req, res, context)
    if (req.method === 'GET' && path === '/api/auth/wechat/start') return handleWechatStart(res)
    if (req.method === 'GET' && path === '/api/auth/wechat/callback') return await handleWechatCallback(req, res, context, cookies, url)

    const itemMatch = path.match(/^\/api\/items\/([^/]+)\/([^/]+)\/(reactions|comments)$/)
    if (itemMatch) {
      const [, type, rawId, resource] = itemMatch
      const itemId = decodeURIComponent(rawId)
      validateContentRef(type, itemId)
      ensureContentRef(type, itemId)
      if (resource === 'reactions' && req.method === 'GET') return handleGetReactions(res, context, type, itemId)
      if (resource === 'reactions' && req.method === 'POST') return await handlePostReaction(req, res, context, type, itemId)
      if (resource === 'comments' && req.method === 'GET') return handleGetComments(res, type, itemId)
      if (resource === 'comments' && req.method === 'POST') return await handlePostComment(req, res, context, type, itemId)
    }

    if (path === '/api/admin/keywords') {
      requireAdmin(req)
      if (req.method === 'GET') return handleListKeywords(res)
      if (req.method === 'POST') return await handleCreateKeyword(req, res, context)
    }

    const keywordDelete = path.match(/^\/api\/admin\/keywords\/([^/]+)$/)
    if (keywordDelete && req.method === 'DELETE') {
      requireAdmin(req)
      return handleDeleteKeyword(res, context, decodeURIComponent(keywordDelete[1]))
    }

    if (path === '/api/admin/comments') {
      requireAdmin(req)
      if (req.method === 'GET') return handleAdminComments(res, url)
    }

    const commentPatch = path.match(/^\/api\/admin\/comments\/([^/]+)$/)
    if (commentPatch && req.method === 'PATCH') {
      requireAdmin(req)
      return await handlePatchComment(req, res, context, decodeURIComponent(commentPatch[1]))
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    const status = error.status || 500
    sendJson(res, status, { error: status === 500 ? 'Internal server error' : error.message })
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`flesh-seminar-api listening on 127.0.0.1:${port}`)
})

function normalizePath(pathname) {
  if (pathname === '/health') return '/api/health'
  if (pathname.startsWith('/api/')) return pathname
  return `/api${pathname}`
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Cache-Control', 'no-store')
}

function parseCookies(header) {
  const out = {}
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
  }
  return out
}

function ensureVisitor(_req, res, cookies) {
  let visitorId = cookies.visitor_id
  let csrfToken = cookies.csrf_token
  if (!isSafeId(visitorId)) visitorId = crypto.randomUUID()
  if (!isSafeToken(csrfToken)) csrfToken = crypto.randomBytes(24).toString('base64url')

  const now = new Date().toISOString()
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(visitorId)
  if (!existing) {
    db.prepare('INSERT INTO users (id, display_name, avatar_url, provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(visitorId, `访客-${visitorId.slice(0, 6)}`, '', 'anonymous', now, now)
  }

  appendCookie(res, `visitor_id=${encodeURIComponent(visitorId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`)
  appendCookie(res, `csrf_token=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax; Max-Age=31536000`)
  return { visitorId, csrfToken }
}

function appendCookie(res, value) {
  const existing = res.getHeader('Set-Cookie')
  if (!existing) res.setHeader('Set-Cookie', [value])
  else res.setHeader('Set-Cookie', [...existing, value])
}

function handleIdentityStatus(res, context) {
  const user = db.prepare('SELECT display_name AS displayName, avatar_url AS avatarUrl, provider FROM users WHERE id = ?').get(context.visitorId)
  sendJson(res, 200, {
    displayName: user?.displayName || '',
    avatarUrl: user?.avatarUrl || '',
    provider: user?.provider || 'anonymous',
    needsName: !user || user.provider === 'anonymous',
    wechatEnabled: Boolean(wechatAppId && wechatSecret && wechatRedirectUri),
  })
}

async function handleManualIdentity(req, res, context) {
  requireWrite(req, context, 'identity')
  const body = await readJson(req, 2048)
  const displayName = validateDisplayName(body.displayName)
  const avatarUrl = validateAvatarUrl(body.avatarUrl || '')
  const now = new Date().toISOString()
  db.prepare('UPDATE users SET display_name = ?, avatar_url = ?, provider = ?, updated_at = ? WHERE id = ?')
    .run(displayName, avatarUrl, 'manual', now, context.visitorId)
  audit(context.visitorId, 'identity.manual', context.visitorId, {})
  sendJson(res, 200, { ok: true })
}

function handleWechatStart(res) {
  if (!(wechatAppId && wechatSecret && wechatRedirectUri)) {
    return sendJson(res, 501, { error: 'WeChat OAuth is not configured' })
  }
  const state = crypto.randomBytes(16).toString('base64url')
  appendCookie(res, `wechat_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`)
  const redirect = new URL('https://open.weixin.qq.com/connect/oauth2/authorize')
  redirect.searchParams.set('appid', wechatAppId)
  redirect.searchParams.set('redirect_uri', wechatRedirectUri)
  redirect.searchParams.set('response_type', 'code')
  redirect.searchParams.set('scope', 'snsapi_userinfo')
  redirect.searchParams.set('state', state)
  res.writeHead(302, { Location: `${redirect.toString()}#wechat_redirect` })
  res.end()
}

async function handleWechatCallback(_req, res, context, cookies, url) {
  if (!(wechatAppId && wechatSecret && wechatRedirectUri)) {
    return sendJson(res, 501, { error: 'WeChat OAuth is not configured' })
  }

  const code = url.searchParams.get('code') || ''
  const state = url.searchParams.get('state') || ''
  if (!code || !state || state !== cookies.wechat_state) throw httpError(400, 'Invalid WeChat callback state')

  const tokenUrl = new URL('https://api.weixin.qq.com/sns/oauth2/access_token')
  tokenUrl.searchParams.set('appid', wechatAppId)
  tokenUrl.searchParams.set('secret', wechatSecret)
  tokenUrl.searchParams.set('code', code)
  tokenUrl.searchParams.set('grant_type', 'authorization_code')
  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()
  if (!tokenRes.ok || tokenData.errcode || !tokenData.access_token || !tokenData.openid) {
    throw httpError(502, 'WeChat token exchange failed')
  }

  const userUrl = new URL('https://api.weixin.qq.com/sns/userinfo')
  userUrl.searchParams.set('access_token', tokenData.access_token)
  userUrl.searchParams.set('openid', tokenData.openid)
  userUrl.searchParams.set('lang', 'zh_CN')
  const userRes = await fetch(userUrl)
  const userData = await userRes.json()
  if (!userRes.ok || userData.errcode) throw httpError(502, 'WeChat userinfo failed')

  const displayName = validateDisplayName(userData.nickname || '微信用户')
  const avatarUrl = normalizeWechatAvatar(userData.headimgurl || '')
  const now = new Date().toISOString()
  db.prepare('UPDATE users SET display_name = ?, avatar_url = ?, provider = ?, provider_id = ?, updated_at = ? WHERE id = ?')
    .run(displayName, avatarUrl, 'wechat', tokenData.openid, now, context.visitorId)
  audit(context.visitorId, 'identity.wechat', context.visitorId, { openid: tokenData.openid })

  const target = publicBaseUrl || '/'
  res.writeHead(302, { Location: target })
  res.end()
}

function handleGetReactions(res, context, type, itemId) {
  const counts = {}
  for (const row of db.prepare('SELECT emoji, COUNT(*) AS count FROM reactions WHERE type = ? AND item_id = ? GROUP BY emoji').all(type, itemId)) {
    counts[row.emoji] = row.count
  }
  const mine = db.prepare('SELECT emoji FROM reactions WHERE type = ? AND item_id = ? AND user_id = ?').all(type, itemId, context.visitorId).map(row => row.emoji)
  sendJson(res, 200, { counts, mine })
}

async function handlePostReaction(req, res, context, type, itemId) {
  requireWrite(req, context, 'reaction')
  const body = await readJson(req, 1024)
  const emoji = String(body.emoji || '')
  if (!allowedEmoji.has(emoji)) throw httpError(400, 'Unsupported emoji')
  const existing = db.prepare('SELECT 1 FROM reactions WHERE type = ? AND item_id = ? AND user_id = ? AND emoji = ?').get(type, itemId, context.visitorId, emoji)
  if (existing) {
    db.prepare('DELETE FROM reactions WHERE type = ? AND item_id = ? AND user_id = ? AND emoji = ?').run(type, itemId, context.visitorId, emoji)
  } else {
    db.prepare('INSERT INTO reactions (type, item_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)').run(type, itemId, context.visitorId, emoji, new Date().toISOString())
  }
  audit(context.visitorId, existing ? 'reaction.delete' : 'reaction.create', `${type}:${itemId}`, { emoji })
  handleGetReactions(res, context, type, itemId)
}

function handleGetComments(res, type, itemId) {
  const comments = db.prepare(`
    SELECT c.id, c.body, c.created_at AS createdAt, u.display_name AS displayName, u.avatar_url AS avatarUrl
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.type = ? AND c.item_id = ? AND c.status = 'visible'
    ORDER BY c.created_at ASC
    LIMIT 200
  `).all(type, itemId)
  sendJson(res, 200, { comments })
}

async function handlePostComment(req, res, context, type, itemId) {
  requireWrite(req, context, 'comment')
  const body = await readJson(req, 4096)
  const text = validateComment(body.body)
  const match = matchKeyword(text)
  const status = match ? 'pending' : 'visible'
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  db.prepare('INSERT INTO comments (id, type, item_id, user_id, body, status, matched_keyword, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, type, itemId, context.visitorId, text, status, match || '', now, now)
  audit(context.visitorId, 'comment.create', id, { type, itemId, status })
  sendJson(res, 201, { id, status })
}

function handleListKeywords(res) {
  const keywords = db.prepare('SELECT id, keyword, category, created_at AS createdAt FROM moderation_keywords ORDER BY created_at DESC').all()
  sendJson(res, 200, { keywords })
}

async function handleCreateKeyword(req, res, context) {
  const body = await readJson(req, 2048)
  const keyword = validateKeyword(body.keyword)
  const category = validateKeywordCategory(body.category || 'general')
  const id = crypto.randomUUID()
  db.prepare('INSERT OR IGNORE INTO moderation_keywords (id, keyword, category, created_at) VALUES (?, ?, ?, ?)')
    .run(id, keyword, category, new Date().toISOString())
  audit(context.visitorId, 'keyword.create', keyword, { category })
  handleListKeywords(res)
}

function handleDeleteKeyword(res, context, id) {
  if (!isSafeId(id)) throw httpError(400, 'Invalid keyword id')
  db.prepare('DELETE FROM moderation_keywords WHERE id = ?').run(id)
  audit(context.visitorId, 'keyword.delete', id, {})
  handleListKeywords(res)
}

function handleAdminComments(res, url) {
  const status = url.searchParams.get('status') || 'pending'
  if (!['pending', 'visible', 'hidden'].includes(status)) throw httpError(400, 'Invalid status')
  const comments = db.prepare(`
    SELECT c.*, u.display_name AS displayName
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.status = ?
    ORDER BY c.created_at DESC
    LIMIT 200
  `).all(status)
  sendJson(res, 200, { comments })
}

async function handlePatchComment(req, res, context, id) {
  if (!isSafeId(id)) throw httpError(400, 'Invalid comment id')
  const body = await readJson(req, 1024)
  const status = String(body.status || '')
  if (!['pending', 'visible', 'hidden'].includes(status)) throw httpError(400, 'Invalid status')
  db.prepare('UPDATE comments SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), id)
  audit(context.visitorId, 'comment.moderate', id, { status })
  sendJson(res, 200, { ok: true })
}

function validateContentRef(type, itemId) {
  if (!allowedTypes.has(type)) throw httpError(400, 'Invalid content type')
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(itemId)) throw httpError(400, 'Invalid item id')
}

function ensureContentRef(type, itemId) {
  db.prepare('INSERT OR IGNORE INTO content_refs (type, item_id, created_at) VALUES (?, ?, ?)')
    .run(type, itemId, new Date().toISOString())
}

function validateDisplayName(value) {
  const text = String(value || '').trim()
  if (text.length < 1 || text.length > 40) throw httpError(400, 'Invalid display name')
  if (/[\u0000-\u001f\u007f<>]/.test(text)) throw httpError(400, 'Invalid display name')
  return text
}

function validateAvatarUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.length > 300) throw httpError(400, 'Invalid avatar URL')
  try {
    const url = new URL(text)
    if (url.protocol !== 'https:') throw new Error('bad protocol')
    return url.toString()
  } catch {
    throw httpError(400, 'Avatar URL must be https')
  }
}

function normalizeWechatAvatar(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  try {
    const url = new URL(text)
    if (url.protocol === 'http:') url.protocol = 'https:'
    if (url.protocol !== 'https:') return ''
    return url.toString()
  } catch {
    return ''
  }
}

function validateComment(value) {
  const text = String(value || '').trim()
  if (text.length < 1 || text.length > 1000) throw httpError(400, 'Invalid comment')
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw httpError(400, 'Invalid comment')
  return text
}

function validateKeyword(value) {
  const text = String(value || '').trim()
  if (text.length < 1 || text.length > 80) throw httpError(400, 'Invalid keyword')
  return text
}

function validateKeywordCategory(value) {
  const text = String(value || '').trim()
  if (!/^[\w\u4e00-\u9fa5 -]{1,40}$/.test(text)) throw httpError(400, 'Invalid category')
  return text
}

function matchKeyword(text) {
  const normalized = text.toLocaleLowerCase()
  for (const row of db.prepare('SELECT keyword FROM moderation_keywords').all()) {
    if (row.keyword && normalized.includes(String(row.keyword).toLocaleLowerCase())) return row.keyword
  }
  return ''
}

function requireWrite(req, context, bucket) {
  validateOrigin(req)
  if (req.headers['x-csrf-token'] !== context.csrfToken) throw httpError(403, 'Invalid CSRF token')
  rateLimit(`${bucket}:${clientIp(req)}:${context.visitorId}`, bucket === 'comment' ? 12 : 60, 60_000)
}

function validateOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return
  const host = req.headers.host
  try {
    const parsed = new URL(origin)
    if (parsed.host !== host) throw httpError(403, 'Invalid origin')
  } catch {
    throw httpError(403, 'Invalid origin')
  }
}

function requireAdmin(req) {
  if (!adminToken) throw httpError(503, 'Admin token is not configured')
  const header = req.headers.authorization || ''
  if (header !== `Bearer ${adminToken}`) throw httpError(401, 'Unauthorized')
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const bucket = rateBuckets.get(key) || []
  const fresh = bucket.filter(t => now - t < windowMs)
  if (fresh.length >= limit) throw httpError(429, 'Rate limit exceeded')
  fresh.push(now)
  rateBuckets.set(key, fresh)
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
}

async function readJson(req, maxBytes) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw httpError(413, 'Request body too large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw httpError(400, 'Invalid JSON')
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  if (status === 204) return res.end()
  res.end(JSON.stringify(payload))
}

function audit(actor, action, target, detail) {
  db.prepare('INSERT INTO audit_events (id, actor_user_id, action, target, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), actor || null, action, target, JSON.stringify(detail || {}), new Date().toISOString())
}

function isSafeId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9-]{20,80}$/.test(value)
}

function isSafeToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,120}$/.test(value)
}

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}
