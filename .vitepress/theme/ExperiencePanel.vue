<template>
  <div class="exp-panel">
    <div class="exp-header">
      <span>💡 经验分享 & 相关讨论</span>
      <small v-if="experiences.length">{{ experiences.length }} 条</small>
    </div>

    <div v-if="identity.needsName" class="exp-identity">
      <input v-model.trim="displayName" maxlength="40" placeholder="昵称" />
      <input v-model.trim="avatarUrl" maxlength="300" placeholder="头像 URL（可选）" />
      <button :disabled="busy" @click="saveIdentity">保存身份</button>
    </div>

    <form v-else class="exp-form" @submit.prevent="submit">
      <textarea v-model.trim="body" maxlength="2000" rows="3" placeholder="分享你的经验、感想或相关作品链接..."></textarea>
      <button type="submit" :disabled="busy || !body">发布</button>
    </form>

    <p v-if="notice" class="exp-notice">{{ notice }}</p>

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
const loading = ref(false)
const busy = ref(false)
const notice = ref('')
const displayName = ref('')
const avatarUrl = ref('')
const body = ref('')
const identity = ref({ needsName: true })

const itemPath = () => `/api/items/${encodeURIComponent(props.itemType)}/${encodeURIComponent(String(props.itemId))}`

onMounted(loadAll)
watch(() => [props.itemType, props.itemId], loadAll)

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadIdentity(), loadExperiences()])
  } catch {} finally { loading.value = false }
}

async function loadIdentity() {
  try {
    const res = await fetch('/api/identity/status', { credentials: 'same-origin' })
    if (res.ok) {
      identity.value = await res.json()
      if (identity.value.displayName) displayName.value = identity.value.displayName
      if (identity.value.avatarUrl) avatarUrl.value = identity.value.avatarUrl
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

function formatTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })
}
</script>
