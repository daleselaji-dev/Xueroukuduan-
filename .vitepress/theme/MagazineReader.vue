<template>
<div class="reader" v-if="issue">
  <div class="reader-toolbar">
    <button class="toolbar-btn" @click="$emit('back')">返回书架</button>
    <span class="toolbar-title">{{ issue.label }}</span>
    <div class="toolbar-modes">
      <button :class="['mode-btn', { active: mode === 'standard' }]" @click="mode = 'standard'">标准</button>
      <button :class="['mode-btn', { active: mode === 'flip' }]" @click="mode = 'flip'">翻页</button>
    </div>
  </div>

  <div v-if="mode === 'standard'" class="reader-standard">
    <div class="mag-cover">
      <div class="cover-deco">{{ issue.year }}</div>
      <h1 class="cover-title">{{ issue.label }}</h1>
      <p class="cover-date">{{ issue.dateRange }}</p>
      <div class="cover-stats">
        <span v-if="issue.submissions.length">投稿 {{ issue.submissions.length }}</span>
        <span v-if="issue.weeklyNews.length">新闻 {{ issue.weeklyNews.length }}</span>
        <span v-if="issue.discussions.length">讨论 {{ issue.discussions.length }}</span>
      </div>
    </div>

    <div v-if="issue.submissions.length" class="mag-section">
      <div class="section-divider">
        <span class="num">01</span>
        <span class="label">投稿专栏</span>
        <span class="line"></span>
      </div>
      <div v-for="(sub, i) in issue.submissions" :key="sub.folder" class="mag-article">
        <div class="article-header">
          <span class="article-category">投稿 #{{ i + 1 }}</span>
          <span v-if="sub.license" class="article-license">{{ sub.license }}</span>
        </div>
        <h2 class="article-title">{{ sub.title }}</h2>
        <div class="article-meta">
          <span>{{ sub.author }}</span>
          <span>{{ sub.date }}</span>
          <span v-for="tag in (sub.tags || [])" :key="tag" class="tag">{{ tag }}</span>
        </div>
        <div class="article-body" v-html="renderMarkdown(sub.body)"></div>
        <CommunityWidget item-type="magazine" :item-id="`${issue.id}-${sub.folder}`" />
      </div>
    </div>

    <div v-if="issue.weeklyNews.length" class="mag-section">
      <div class="section-divider">
        <span class="num">02</span>
        <span class="label">本周新闻</span>
        <span class="line"></span>
      </div>
      <div class="news-grid">
        <div v-for="(news, i) in issue.weeklyNews" :key="i" class="news-card">
          <span class="news-category">{{ news.category || '其他' }}</span>
          <h3>{{ news.title }}</h3>
          <p>{{ news.summary }}</p>
          <div class="news-meta">
            <span>{{ news.source }}</span>
            <span>{{ news.date }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="issue.discussions.length" class="mag-section">
      <div class="section-divider">
        <span class="num">03</span>
        <span class="label">论坛精选</span>
        <span class="line"></span>
      </div>
      <div class="disc-list">
        <a v-for="disc in issue.discussions" :key="disc.id"
           :href="disc.url" target="_blank" rel="noopener noreferrer" class="disc-item">
          <span class="disc-emoji">{{ disc.categoryEmoji }}</span>
          <div class="disc-content">
            <h4>{{ disc.title }}</h4>
            <p>{{ disc.summary }}</p>
            <span class="disc-meta">{{ disc.author }} / {{ disc.category }}</span>
          </div>
        </a>
      </div>
    </div>
  </div>

  <div v-if="mode === 'flip'" class="reader-flip">
    <div class="flip-book" ref="bookRef">
      <div v-for="(page, i) in pages" :key="i"
           :class="['flip-page', { active: currentPage === i, prev: currentPage > i, next: currentPage < i }]">
        <div class="page-content" v-html="page.html"></div>
        <div class="page-number">{{ i + 1 }} / {{ pages.length }}</div>
      </div>
    </div>
    <div class="flip-controls">
      <button @click="prevPage" :disabled="currentPage === 0">上一页</button>
      <span>{{ currentPage + 1 }} / {{ pages.length }}</span>
      <button @click="nextPage" :disabled="currentPage >= pages.length - 1">下一页</button>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { renderMarkdown } from './markdown.js'

const props = defineProps({ issueId: String })

const issue = ref(null)
const mode = ref('standard')
const currentPage = ref(0)
const bookRef = ref(null)

const pages = computed(() => {
  if (!issue.value) return []
  const result = []

  result.push({
    html: `<div class="flip-cover">
      <div class="flip-cover-year">${escapeHtml(issue.value.year)}</div>
      <h1>${escapeHtml(issue.value.label)}</h1>
      <p>${escapeHtml(issue.value.dateRange)}</p>
    </div>`
  })

  for (const sub of issue.value.submissions) {
    result.push({
      html: `<div class="flip-article">
        <span class="flip-category">投稿</span>
        <h2>${escapeHtml(sub.title)}</h2>
        <div class="flip-meta">${escapeHtml(sub.author)} / ${escapeHtml(sub.date)}</div>
        <div class="flip-body">${renderMarkdown(sub.body || '')}</div>
      </div>`
    })
  }

  if (issue.value.weeklyNews.length) {
    const newsHtml = issue.value.weeklyNews.map(n =>
      `<div class="flip-news-item">
        <span class="flip-news-cat">${escapeHtml(n.category || '其他')}</span>
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.summary || '')}</p>
      </div>`
    ).join('')
    result.push({
      html: `<div class="flip-news">
        <h2>本周新闻</h2>
        ${newsHtml}
      </div>`
    })
  }

  if (issue.value.discussions.length) {
    const discHtml = issue.value.discussions.map(d =>
      `<div class="flip-disc-item">
        <span>${escapeHtml(d.categoryEmoji)}</span>
        <strong>${escapeHtml(d.title)}</strong>
        <span class="flip-disc-author">${escapeHtml(d.author)}</span>
      </div>`
    ).join('')
    result.push({
      html: `<div class="flip-disc">
        <h2>论坛精选</h2>
        ${discHtml}
      </div>`
    })
  }

  return result
})

function prevPage() {
  if (currentPage.value > 0) currentPage.value--
}

function nextPage() {
  if (currentPage.value < pages.value.length - 1) currentPage.value++
}

function onKeydown(e) {
  if (mode.value !== 'flip') return
  if (e.key === 'ArrowLeft') prevPage()
  if (e.key === 'ArrowRight') nextPage()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

watch(() => props.issueId, async (id) => {
  if (!id) return
  try {
    const res = await fetch(`./data/magazine/${id}.json`)
    issue.value = await res.json()
    currentPage.value = 0
  } catch (e) {
    console.error('Failed to load issue:', e)
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})
</script>
