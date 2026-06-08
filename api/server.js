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
const allowedTypes = new Set(['news', 'discussions', 'submissions', 'tools', 'magazine', 'hotlist'])
const allowedEmoji = new Set([
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏',
  '🙏', '🤔', '👀', '🔥', '🚀', '💯', '✨', '🎉',
  '💡', '🧠', '🫡', '🤝', '☕', '🌊', '🧩', '🛠️',
])
const rateBuckets = new Map()

// ── Schema ──
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reactions (
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (type, item_id, user_id, emoji)
);
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_lifecycle (
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  published_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (type, item_id)
);
`)

// ── Prepared statements ──
const stmts = {
  getUser: db.prepare('SELECT * FROM users WHERE id = ?'),
  upsertUser: db.prepare(`INSERT INTO users (id, display_name, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name, avatar_url=excluded.avatar_url, updated_at=excluded.updated_at`),
  getReactions: db.prepare('SELECT emoji, COUNT(*) as cnt FROM reactions WHERE type = ? AND item_id = ? GROUP BY emoji'),
  getMyReactions: db.prepare('SELECT emoji FROM reactions WHERE type = ? AND item_id = ? AND user_id = ?'),
  addReaction: db.prepare('INSERT OR IGNORE INTO reactions (type, item_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?, ?)'),
  removeReaction: db.prepare('DELETE FROM reactions WHERE type = ? AND item_id = ? AND user_id = ? AND emoji = ?'),
  getExperiences: db.prepare(`SELECT e.*, u.display_name, u.avatar_url FROM experiences e LEFT JOIN users u ON e.user_id = u.id WHERE e.type = ? AND e.item_id = ? ORDER BY e.created_at DESC`),
  addExperience: db.prepare('INSERT INTO experiences (id, type, item_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'),
  setLifecycle: db.prepare(`INSERT INTO content_lifecycle (type, item_id, published_at, archived) VALUES (?, ?, ?, ?)
    ON CONFLICT(type, item_id) DO UPDATE SET published_at=excluded.published_at, archived=excluded.archived`),
  getLifecycle: db.prepare('SELECT * FROM content_lifecycle WHERE type = ? AND item_id = ?'),
  getArchived: db.prepare('SELECT * FROM content_lifecycle WHERE type = ? AND archived = 1 ORDER BY published_at DESC'),
}

// ── Helpers ──
function visitorId(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/sid=([^;]+)/)
  if (match) return match[1]
  return crypto.randomUUID()
}

function httpError(code, msg) { const e = new Error(msg); e.statusCode = code; return e }

function rateLimit(key, limit = 30, windowMs = 60000) {
  const now = Date.now()
  const bucket = rateBuckets.get(key) || { count: 0, reset: now + windowMs }
  if (now > bucket.reset) { bucket.count = 0; bucket.reset = now + windowMs }
  bucket.count++
  rateBuckets.set(key, bucket)
  if (bucket.count > limit) throw httpError(429, 'Too many requests')
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', c => { size += c.length; if (size > 8192) reject(httpError(413, 'Body too large')); chunks.push(c) })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())) } catch { reject(httpError(400, 'Invalid JSON')) } })
    req.on('error', reject)
  })
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseUrl(url) {
  const u = new URL(url, 'http://localhost')
  return { pathname: u.pathname, query: Object.fromEntries(u.searchParams) }
}

// ── Routes ──
async function handleRequest(req, res) {
  try {
    const { pathname } = parseUrl(req.url)
    const method = req.method
    const vid = visitorId(req)

    // Set visitor cookie if missing
    if (!(req.headers.cookie || '').includes('sid=')) {
      res.setHeader('Set-Cookie', `sid=${vid}; Path=/; SameSite=Lax; Max-Age=31536000`)
    }

    // Health
    if (pathname === '/api/health' && method === 'GET') return json(res, { ok: true })

    // Identity
    if (pathname === '/api/identity/manual' && method === 'POST') {
      rateLimit(`identity:${vid}`)
      const body = await parseBody(req)
      const name = String(body.displayName || '').trim().slice(0, 40)
      const avatar = String(body.avatarUrl || '').trim().slice(0, 300)
      if (!name) throw httpError(400, '昵称不能为空')
      if (name.length > 40) throw httpError(400, '昵称过长')
      if (avatar && !avatar.startsWith('https://')) throw httpError(400, '头像只允许 https:// 链接')
      const now = new Date().toISOString()
      stmts.upsertUser.run(vid, name, avatar, now, now)
      return json(res, { ok: true })
    }

    if (pathname === '/api/identity/status' && method === 'GET') {
      const user = stmts.getUser.get(vid)
      return json(res, {
        needsName: !user,
        displayName: user?.display_name || '',
        avatarUrl: user?.avatar_url || '',
        wechatEnabled: false,
      })
    }

    // Reactions: /api/items/:type/:id/reactions
    const reactionMatch = pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)\/reactions$/)
    if (reactionMatch) {
      const [, type, id] = reactionMatch
      if (!allowedTypes.has(type)) throw httpError(400, 'Invalid type')
      if (!/^[\w\u4e00-\u9fa5-]{1,120}$/.test(decodeURIComponent(id))) throw httpError(400, 'Invalid id')

      if (method === 'GET') {
        const counts = {}
        for (const row of stmts.getReactions.all(type, id)) counts[row.emoji] = row.cnt
        const mine = stmts.getMyReactions.all(type, id, vid).map(r => r.emoji)
        return json(res, { counts, mine })
      }
      if (method === 'POST') {
        rateLimit(`reaction:${vid}`)
        const body = await parseBody(req)
        const emoji = String(body.emoji || '').trim()
        if (!allowedEmoji.has(emoji)) throw httpError(400, '不支持的表情')
        const existing = db.prepare('SELECT 1 FROM reactions WHERE type=? AND item_id=? AND user_id=? AND emoji=?').get(type, id, vid, emoji)
        if (existing) {
          stmts.removeReaction.run(type, id, vid, emoji)
        } else {
          stmts.addReaction.run(type, id, vid, emoji, new Date().toISOString())
        }
        const counts = {}
        for (const row of stmts.getReactions.all(type, id)) counts[row.emoji] = row.cnt
        const mine = stmts.getMyReactions.all(type, id, vid).map(r => r.emoji)
        return json(res, { counts, mine })
      }
    }

    // Experiences: /api/items/:type/:id/experiences
    const expMatch = pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)\/experiences$/)
    if (expMatch) {
      const [, type, id] = expMatch
      if (!allowedTypes.has(type)) throw httpError(400, 'Invalid type')

      if (method === 'GET') {
        const rows = stmts.getExperiences.all(type, id)
        return json(res, { experiences: rows.map(r => ({
          id: r.id, body: r.body, createdAt: r.created_at,
          displayName: r.display_name || '匿名', avatarUrl: r.avatar_url || '',
        })) })
      }
      if (method === 'POST') {
        rateLimit(`exp:${vid}`)
        const body = await parseBody(req)
        const text = String(body.body || '').trim()
        if (!text) throw httpError(400, '内容不能为空')
        if (text.length > 2000) throw httpError(400, '内容过长')
        const user = stmts.getUser.get(vid)
        if (!user) throw httpError(400, '请先保存身份')
        stmts.addExperience.run(crypto.randomUUID(), type, id, vid, text, new Date().toISOString())
        return json(res, { ok: true })
      }
    }

    // Lifecycle: /api/items/:type/:id/lifecycle
    const lcMatch = pathname.match(/^\/api\/items\/([^/]+)\/([^/]+)\/lifecycle$/)
    if (lcMatch && method === 'GET') {
      const [, type, id] = lcMatch
      const lc = stmts.getLifecycle.get(type, id)
      return json(res, { lifecycle: lc || null })
    }

    throw httpError(404, 'Not found')
  } catch (err) {
    const status = err.statusCode || 500
    json(res, { error: err.message || 'Internal error' }, status)
  }
}

const server = http.createServer(handleRequest)
server.listen(port, '127.0.0.1', () => {
  console.log(`flesh-seminar-api listening on 127.0.0.1:${port}`)
})
