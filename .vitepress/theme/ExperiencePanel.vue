<template>
  <div class="exp-panel">
    <div class="exp-header">
      <span>评论 & 启发</span>
      <small v-if="comments.length">{{ comments.length }} 条评论</small>
    </div>

    <div v-if="identity.needsName" class="exp-identity">
      <p class="exp-identity-info">设置昵称后就可以评论、发布启发和参与置顶投票。</p>
      <input v-model.trim="displayName" maxlength="40" placeholder="昵称 *" />
      <input v-model.trim="avatarUrl" maxlength="300" placeholder="头像 URL（可选）" />
      <button :disabled="busy || !displayName" type="button" @click="saveIdentity">保存身份</button>
    </div>

    <form v-else class="exp-form" @submit.prevent="submitComment">
      <textarea v-model.trim="body" maxlength="2000" rows="3" placeholder="写一条评论、补充资料或延伸想法..."></textarea>
      <button type="submit" :disabled="busy || !body">发布评论</button>
    </form>

    <p v-if="notice" class="exp-notice">{{ notice }}</p>

    <div class="inspire-panel">
      <div class="lp-header">从这条内容获得启发</div>
      <div class="inspire-form">
        <select v-model="inspiredType">
          <option value="discussions">发布讨论</option>
          <option value="tools">发布小工具</option>
          <option value="news">发布新闻</option>
        </select>
        <input v-model.trim="inspiredTitle" maxlength="120" placeholder="新内容标题" />
        <input v-if="inspiredType === 'tools'" v-model.trim="inspiredUrl" maxlength="500" placeholder="工具链接 https://..." />
        <input v-if="inspiredType === 'news'" v-model.trim="inspiredSource" maxlength="120" placeholder="新闻来源" />
        <textarea v-model.trim="inspiredBody" maxlength="8000" rows="3" placeholder="它如何启发了你？继续写成一条新内容。"></textarea>
        <button
          type="button"
          :disabled="inspireBusy || !inspiredTitle"
          @click="createInspiredItem"
        >
          发布并关联
        </button>
      </div>
    </div>

    <div class="exp-links-toggle">
      <button :class="['exp-links-btn', { active: linksOpen }]" type="button" @click="linksOpen = !linksOpen">
        🔗 已关联内容（{{ links.length }}）
      </button>
    </div>
    <div v-if="linksOpen" class="exp-links-panel">
      <div class="lp-header">关联已有内容</div>
      <div class="lp-form">
        <select v-model="linkType">
          <option value="news">新闻</option>
          <option value="discussions">讨论</option>
          <option value="tools">小工具</option>
        </select>
        <input v-model.trim="linkId" maxlength="60" placeholder="内容 ID" />
        <button :disabled="linkBusy || !linkId" type="button" @click="addLink">关联</button>
      </div>
      <div v-if="links.length === 0" class="lp-empty">暂无关联内容</div>
      <div v-for="lk in links" :key="lk.id" class="lp-item">
        <span class="lp-type">{{ linkLabel(lk) }}</span>
        <span class="lp-id">#{{ lk.target_id || lk.source_id }}</span>
        <span class="lp-time">{{ formatTime(lk.created_at) }}</span>
      </div>
    </div>

    <div v-if="comments.length === 0 && !loading" class="exp-empty">暂无评论</div>
    <article v-for="comment in comments" :key="comment.id" class="exp-item">
      <img v-if="comment.avatarUrl" :src="comment.avatarUrl" alt="" />
      <div v-else class="comment-avatar">{{ initials(comment.displayName) }}</div>
      <div class="exp-content">
        <header>
          <strong>{{ comment.displayName || '群友' }}</strong>
          <time>{{ formatTime(comment.createdAt) }}</time>
        </header>
        <p>{{ comment.body }}</p>
      </div>
    </article>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  itemType: { type: String, required: true },
  itemId: { type: [String, Number], required: true },
})

const comments = ref([])
const links = ref([])
const loading = ref(false)
const busy = ref(false)
const linkBusy = ref(false)
const inspireBusy = ref(false)
const notice = ref('')
const displayName = ref('')
const avatarUrl = ref('')
const body = ref('')
const linkType = ref('news')
const linkId = ref('')
const linksOpen = ref(false)
const identity = ref({ needsName: true })
const inspiredType = ref('discussions')
const inspiredTitle = ref('')
const inspiredBody = ref('')
const inspiredUrl = ref('')
const inspiredSource = ref('')

const itemPath = () => `/api/items/${encodeURIComponent(props.itemType)}/${encodeURIComponent(String(props.itemId))}`

onMounted(loadAll)
watch(() => [props.itemType, props.itemId], loadAll)

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadIdentity(), loadComments(), loadLinks()])
  } catch {} finally {
    loading.value = false
  }
}

async function loadIdentity() {
  try {
    const res = await fetch('/api/identity/status', { credentials: 'same-origin' })
    if (!res.ok) return
    const data = await res.json()
    identity.value = {
      needsName: data.needsName !== false,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
    }
    if (data.displayName && !data.displayName.startsWith('访客-')) {
      displayName.value = data.displayName
      avatarUrl.value = data.avatarUrl || ''
    }
  } catch {}
}

async function loadComments() {
  try {
    const res = await fetch(`${itemPath()}/comments`, { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      comments.value = data.comments || []
    }
  } catch {}
}

async function loadLinks() {
  try {
    const res = await fetch(`${itemPath()}/links`, { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      links.value = data.links || []
    }
  } catch {}
}

async function saveIdentity() {
  busy.value = true
  notice.value = ''
  try {
    const res = await fetch('/api/identity/manual', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.value, avatarUrl: avatarUrl.value }),
    })
    if (res.ok) {
      await loadIdentity()
      notice.value = '身份已保存'
    } else {
      const data = await res.json()
      notice.value = data.error || '保存失败'
    }
  } catch {
    notice.value = '网络错误'
  } finally {
    busy.value = false
  }
}

async function submitComment() {
  busy.value = true
  notice.value = ''
  try {
    const res = await fetch(`${itemPath()}/comments`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: withCsrf(),
      body: JSON.stringify({ body: body.value }),
    })
    if (res.ok) {
      body.value = ''
      notice.value = '评论已发布'
      await loadComments()
    } else {
      const data = await res.json()
      notice.value = data.error || '发布失败'
    }
  } catch {
    notice.value = '网络错误'
  } finally {
    busy.value = false
  }
}

async function createInspiredItem() {
  inspireBusy.value = true
  notice.value = ''
  try {
    const payload = {
      type: inspiredType.value,
      title: inspiredTitle.value,
      category: 'inspired',
      inspiredBy: { type: props.itemType, itemId: props.itemId, note: '启发' },
    }
    if (inspiredType.value === 'tools') {
      payload.description = inspiredBody.value
      payload.url = inspiredUrl.value
    } else {
      payload.body = inspiredBody.value
    }
    if (inspiredType.value === 'news') {
      payload.source = inspiredSource.value
    }
    const res = await fetch('/api/items', {
      method: 'POST',
      credentials: 'same-origin',
      headers: withCsrf(),
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      inspiredTitle.value = ''
      inspiredBody.value = ''
      inspiredUrl.value = ''
      inspiredSource.value = ''
      notice.value = '启发内容已发布'
      linksOpen.value = true
      await loadLinks()
    } else {
      const data = await res.json()
      notice.value = data.error || '发布失败'
    }
  } catch {
    notice.value = '网络错误'
  } finally {
    inspireBusy.value = false
  }
}

async function addLink() {
  linkBusy.value = true
  try {
    const res = await fetch(`${itemPath()}/links`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: withCsrf(),
      body: JSON.stringify({ targetType: linkType.value, targetId: linkId.value, relation: 'related' }),
    })
    if (res.ok) {
      linkId.value = ''
      await loadLinks()
    }
  } catch {} finally {
    linkBusy.value = false
  }
}

function withCsrf() {
  const headers = { 'Content-Type': 'application/json' }
  const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1]
  if (csrf) headers['X-CSRF-Token'] = csrf
  return headers
}

function linkLabel(link) {
  const type = link.target_type || link.source_type
  return ({ news: '新闻', tools: '小工具', discussions: '讨论', submissions: '投稿' })[type] || type
}

function initials(name) {
  return (name || '群').slice(0, 1).toUpperCase()
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}
</script>
