<template>
  <div class="exp-panel">
    <div class="exp-header">
      <span>经验分享 & 相关讨论</span>
      <small v-if="experiences.length">{{ experiences.length }} 条</small>
    </div>

    <!-- Identity form -->
    <div v-if="identity.needsName" class="exp-identity">
      <p class="exp-identity-info">设置显示名称后可发布内容</p>
      <input v-model.trim="displayName" maxlength="40" placeholder="昵称 *" />
      <input v-model.trim="avatarUrl" maxlength="300" placeholder="头像 URL（可选）" />
      <button :disabled="busy" @click="saveIdentity">保存身份</button>
    </div>

    <form v-else class="exp-form" @submit.prevent="submit">
      <textarea v-model.trim="body" maxlength="2000" rows="3" placeholder="分享你的经验、感想或相关作品链接..."></textarea>
      <button type="submit" :disabled="busy || !body">发布</button>
    </form>

    <p v-if="notice" class="exp-notice">{{ notice }}</p>

    <!-- Links panel -->
    <div class="exp-links-toggle">
      <button :class="['exp-links-btn', { active: linksOpen }]" @click="linksOpen = !linksOpen">
        🔗 关联内容（{{ links.length }}）
      </button>
    </div>
    <div v-if="linksOpen" class="exp-links-panel">
      <div class="lp-header">关联相关内容（灵感、讨论、工具等）</div>
      <div class="lp-form">
        <select v-model="linkType">
          <option value="news">新闻</option>
          <option value="discussions">讨论</option>
          <option value="tools">小工具</option>
        </select>
        <input v-model.trim="linkId" maxlength="60" placeholder="内容 ID" />
        <button :disabled="linkBusy || !linkId" @click="addLink">关联</button>
      </div>
      <div v-if="links.length === 0" class="lp-empty">暂无关联内容</div>
      <div v-for="lk in links" :key="lk.id" class="lp-item">
        <span class="lp-type">{{ lk.target_type || lk.source_type }}</span>
        <span class="lp-id">{{ lk.target_id || lk.source_id }}</span>
        <span class="lp-time">{{ formatTime(lk.created_at) }}</span>
      </div>
    </div>

    <div v-if="experiences.length === 0 && !loading" class="exp-empty">暂无经验分享</div>
    <article v-for="exp in experiences" :key="exp.id" class="exp-item">
      <img v-if="exp.avatarUrl" :src="exp.avatarUrl" alt="" />
      <div class="exp-content">
        <header>
          <strong>{{ exp.displayName }}</strong>
          <time>{{ formatTime(exp.createdAt) }}</time>
        </header>
        <p>{{ exp.body }}</p>
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

const experiences = ref([])
const links = ref([])
const loading = ref(false)
const busy = ref(false)
const linkBusy = ref(false)
const notice = ref('')
const displayName = ref('')
const avatarUrl = ref('')
const body = ref('')
const linkType = ref('news')
const linkId = ref('')
const linksOpen = ref(false)
const identity = ref({ needsName: true })

const itemPath = () => `/api/items/${encodeURIComponent(props.itemType)}/${encodeURIComponent(String(props.itemId))}`

onMounted(loadAll)
watch(() => [props.itemType, props.itemId], loadAll)

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadIdentity(), loadExperiences(), loadLinks()])
  } catch {} finally { loading.value = false }
}

async function loadIdentity() {
  try {
    const res = await fetch('/api/identity/status', { credentials: 'same-origin' })
    if (res.ok) {
      const id_ = await res.json()
      identity.value = { needsName: id_.needsName !== false, displayName: id_.displayName, avatarUrl: id_.avatarUrl }
      // Only pre-fill form if user has a real name (not guest)
      if (id_.displayName && !id_.displayName.startsWith('访客-')) {
        displayName.value = id_.displayName
        avatarUrl.value = id_.avatarUrl || ''
      }
    }
  } catch {}
}

async function loadExperiences() {
  try {
    const res = await fetch(`${itemPath()}/experiences`, { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      experiences.value = data.experiences || []
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
  busy.value = true; notice.value = ''
  try {
    const res = await fetch('/api/identity/manual', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: displayName.value, avatarUrl: avatarUrl.value }),
    })
    if (res.ok) { await loadIdentity(); notice.value = '身份已保存' }
    else { const d = await res.json(); notice.value = d.error || '保存失败' }
  } catch { notice.value = '网络错误' } finally { busy.value = false }
}

async function submit() {
  busy.value = true; notice.value = ''
  try {
    const headers = { 'Content-Type': 'application/json' }
    const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1]
    if (csrf) headers['X-CSRF-Token'] = csrf
    const res = await fetch(`${itemPath()}/experiences`, {
      method: 'POST', credentials: 'same-origin', headers,
      body: JSON.stringify({ body: body.value }),
    })
    if (res.ok) { body.value = ''; notice.value = '已发布'; await loadExperiences() }
    else { const d = await res.json(); notice.value = d.error || '发布失败' }
  } catch { notice.value = '网络错误' } finally { busy.value = false }
}

async function addLink() {
  linkBusy.value = true
  try {
    const res = await fetch(`${itemPath()}/links`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetType: linkType.value, targetId: linkId.value }),
    })
    if (res.ok) { linkId.value = ''; await loadLinks() }
  } catch {} finally { linkBusy.value = false }
}

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}
</script>
