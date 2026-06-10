<template>
<div>
  <div v-if="loading" class="loading">加载中...</div>
  <div v-else-if="items.length === 0" class="empty">暂无投稿</div>
  <div v-else class="list">
    <div v-for="item in items" :key="item.folder" class="card" @click="open(item)">
      <div class="card-body">
        <div class="card-tags">
          <span v-for="tag in (item.tags || [])" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <h3>{{ item.title || '' }}</h3>
        <p>{{ item.summary || '' }}</p>
        <div class="card-meta">
          <span>{{ item.author || '' }}</span>
          <span>{{ item.date || '' }}</span>
          <span v-if="item.license" class="card-license">{{ item.license }}</span>
        </div>
      </div>
      <CommunityWidget item-type="submissions" :item-id="item.folder" />
    </div>
  </div>

  <!-- 详情弹窗 -->
  <div v-if="selected" class="overlay" @click.self="close">
    <div class="panel">
      <nav class="sidebar">
        <div class="sidebar-title">目录</div>
        <a v-for="(h, i) in safeHeadings" :key="i"
           :class="['sidelink', 'lv' + h.level, { on: activeH === h.text }]"
           @click="jumpTo(h.text)">{{ h.text }}</a>
        <div class="sidebar-actions">
          <button @click="goTop">↑ 回顶部</button>
          <button @click="goBottom">↓ 回底部</button>
          <button @click="close">✕ 关闭</button>
        </div>
      </nav>
      <div class="md-content" ref="contentEl" @scroll="onScroll">
        <header class="md-header">
          <h2>{{ selected.title || '' }}</h2>
          <div class="md-meta">
            <span>{{ selected.author || '' }}</span>
            <span>{{ selected.date || '' }}</span>
            <span v-if="selected.license" class="tag license-tag">{{ selected.license }}</span>
            <span v-for="tag in safeTags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </header>
        <article class="md-body" v-html="renderedBody"></article>
        <footer class="md-footer">
          <a v-if="selected.folder" :href="'https://github.com/BoHuYeShan/blob/main/submissions/' + selected.folder + '/index.md'" target="_blank" rel="noopener noreferrer">
            在 GitHub 查看原始文件 →
          </a>
        </footer>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { onMounted, ref, computed, nextTick } from 'vue'
import { renderMarkdown, extractHeadings } from './markdown.js'

const items = ref([])
const loading = ref(true)
const selected = ref(null)
const headings = ref([])
const activeH = ref('')
const contentEl = ref(null)

onMounted(async () => {
  try {
    const res = await fetch('/data/discussions.json')
    const data = await res.json()
    items.value = data.submissions || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const safeTags = computed(() => {
  const s = selected.value
  return (s && Array.isArray(s.tags)) ? s.tags : []
})

const safeHeadings = computed(() => {
  return (headings.value || []).filter(h => h && h.text).map(h => ({ level: h.level || 1, text: h.text }))
})

const renderedBody = computed(() => {
  const s = selected.value
  return s ? renderMarkdown(s.body || '') : ''
})

function open(item) {
  selected.value = item
  activeH.value = ''
  nextTick(() => {
    const h = extractHeadings(item.body || '')
    headings.value = Array.isArray(h) ? h.filter(x => x && x.text) : []
  })
}

function close() {
  selected.value = null
  headings.value = []
}

function jumpTo(text) {
  activeH.value = text
  nextTick(() => {
    const el = contentEl.value
    if (!el) return
    for (const h of el.querySelectorAll('h1,h2,h3')) {
      if (h.textContent.trim() === text.trim()) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        break
      }
    }
  })
}

function onScroll(e) {
  const el = e.target
  let cur = ''
  for (const h of el.querySelectorAll('h1,h2,h3')) {
    if (h.getBoundingClientRect().top <= 140) cur = h.textContent.trim()
  }
  if (cur) activeH.value = cur
}

function goTop() {
  contentEl.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function goBottom() {
  const el = contentEl.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}
</script>
