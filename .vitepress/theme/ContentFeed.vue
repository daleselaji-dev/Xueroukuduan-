<template>
  <div class="feed">
    <!-- 发布入口 -->
    <div class="feed-compose">
      <button v-if="!composeOpen" class="feed-compose-btn" @click="composeOpen = true">
        ✏️ 发布{{ typeLabel }}
      </button>
      <PostComposer v-if="composeOpen" :key="'c-'+type" @created="onCreated" />
    </div>

    <!-- 过滤器 -->
    <div class="feed-filters">
      <button v-for="f in filters" :key="f.value"
        :class="['feed-filter', { active: activeFilter === f.value }]"
        @click="activeFilter = f.value; loadItems()">
        {{ f.label }}
      </button>
    </div>

    <!-- 状态 -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="items.length === 0 && !composeOpen" class="empty">暂无内容，点击上方按钮发布第一条</div>

    <!-- 列表 -->
    <div v-else class="feed-list">
      <div v-for="item in items" :key="item.id" class="feed-card">
        <div class="feed-card-top">
          <span :class="['lifecycle-badge', isFresh(item.published_at || item.submitted_at) ? 'fresh' : 'archived']">
            {{ isFresh(item.published_at || item.submitted_at) ? activeLabel : '归档' }}
          </span>
          <span v-if="item.author_name" class="feed-author">{{ item.author_name }}</span>
          <time class="feed-date">{{ formatDate(item.published_at || item.submitted_at) }}</time>
        </div>
        <div class="feed-card-body">
          <h3>{{ item.title }}</h3>
          <p v-if="item.summary || item.description">{{ item.summary || item.description }}</p>
        </div>
        <ContentReactions :item-type="type" :item-id="item.id" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import PostComposer from './PostComposer.vue'

const props = defineProps({ type: { type: String, required: true } })

const types = {
  news: { label: '新闻', active: 2, archive: 2 },
  tools: { label: '工具', active: 365, archive: 365 },
  discussions: { label: '讨论', active: 30, archive: 30 },
  submissions: { label: '投稿', active: 365, archive: 365 },
}
const typeInfo = computed(() => types[props.type] || types.news)
const typeLabel = computed(() => typeInfo.value.label)
const activeLabel = computed(() => props.type === 'news' ? '新鲜' : props.type === 'discussions' ? '活跃' : '最新')

const filters = [
  { value: 'active', label: '活跃' },
  { value: 'archived', label: '归档' },
  { value: 'all', label: '全部' },
]

const loading = ref(true)
const items = ref([])
const activeFilter = ref('active')
const composeOpen = ref(false)

function isFresh(dateStr) {
  if (!dateStr) return false
  const diff = Date.now() - new Date(dateStr).getTime()
  return diff < typeInfo.value.active * 86400000
}

async function loadItems() {
  loading.value = true
  try {
    const res = await fetch(`/api/items?type=${props.type}&filter=${activeFilter.value}&limit=50`, { credentials: 'same-origin' })
    if (res.ok) {
      const data = await res.json()
      items.value = data.items || []
    }
  } catch {} finally { loading.value = false }
}

function onCreated(data) {
  composeOpen.value = false
  activeFilter.value = 'active'
  loadItems()
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { dateStyle: 'short' })
}

onMounted(loadItems)
</script>
