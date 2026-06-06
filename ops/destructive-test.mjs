const base = process.env.BASE_URL || 'http://127.0.0.1:8082'
const failures = []
const cookies = new Map()

function keep(res) {
  const getSetCookie = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean)
  for (const header of getSetCookie) {
    const first = header.split(';')[0]
    const index = first.indexOf('=')
    if (index > 0) cookies.set(first.slice(0, index), first.slice(index + 1))
  }
}

function cookieHeader() {
  return Array.from(cookies.entries()).map(([key, value]) => `${key}=${value}`).join('; ')
}

function csrf() {
  return decodeURIComponent(cookies.get('csrf_token') || '')
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  const cookie = cookieHeader()
  if (cookie) headers.cookie = cookie
  if (options.body) {
    headers['content-type'] = 'application/json'
    if (!headers['x-csrf-token']) headers['x-csrf-token'] = csrf()
  }
  const res = await fetch(base + path, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  keep(res)
  const text = await res.text()
  let data = {}
  try { data = text ? JSON.parse(text) : {} } catch {}
  return { status: res.status, text, data, headers: res.headers }
}

function assert(name, condition, detail = '') {
  if (!condition) failures.push(`${name}: ${detail}`)
  else console.log(`PASS ${name}`)
}

await request('/api/identity/status')

const badType = await request('/api/items/http:%2F%2Fevil/x/comments')
assert('reject invalid content type', badType.status === 400, badType.text)

const badId = await request('/api/items/news/..%2Fsecret/comments')
assert('reject path traversal id', badId.status === 400, badId.text)

const noCsrf = await request('/api/items/news/test/comments', {
  method: 'POST',
  headers: { 'x-csrf-token': 'bad' },
  body: { body: 'hello' },
})
assert('reject bad csrf', noCsrf.status === 403, noCsrf.text)

const badEmoji = await request('/api/items/news/test/reactions', {
  method: 'POST',
  body: { emoji: '💣' },
})
assert('reject unsupported emoji', badEmoji.status === 400, badEmoji.text)

const badAvatar = await request('/api/identity/manual', {
  method: 'POST',
  body: { displayName: 'tester', avatarUrl: 'http://example.com/a.png' },
})
assert('reject non-https avatar', badAvatar.status === 400, badAvatar.text)

const goodIdentity = await request('/api/identity/manual', {
  method: 'POST',
  body: { displayName: 'gray-test', avatarUrl: 'https://example.com/a.png' },
})
assert('accept manual identity', goodIdentity.status === 200, goodIdentity.text)

const goodReaction = await request('/api/items/news/gray/reactions', {
  method: 'POST',
  body: { emoji: '\u{1F44D}' },
})
assert('accept whitelisted emoji', goodReaction.status === 200 && goodReaction.data.counts?.['👍'] >= 1, goodReaction.text)

const page = await fetch(base + '/')
assert('csp present', Boolean(page.headers.get('content-security-policy')), 'missing csp')
assert('no server env leak in homepage', !/ADMIN_TOKEN|WECHAT_APP_SECRET|GROQ_API_KEY/i.test(await page.text()), 'secret-like string found')

if (failures.length) {
  console.error('\nFAILURES')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('\nDestructive tests passed.')
