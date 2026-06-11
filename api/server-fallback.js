import http from 'node:http'
import crypto from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const apiDir = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR || join(apiDir, 'data')
mkdirSync(dataDir, { recursive: true })

const db = new Database(process.env.DB_PATH || join(dataDir, 'community.sqlite'))
db.pragma('journal_mode=WAL')
db.pragma('foreign_keys=ON')

const port = Number(process.env.PORT || 18082)
const adminToken = process.env.ADMIN_TOKEN || ''
const rateBuckets = new Map()
const types = ['news', 'tools', 'discussions', 'submissions']
const allowedEmojis = new Set([
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '👏',
  '🙏', '🤔', '👀', '🔥', '🚀', '💯', '✨', '🎉',
  '💡', '🧠', '🫡', '🤝', '☕', '🌊', '🧩', '🛠️',
])

const allowedUnicodeEmojis = new Set([
  '👍', '👎', '❤️', '😂', '😮', '🤔', '😢', '👏',
  '🙏', '✨', '👀', '🔥', '🚀', '💯', '✅', '🎉',
  '💡', '🧠', '📝', '🔗', '☕', '🌱', '🧪', '🛠️',
])

const allowedEmojiCodes = new Set([
  '1f44d', '1f44e', '2764-fe0f', '1f602', '1f62e', '1f914', '1f622', '1f44f',
  '1f64f', '2728', '1f440', '1f525', '1f680', '1f4af', '2705', '1f389',
  '1f4a1', '1f9e0', '1f4dd', '1f517', '2615', '1f331', '1f9ea', '1f6e0-fe0f',
])

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
  PRIMARY KEY(type,item_id,user_id,emoji)
);
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS experiences (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_links (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pin_votes (
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(type,item_id,user_id)
);
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  body TEXT DEFAULT '',
  source TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  author_id TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  published_at TEXT NOT NULL,
  archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  url TEXT DEFAULT '',
  author_id TEXT NOT NULL,
  tags TEXT DEFAULT '',
  published_at TEXT NOT NULL,
  archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS discussions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  author_id TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  published_at TEXT NOT NULL,
  archived INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  author_id TEXT NOT NULL,
  tags TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`)

for (const table of types) {
  ensureColumn(table, 'pinned_until', 'TEXT')
  ensureColumn(table, 'updated_at', 'TEXT')
}

const statements = {
  getUser: db.prepare('SELECT * FROM users WHERE id=?'),
  upsertUser: db.prepare(`
    INSERT INTO users(id,display_name,avatar_url,created_at,updated_at)
    VALUES(?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET
      display_name=excluded.display_name,
      avatar_url=excluded.avatar_url,
      updated_at=excluded.updated_at
  `),
  deleteUserReactions: db.prepare('DELETE FROM reactions WHERE type=? AND item_id=? AND user_id=?'),
  getMineReaction: db.prepare('SELECT emoji FROM reactions WHERE type=? AND item_id=? AND user_id=?'),
  addReaction: db.prepare('INSERT INTO reactions(type,item_id,user_id,emoji,created_at) VALUES(?,?,?,?,?)'),
  reactionCounts: db.prepare('SELECT emoji,COUNT(*) AS cnt FROM reactions WHERE type=? AND item_id=? GROUP BY emoji ORDER BY cnt DESC'),
  addComment: db.prepare('INSERT INTO comments(id,type,item_id,user_id,body,created_at,updated_at) VALUES(?,?,?,?,?,?,?)'),
  getComments: db.prepare(`
    SELECT c.*,u.display_name,u.avatar_url
    FROM comments c LEFT JOIN users u ON u.id=c.user_id
    WHERE c.type=? AND c.item_id=?
    ORDER BY c.created_at ASC
  `),
  countComments: db.prepare('SELECT COUNT(*) AS n FROM comments WHERE type=? AND item_id=?'),
  addLink: db.prepare(`
    INSERT INTO content_links(id,source_type,source_id,target_type,target_id,user_id,note,created_at)
    VALUES(?,?,?,?,?,?,?,?)
  `),
  getLinks: db.prepare(`
    SELECT l.*,u.display_name
    FROM content_links l LEFT JOIN users u ON u.id=l.user_id
    WHERE (l.source_type=? AND l.source_id=?) OR (l.target_type=? AND l.target_id=?)
    ORDER BY l.created_at DESC
  `),
  countLinks: db.prepare('SELECT COUNT(*) AS n FROM content_links WHERE source_type=? AND source_id=? OR target_type=? AND target_id=?'),
  getPinVote: db.prepare('SELECT 1 FROM pin_votes WHERE type=? AND item_id=? AND user_id=?'),
  addPinVote: db.prepare('INSERT INTO pin_votes(type,item_id,user_id,created_at) VALUES(?,?,?,?)'),
  removePinVote: db.prepare('DELETE FROM pin_votes WHERE type=? AND item_id=? AND user_id=?'),
  countPinVotes: db.prepare('SELECT COUNT(*) AS n FROM pin_votes WHERE type=? AND item_id=?'),
  topReactions: db.prepare('SELECT type,item_id,COUNT(*) AS total FROM reactions GROUP BY type,item_id ORDER BY total DESC LIMIT 20'),
  trendingLinks: db.prepare('SELECT target_type AS type,target_id AS item_id,COUNT(*) AS links FROM content_links GROUP BY target_type,target_id ORDER BY links DESC LIMIT 10'),
}

const tables = {
  news: tableApi('news', 'published_at', 'author_id', {
    insert: `INSERT INTO news(id,title,summary,body,source,source_url,author_id,category,published_at,archived,created_at,updated_at,pinned_until)
             VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    update: `UPDATE news SET title=?,summary=?,body=?,source=?,source_url=?,category=?,updated_at=? WHERE id=?`,
  }),
  tools: tableApi('tools', 'published_at', 'author_id', {
    insert: `INSERT INTO tools(id,title,description,url,author_id,tags,published_at,archived,created_at,updated_at,pinned_until)
             VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    update: `UPDATE tools SET title=?,description=?,url=?,tags=?,updated_at=? WHERE id=?`,
  }),
  discussions: tableApi('discussions', 'published_at', 'author_id', {
    insert: `INSERT INTO discussions(id,title,body,author_id,category,published_at,archived,created_at,updated_at,pinned_until)
             VALUES(?,?,?,?,?,?,?,?,?,?)`,
    update: `UPDATE discussions SET title=?,body=?,category=?,updated_at=? WHERE id=?`,
  }),
  submissions: tableApi('submissions', 'submitted_at', 'author_id', {
    insert: `INSERT INTO submissions(id,title,body,author_id,tags,status,submitted_at,created_at,updated_at,pinned_until)
             VALUES(?,?,?,?,?,?,?,?,?,?)`,
    update: `UPDATE submissions SET title=?,body=?,tags=?,updated_at=? WHERE id=?`,
  }),
}

const server = http.createServer(async (req, res) => {
  try {
    const { path, query } = parseUrl(req.url)
    const method = req.method || 'GET'
    const sid = getSessionId(req)

    if (!hasSession(req)) {
      res.setHeader('Set-Cookie', `sid=${sid}; Path=/; SameSite=Lax; Max-Age=31536000`)
    }

    let user = statements.getUser.get(sid)
    if (!user) {
      const now = isoNow()
      statements.upsertUser.run(sid, `访客-${sid.slice(0, 6)}`, '', now, now)
      user = statements.getUser.get(sid)
    }

    if (path === '/api/health' && method === 'GET') return json(res, { ok: true })

    if (path === '/api/identity/status' && method === 'GET') {
      return json(res, {
        needsName: !user.display_name || user.display_name.startsWith('访客-'),
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        wechatEnabled: false,
      })
    }

    if (path === '/api/identity/manual' && method === 'POST') {
      rateLimit(`identity:${sid}`, 30, 60000)
      const body = await readJson(req)
      const name = clean(body.displayName, 40)
      const avatarUrl = clean(body.avatarUrl, 300)
      if (!name) throw httpError(400, '昵称不能为空')
      if (avatarUrl && !avatarUrl.startsWith('https://')) throw httpError(400, '头像 URL 必须以 https:// 开头')
      const now = isoNow()
      statements.upsertUser.run(sid, name, avatarUrl, now, now)
      return json(res, { ok: true, displayName: name, avatarUrl })
    }

    if (path === '/api/items' && method === 'GET') {
      const type = assertType(query.type)
      const limit = Math.min(Number(query.limit) || 50, 100)
      const offset = Math.max(Number(query.offset) || 0, 0)
      const filter = query.filter || 'all'
      const rows = tables[type].list.all(limit, offset)
      const filtered = filterItems(type, rows, filter)
      return json(res, {
        items: filtered.map((row) => enrichItem(type, row, sid)),
        total: tables[type].count.get().n,
        limit,
        offset,
      })
    }

    if (path === '/api/items' && method === 'POST') {
      rateLimit(`create:${sid}`, 12, 60000)
      requireNamedUser(user)
      const body = await readJson(req)
      const created = createItem(body, sid)
      if (body.inspiredBy?.type && body.inspiredBy?.itemId) {
        createLink(body.inspiredBy.type, body.inspiredBy.itemId, created.type, created.id, sid, body.inspiredBy.note || '启发')
      }
      return json(res, created, 201)
    }

    const itemMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)$/)
    const reactionMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)\/reactions$/)
    const commentMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)\/comments$/)
    const legacyExperienceMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)\/experiences$/)
    const linkMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)\/links$/)
    const pinMatch = path.match(/^\/api\/items\/(\w+)\/([^/]+)\/pin-vote$/)

    if (itemMatch && !reactionMatch && !commentMatch && !legacyExperienceMatch && !linkMatch && !pinMatch) {
      const type = assertType(itemMatch[1])
      const id = itemMatch[2]

      if (method === 'GET') {
        const item = tables[type].get.get(id)
        if (!item) throw httpError(404, '内容不存在')
        return json(res, enrichItem(type, item, sid))
      }

      if (method === 'PUT') {
        rateLimit(`edit:${sid}`, 30, 60000)
        const item = tables[type].get.get(id)
        if (!item) throw httpError(404, '内容不存在')
        requireCanEdit(req, user, item)
        const body = await readJson(req)
        updateItem(type, id, body)
        return json(res, enrichItem(type, tables[type].get.get(id), sid))
      }

      if (method === 'DELETE') {
        requireAdmin(req)
        tables[type].delete.run(id)
        db.prepare('DELETE FROM reactions WHERE type=? AND item_id=?').run(type, id)
        db.prepare('DELETE FROM comments WHERE type=? AND item_id=?').run(type, id)
        db.prepare('DELETE FROM content_links WHERE source_type=? AND source_id=? OR target_type=? AND target_id=?').run(type, id, type, id)
        db.prepare('DELETE FROM pin_votes WHERE type=? AND item_id=?').run(type, id)
        return json(res, { ok: true })
      }
    }

    if (reactionMatch) {
      const type = assertType(reactionMatch[1])
      const id = reactionMatch[2]
      ensureItem(type, id)

      if (method === 'GET') return json(res, reactionState(type, id, sid))

      if (method === 'POST') {
        rateLimit(`reaction:${sid}`, 90, 60000)
        const body = await readJson(req)
        const emoji = clean(body.emoji, 8)
        if (!allowedEmojis.has(emoji) && !allowedUnicodeEmojis.has(emoji) && !allowedEmojiCodes.has(emojiCode(emoji))) throw httpError(400, '不支持这个 emoji')
        const current = statements.getMineReaction.get(type, id, sid)?.emoji
        statements.deleteUserReactions.run(type, id, sid)
        if (current !== emoji) statements.addReaction.run(type, id, sid, emoji, isoNow())
        return json(res, reactionState(type, id, sid))
      }
    }

    if (commentMatch || legacyExperienceMatch) {
      const match = commentMatch || legacyExperienceMatch
      const type = assertType(match[1])
      const id = match[2]
      ensureItem(type, id)

      if (method === 'GET') {
        const comments = statements.getComments.all(type, id).map(commentDto)
        if (legacyExperienceMatch) return json(res, { experiences: comments })
        return json(res, { comments })
      }

      if (method === 'POST') {
        rateLimit(`comment:${sid}`, 24, 60000)
        requireNamedUser(user)
        const body = await readJson(req)
        const text = clean(body.body, 2000)
        if (!text) throw httpError(400, '评论不能为空')
        const now = isoNow()
        statements.addComment.run(crypto.randomUUID(), type, id, sid, text, now, now)
        return json(res, { ok: true })
      }
    }

    if (linkMatch) {
      const type = assertType(linkMatch[1])
      const id = linkMatch[2]
      ensureItem(type, id)

      if (method === 'GET') {
        return json(res, { links: statements.getLinks.all(type, id, type, id) })
      }

      if (method === 'POST') {
        rateLimit(`link:${sid}`, 24, 60000)
        requireNamedUser(user)
        const body = await readJson(req)
        const targetType = assertType(body.targetType)
        const targetId = clean(body.targetId, 80)
        ensureItem(targetType, targetId)
        createLink(type, id, targetType, targetId, sid, body.note || '启发')
        return json(res, { ok: true })
      }
    }

    if (pinMatch) {
      const type = assertType(pinMatch[1])
      const id = pinMatch[2]
      ensureItem(type, id)
      if (method !== 'POST') throw httpError(405, 'method')
      rateLimit(`pin:${sid}`, 30, 60000)
      requireNamedUser(user)
      const hadVote = Boolean(statements.getPinVote.get(type, id, sid))
      if (hadVote) statements.removePinVote.run(type, id, sid)
      else statements.addPinVote.run(type, id, sid, isoNow())
      const votes = statements.countPinVotes.get(type, id).n
      if (votes >= 4) {
        const until = new Date(Date.now() + pinDays(type) * 86400000).toISOString()
        tables[type].pin.run(until, id)
      }
      return json(res, { votes, mine: !hadVote, pinned: isPinned(tables[type].get.get(id)) })
    }

    if (path === '/api/stats' && method === 'GET') {
      return json(res, { topReactions: statements.topReactions.all(), trending: statements.trendingLinks.all() })
    }

    if (path === '/api/lifecycle' && method === 'GET') {
      const out = {}
      for (const type of ['news', 'discussions', 'tools']) {
        const rows = db.prepare(`SELECT id,published_at FROM ${type}`).all()
        const max = activeDays(type) * 86400000
        out[type] = {
          active: rows.filter((row) => Date.now() - new Date(row.published_at).getTime() < max).length,
          archived: rows.filter((row) => Date.now() - new Date(row.published_at).getTime() >= max).length,
        }
      }
      return json(res, out)
    }

    throw httpError(404, 'not found')
  } catch (error) {
    json(res, { error: error.message || 'server error' }, error.statusCode || 500)
  }
})

server.listen(port, '127.0.0.1', () => {
  console.log(`community api on ${port}`)
})

function tableApi(table, orderField, authorField, sql) {
  return {
    list: db.prepare(`
      SELECT t.*,u.display_name AS author_name,u.avatar_url AS author_avatar
      FROM ${table} t LEFT JOIN users u ON u.id=t.${authorField}
      ORDER BY
        CASE WHEN t.pinned_until IS NOT NULL AND datetime(t.pinned_until)>datetime('now') THEN 0 ELSE 1 END,
        datetime(t.${orderField}) DESC
      LIMIT ? OFFSET ?
    `),
    get: db.prepare(`SELECT t.*,u.display_name AS author_name,u.avatar_url AS author_avatar FROM ${table} t LEFT JOIN users u ON u.id=t.${authorField} WHERE t.id=?`),
    count: db.prepare(`SELECT COUNT(*) AS n FROM ${table}`),
    delete: db.prepare(`DELETE FROM ${table} WHERE id=?`),
    insert: db.prepare(sql.insert),
    update: db.prepare(sql.update),
    pin: db.prepare(`UPDATE ${table} SET pinned_until=? WHERE id=?`),
  }
}

function createItem(body, userId) {
  const type = assertType(body.type)
  const title = clean(body.title, 120)
  const now = isoNow()
  const id = crypto.randomUUID()
  if (!title) throw httpError(400, '标题不能为空')

  if (type === 'news') {
    tables.news.insert.run(
      id, title, clean(body.summary, 300), clean(body.body, 8000), clean(body.source, 100),
      clean(body.source_url, 500), userId, clean(body.category, 50) || 'general', now, 0, now, now, null,
    )
  }
  if (type === 'tools') {
    tables.tools.insert.run(
      id, title, clean(body.description ?? body.body, 500), clean(body.url, 500), userId,
      normalizeTags(body.tags), now, 0, now, now, null,
    )
  }
  if (type === 'discussions') {
    tables.discussions.insert.run(id, title, clean(body.body, 8000), userId, clean(body.category, 50) || 'general', now, 0, now, now, null)
  }
  if (type === 'submissions') {
    tables.submissions.insert.run(id, title, clean(body.body, 8000), userId, normalizeTags(body.tags), 'visible', now, now, now, null)
  }
  return { id, type }
}

function updateItem(type, id, body) {
  const title = clean(body.title, 120)
  if (!title) throw httpError(400, '标题不能为空')
  const now = isoNow()
  if (type === 'news') {
    tables.news.update.run(title, clean(body.summary, 300), clean(body.body, 8000), clean(body.source, 100), clean(body.source_url, 500), clean(body.category, 50) || 'general', now, id)
  }
  if (type === 'tools') {
    tables.tools.update.run(title, clean(body.description ?? body.body, 500), clean(body.url, 500), normalizeTags(body.tags), now, id)
  }
  if (type === 'discussions') {
    tables.discussions.update.run(title, clean(body.body, 8000), clean(body.category, 50) || 'general', now, id)
  }
  if (type === 'submissions') {
    tables.submissions.update.run(title, clean(body.body, 8000), normalizeTags(body.tags), now, id)
  }
}

function enrichItem(type, row, userId) {
  const reactions = {}
  for (const item of statements.reactionCounts.all(type, row.id)) reactions[item.emoji] = item.cnt
  const pinVotes = statements.countPinVotes.get(type, row.id).n
  return {
    ...row,
    type,
    author_name: row.author_name || row.an || '',
    author_avatar: row.author_avatar || '',
    reactions,
    mineReaction: statements.getMineReaction.get(type, row.id, userId)?.emoji || '',
    commentCount: statements.countComments.get(type, row.id).n,
    experienceCount: statements.countComments.get(type, row.id).n,
    linkCount: statements.countLinks.get(type, row.id, type, row.id).n,
    pinVotes,
    myPinVote: Boolean(statements.getPinVote.get(type, row.id, userId)),
    pinned: isPinned(row),
    canEdit: row.author_id === userId,
  }
}

function reactionState(type, id, userId) {
  const counts = {}
  for (const item of statements.reactionCounts.all(type, id)) counts[item.emoji] = item.cnt
  const mine = statements.getMineReaction.get(type, id, userId)?.emoji
  return { counts, mine: mine ? [mine] : [] }
}

function emojiCode(value) {
  return Array.from(value || '').map((char) => char.codePointAt(0).toString(16)).join('-')
}

function commentDto(row) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    displayName: row.display_name || '匿名',
    avatarUrl: row.avatar_url || '',
  }
}

function createLink(sourceType, sourceId, targetType, targetId, userId, note) {
  statements.addLink.run(
    crypto.randomUUID(),
    assertType(sourceType),
    clean(sourceId, 80),
    assertType(targetType),
    clean(targetId, 80),
    userId,
    clean(note, 300),
    isoNow(),
  )
}

function ensureItem(type, id) {
  if (!tables[type].get.get(id)) throw httpError(404, '内容不存在')
}

function filterItems(type, rows, filter) {
  if (filter === 'all') return rows
  const max = activeDays(type) * 86400000
  return rows.filter((item) => {
    const date = item.published_at || item.submitted_at
    const isActive = date ? Date.now() - new Date(date).getTime() < max : false
    return filter === 'active' ? isActive : !isActive
  })
}

function assertType(type) {
  if (!types.includes(type)) throw httpError(400, 'type')
  return type
}

function activeDays(type) {
  if (type === 'news') return 2
  if (type === 'discussions') return 30
  return 365
}

function pinDays(type) {
  if (type === 'news') return 3
  if (type === 'discussions') return 14
  return 30
}

function isPinned(row) {
  return Boolean(row?.pinned_until && new Date(row.pinned_until).getTime() > Date.now())
}

function requireNamedUser(user) {
  if (!user || !user.display_name || user.display_name.startsWith('访客-')) {
    throw httpError(403, '请先设置昵称')
  }
}

function requireCanEdit(req, user, item) {
  if (item.author_id === user.id) return
  requireAdmin(req)
}

function requireAdmin(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!adminToken || token !== adminToken) throw httpError(401, '需要管理员权限')
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now()
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs }
  if (now > bucket.resetAt) {
    bucket.count = 0
    bucket.resetAt = now + windowMs
  }
  bucket.count += 1
  rateBuckets.set(key, bucket)
  if (bucket.count > limit) throw httpError(429, '操作太频繁，请稍后再试')
}

function getSessionId(req) {
  const match = (req.headers.cookie || '').match(/sid=([^;]+)/)
  return match ? match[1] : crypto.randomUUID()
}

function hasSession(req) {
  return (req.headers.cookie || '').includes('sid=')
}

function parseUrl(rawUrl) {
  const url = new URL(rawUrl, 'http://localhost')
  return { path: url.pathname, query: Object.fromEntries(url.searchParams) }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 65536) reject(httpError(413, '请求内容过大'))
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(httpError(400, 'JSON 格式错误'))
      }
    })
    req.on('error', reject)
  })
}

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function httpError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function clean(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags.map((tag) => clean(tag, 40)).filter(Boolean).join(',')
  return clean(tags, 200)
}

function isoNow() {
  return new Date().toISOString()
}

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name)
  if (!cols.includes(column)) db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run()
}
