<template>
<div class="forum-list">
  <!-- 分类筛选 -->
  <div class="forum-filters" v-if="merged.length > 0">
    <button :class="['filter-btn', { active: filter === 'all' }]" @click="filter = 'all'">
      全部 ({{ merged.length }})
    </button>
    <button :class="['filter-btn', { active: filter === 'github' }]" @click="filter = 'github'">
      🐙 GitHub ({{ githubCount }})
    </button>
    <button v-if="remark42Count > 0" :class="['filter-btn', { active: filter === 'remark42' }]" @click="filter = 'remark42'">
      📧 邮箱论坛 ({{ remark42Count }})
    </button>
  </div>

  <!-- 加载状态 -->
  <div v-if="loading" class="loading">加载中...</div>
  <div v-else-if="filtered.length === 0" class="empty">暂无讨论</div>

  <!-- 帖子列表 -->
  <div v-else class="forum-cards">
    <a v-for="item in filtered" :key="item.id"
       :href="item.url" target="_blank" class="forum-card" :class="item.source">
      <div class="forum-card-header">
        <span :class="['source-badge', item.source]">
          {{ item.source === 'github' ? '🐙 GitHub' : '📧 邮箱论坛' }}
        </span>
        <span v-if="item.category" class="cat-badge">{{ item.categoryEmoji }} {{ item.category }}</span>
      </div>
      <h3>{{ item.title }}</h3>
      <p class="forum-card-body">{{ item.summary }}</p>
      <div class="forum-card-footer">
        <span class="forum-author">{{ item.author }}</span>
        <span class="forum-date">{{ item.dateFormatted }}</span>
        <span v-if="item.comments" class="forum-comments">💬 {{ item.comments }}</span>
      </div>
    </a>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const githubItems = ref([])
const remark42Items = ref([])
const remark42Enabled = ref(false)
const filter = ref('all')

const merged = computed(() => {
  const all = [...githubItems.value, ...remark42Items.value]
  all.sort((a, b) => new Date(b.date) - new Date(a.date))
  return all
})

const filtered = computed(() => {
  if (filter.value === 'all') return merged.value
  return merged.value.filter(i => i.source === filter.value)
})

const githubCount = computed(() => githubItems.value.length)
const remark42Count = computed(() => remark42Items.value.length)

onMounted(async () => {
  try {
    // 加载 config
    try {
      const configRes = await fetch('/flesh-is-weak-seminar/data/config.json')
      const config = await configRes.json()
      remark42Enabled.value = config.remark42?.enabled || false
    } catch {
      remark42Enabled.value = false
    }

    // 加载 GitHub Discussions
    try {
      const discRes = await fetch('/flesh-is-weak-seminar/data/discussions.json')
      const discData = await discRes.json()
      githubItems.value = (discData.discussions || []).map(d => ({
        ...d,
        source: 'github',
        summary: (d.body || '').replace(/[#*`\[\]]/g, '').substring(0, 150) + '...'
      }))
    } catch {
      githubItems.value = []
    }

    // 加载 Remark42（仅在启用时）
    if (remark42Enabled.value) {
      try {
        const r42Res = await fetch('/flesh-is-weak-seminar/data/forum/remark42.json')
        const r42Data = await r42Res.json()
        remark42Items.value = (r42Data.comments || []).map(c => ({
          id: 'r42-' + c.id,
          title: c.title || (c.text || '').substring(0, 50),
          summary: (c.text || '').replace(/<[^>]*>/g, '').substring(0, 150),
          author: c.user?.name || '匿名',
          date: c.time,
          dateFormatted: new Date(c.time).toLocaleDateString('zh-CN'),
          url: c.url || '#',
          source: 'remark42',
          comments: 0
        }))
      } catch {
        remark42Items.value = []
      }
    }
  } finally {
    loading.value = false
  }
})
</script>
