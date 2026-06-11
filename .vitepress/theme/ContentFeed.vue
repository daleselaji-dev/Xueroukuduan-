<template>
  <div class="feed">
    <div class="feed-compose">
      <button v-if="!composeOpen" class="feed-compose-btn" type="button" @click="composeOpen = true">
        ✎ 发布{{ typeLabel }}
      </button>
      <PostComposer v-if="composeOpen" :key="'composer-' + type" :initial-type="type" @created="onCreated" />
    </div>

    <div class="feed-filters">
      <button
        v-for="f in filters"
        :key="f.value"
        :class="['feed-filter', { active: activeFilter === f.value }]"
        type="button"
        @click="setFilter(f.value)"
      >
        {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="items.length === 0 && !composeOpen" class="empty">暂无内容，点击上方按钮发布第一条。</div>

    <div v-else class="feed-list">
      <article v-for="item in items" :key="item.id" :class="['feed-card', { pinned: item.pinned }]">
        <div class="feed-card-top">
          <span v-if="item.pinned" class="lifecycle-badge pinned-badge">置顶</span>
          <span v-else :class="['lifecycle-badge', isFresh(item.published_at || item.submitted_at) ? 'fresh' : 'archived']">
            {{ isFresh(item.published_at || item.submitted_at) ? activeLabel : '归档' }}
          </span>
          <span v-if="item.author_name" class="feed-author">{{ item.author_name }}</span>
          <time class="feed-date">{{ formatDate(item.published_at || item.submitted_at) }}</time>
          <span v-if="item.pinVotes" class="feed-date">{{ item.pinVotes }} 票置顶</span>
        </div>

        <div class="feed-card-body">
          <template v-if="editingId === item.id">
            <div class="edit-panel">
              <label>标题</label>
              <input v-model.trim="editDraft.title" maxlength="120" />

              <label v-if="type === 'tools'">链接</label>
              <input v-if="type === 'tools'" v-model.trim="editDraft.url" maxlength="500" />

              <label v-if="type === 'news'">来源</label>
              <input v-if="type === 'news'" v-model.trim="editDraft.source" maxlength="120" />

              <label v-if="type === 'news'">来源链接</label>
              <input v-if="type === 'news'" v-model.trim="editDraft.source_url" maxlength="500" />

              <label>内容</label>
              <textarea v-model.trim="editDraft.body" maxlength="8000" rows="5"></textarea>

              <div class="feed-actions">
                <button class="mini-action primary" type="button" :disabled="editBusy || !editDraft.title" @click="saveEdit(item)">保存</button>
                <button class="mini-action" type="button" @click="cancelEdit">取消</button>
              </div>
              <p v-if="editNotice" class="composer-notice">{{ editNotice }}</p>
            </div>
          </template>

          <template v-else>
            <h3>
              <a v-if="item.url || item.source_url" :href="item.url || item.source_url" target="_blank" rel="noopener noreferrer">
                {{ item.title }}
              </a>
              <span v-else>{{ item.title }}</span>
            </h3>
            <p v-if="itemText(item)">{{ itemText(item) }}</p>
            <div class="feed-actions">
              <button class="mini-action" :class="{ active: item.myPinVote }" type="button" @click="votePin(item)">
                📌 {{ item.myPinVote ? '已提议' : '提议置顶' }}
              </button>
              <button v-if="item.canEdit" class="mini-action" type="button" @click="startEdit(item)">编辑</button>
              <span v-if="item.commentCount" class="feed-count">{{ item.commentCount }} 评论</span>
              <span v-if="item.linkCount" class="feed-count">{{ item.linkCount }} 启发</span>
            </div>
          </template>

          <ContentReactions :item-type="type" :item-id="item.id" />
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import ContentReactions from './ContentReactions.vue'
import PostComposer from './PostComposer.vue'

const props = defineProps({ type: { type: String, required: true } })

const types = {
  news: { label: '新闻', active: 2 },
  tools: { label: '小工具', active: 365 },
  discussions: { label: '讨论', active: 30 },
  submissions: { label: '投稿', active: 365 },
}
const typeInfo = computed(() => types[props.type] || types.news)
const typeLabel = computed(() => typeInfo.value.label)
const activeLabel = computed(() => (props.type === 'news' ? '新鲜' : props.type === 'discussions' ? '活跃' : '最新'))

const filters = [
  { value: 'active', label: '活跃' },
  { value: 'archived', label: '归档' },
  { value: 'all', label: '全部' },
]

const loading = ref(true)
const items = ref([])
const activeFilter = ref('active')
const composeOpen = ref(false)
const editingId = ref('')
const editBusy = ref(false)
const editNotice = ref('')
const editDraft = ref({ title: '', body: '', url: '', source: '', source_url: '', category: 'general', tags: '' })

onMounted(loadItems)

function isFresh(dateStr) {
  if (!dateStr) return false
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff < typeInfo.value.active * 86400000
}

function setFilter(value) {
  activeFilter.value = value
  loadItems()
}

async function loadItems() {
  loading.value = true
  try {
    const res = await fetch(`/api/items?type=${props.type}&filter=${activeFilter.value}&limit=50`, { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      items.value = data.items || []
    }
  } catch {} finally {
    loading.value = false
  }
}

function onCreated() {
  composeOpen.value = false
  activeFilter.value = 'active'
  loadItems()
}

function itemText(item) {
  return item.summary || item.description || item.body || ''
}

function startEdit(item) {
  editingId.value = item.id
  editNotice.value = ''
  editDraft.value = {
    title: item.title || '',
    body: item.body || item.summary || item.description || '',
    url: item.url || '',
    source: item.source || '',
    source_url: item.source_url || '',
    category: item.category || 'general',
    tags: item.tags || '',
  }
}

function cancelEdit() {
  editingId.value = ''
  editNotice.value = ''
}

async function saveEdit(item) {
  editBusy.value = true
  editNotice.value = ''
  try {
    const payload = {
      title: editDraft.value.title,
      body: editDraft.value.body,
      category: editDraft.value.category,
      tags: editDraft.value.tags,
    }
    if (props.type === 'news') {
      payload.summary = editDraft.value.body.slice(0, 300)
      payload.source = editDraft.value.source
      payload.source_url = editDraft.value.source_url
    }
    if (props.type === 'tools') {
      payload.description = editDraft.value.body
      payload.url = editDraft.value.url
    }
    const res = await fetch(`/api/items/${props.type}/${encodeURIComponent(item.id)}`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: withCsrf(),
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      editingId.value = ''
      await loadItems()
    } else {
      const data = await res.json()
      editNotice.value = data.error || '保存失败'
    }
  } catch {
    editNotice.value = '网络错误'
  } finally {
    editBusy.value = false
  }
}

async function votePin(item) {
  try {
    const res = await fetch(`/api/items/${props.type}/${encodeURIComponent(item.id)}/pin-vote`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: withCsrf(),
      body: JSON.stringify({}),
    })
    if (res.ok) await loadItems()
  } catch {}
}

function withCsrf() {
  const headers = { 'Content-Type': 'application/json' }
  const csrf = document.cookie.match(/csrf_token=([^;]+)/)?.[1]
  if (csrf) headers['X-CSRF-Token'] = csrf
  return headers
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short' })
}
</script>
