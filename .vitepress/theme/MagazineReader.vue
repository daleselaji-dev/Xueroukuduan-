<template>
<!-- 模态弹窗覆盖层 -->
<div v-if="issue" class="reader-overlay" @click.self="$emit('back')">
  <div :class="['reader-modal', { 'reader-web-fullscreen': webFullscreen }]">

    <!-- 顶部工具栏（sticky） -->
    <div class="reader-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn" @click="$emit('back')">← 返回书架</button>
        <span class="toolbar-title">{{ issue.label }}</span>
      </div>

      <div class="toolbar-center">
        <div class="toolbar-modes">
          <button :class="['mode-btn', { active: mode === 'standard' }]" @click="mode = 'standard'">📖 标准</button>
          <button :class="['mode-btn', { active: mode === 'flip' }]" @click="mode = 'flip'">📑 翻页</button>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="font-controls">
          <button class="ctrl-btn" @click="toggleFont" :title="fontSerif ? '切换非衬线' : '切换衬线'">
            {{ fontSerif ? 'Aa' : 'Tt' }}
          </button>
          <button class="ctrl-btn" @click="fontSize = Math.max(12, fontSize - 2)">A-</button>
          <span class="font-size-label">{{ fontSize }}</span>
          <button class="ctrl-btn" @click="fontSize = Math.min(24, fontSize + 2)">A+</button>
        </div>

        <div class="tts-controls" v-if="ttsSupported">
          <button class="ctrl-btn" @click="toggleTTS" :title="ttsPlaying ? '暂停朗读' : '开始朗读'">
            {{ ttsPlaying ? '⏸' : '🔊' }}
          </button>
          <button class="ctrl-btn" @click="stopTTS" v-if="ttsPlaying || ttsPaused">⏹</button>
        </div>

        <div class="fullscreen-controls">
          <button class="ctrl-btn" @click="toggleBrowserFullscreen" :title="browserFullscreen ? '退出全屏' : '浏览器全屏'">
            {{ browserFullscreen ? '⊡' : '⛶' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 内容区域（可滚动） -->
    <div class="reader-body">

      <!-- 标准阅读模式 -->
      <div v-if="mode === 'standard'" class="reader-standard" :style="contentStyle">
        <!-- 封面 -->
        <div class="mag-cover">
          <div class="cover-deco">{{ issue.year }}</div>
          <h1 class="cover-title">{{ issue.label }}</h1>
          <p class="cover-date">{{ issue.dateRange }}</p>
          <div class="cover-stats">
            <div class="stat-item" v-if="issue.submissions.length">
              <span class="stat-num">{{ issue.submissions.length }}</span>
              <span class="stat-label">投稿</span>
            </div>
            <div class="stat-item" v-if="issue.weeklyNews.length">
              <span class="stat-num">{{ issue.weeklyNews.length }}</span>
              <span class="stat-label">新闻</span>
            </div>
            <div class="stat-item" v-if="issue.discussions.length">
              <span class="stat-num">{{ issue.discussions.length }}</span>
              <span class="stat-label">讨论</span>
            </div>
          </div>
          <div class="cover-highlights" v-if="highlights.length">
            <div class="highlight-label">本期亮点</div>
            <div class="highlight-item" v-for="(h, i) in highlights" :key="i">{{ h }}</div>
          </div>
        </div>

        <!-- 投稿 -->
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
          </div>
        </div>

        <!-- 新闻 -->
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
                <a v-if="news.link" :href="news.link" target="_blank" class="news-link">原文 →</a>
              </div>
            </div>
          </div>
        </div>

        <!-- 讨论 -->
        <div v-if="issue.discussions.length" class="mag-section">
          <div class="section-divider">
            <span class="num">03</span>
            <span class="label">论坛精选</span>
            <span class="line"></span>
          </div>
          <div class="disc-list">
            <a v-for="disc in issue.discussions" :key="disc.id"
               :href="disc.url" target="_blank" class="disc-item">
              <span class="disc-emoji">{{ disc.categoryEmoji }}</span>
              <div class="disc-content">
                <h4>{{ disc.title }}</h4>
                <p>{{ disc.summary }}</p>
                <span class="disc-meta">{{ disc.author }} · {{ disc.category }}</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <!-- 翻页模式 -->
      <div v-if="mode === 'flip'" class="reader-flip">
        <div class="flip-book" ref="bookRef">
          <div v-for="(page, i) in pages" :key="i"
               :class="['flip-page', { active: currentPage === i, prev: currentPage > i, next: currentPage < i }]"
               :style="pageStyle">
            <div class="page-content" v-html="page.html"></div>
            <div class="page-number">{{ i + 1 }} / {{ pages.length }}</div>
          </div>
        </div>
        <div class="flip-controls">
          <button @click="prevPage" :disabled="currentPage === 0">◀ 上一页</button>
          <span>{{ currentPage + 1 }} / {{ pages.length }}</span>
          <button @click="nextPage" :disabled="currentPage >= pages.length - 1">下一页 ▶</button>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { withBase } from 'vitepress'
import { renderMarkdown } from './markdown.js'

const props = defineProps({ issueId: String })

const issue = ref(null)
const mode = ref('standard')
const currentPage = ref(0)
const bookRef = ref(null)

// 全屏
const webFullscreen = ref(false)
const browserFullscreen = ref(false)

// 字体
const fontSerif = ref(true)
const fontSize = ref(15)

// TTS
const ttsSupported = ref(false)
const ttsPlaying = ref(false)
const ttsPaused = ref(false)
let ttsUtterance = null

// 内容样式
const contentStyle = computed(() => ({
  fontFamily: fontSerif.value ? "var(--font-display), Georgia, serif" : "var(--font-mono), sans-serif",
  fontSize: fontSize.value + 'px'
}))

// 翻页模式样式
const pageStyle = computed(() => ({
  fontFamily: fontSerif.value ? "var(--font-display), Georgia, serif" : "var(--font-mono), sans-serif",
  fontSize: fontSize.value + 'px'
}))

// 本期亮点
const highlights = computed(() => {
  if (!issue.value) return []
  const items = []
  for (const sub of issue.value.submissions.slice(0, 2)) {
    items.push(sub.title)
  }
  for (const n of issue.value.weeklyNews.slice(0, 2)) {
    items.push(n.title)
  }
  for (const d of issue.value.discussions.slice(0, 1)) {
    items.push(d.title)
  }
  return items.slice(0, 4)
})

// 将内容拆分为"页"
const pages = computed(() => {
  if (!issue.value) return []
  const result = []

  // 封面页
  const hl = highlights.value.map(h => `<div class="flip-hl-item">· ${h}</div>`).join('')
  result.push({
    html: `<div class="flip-cover">
      <div class="flip-cover-year">${issue.value.year}</div>
      <h1>${issue.value.label}</h1>
      <p>${issue.value.dateRange}</p>
      <div class="flip-cover-stats">
        <span>${issue.value.submissions.length} 篇投稿</span>
        <span>${issue.value.weeklyNews.length} 条新闻</span>
        <span>${issue.value.discussions.length} 条讨论</span>
      </div>
      <div class="flip-cover-hl">${hl}</div>
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

// 全屏切换
function toggleBrowserFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    browserFullscreen.value = true
  } else {
    document.exitFullscreen()
    browserFullscreen.value = false
  }
}

function onFullscreenChange() {
  browserFullscreen.value = !!document.fullscreenElement
}

// 字体切换
function toggleFont() {
  fontSerif.value = !fontSerif.value
}

// TTS 语音朗读
function initTTS() {
  ttsSupported.value = 'speechSynthesis' in window
}

function toggleTTS() {
  if (!ttsSupported.value) return
  if (ttsPlaying.value && !ttsPaused.value) {
    window.speechSynthesis.pause()
    ttsPaused.value = true
    return
  }
  if (ttsPaused.value) {
    window.speechSynthesis.resume()
    ttsPaused.value = false
    return
  }
  const text = getFullText()
  if (!text) return
  ttsUtterance = new SpeechSynthesisUtterance(text)
  ttsUtterance.lang = 'zh-CN'
  ttsUtterance.rate = 1.0
  ttsUtterance.onend = () => { ttsPlaying.value = false; ttsPaused.value = false }
  window.speechSynthesis.speak(ttsUtterance)
  ttsPlaying.value = true
}

function stopTTS() {
  window.speechSynthesis.cancel()
  ttsPlaying.value = false
  ttsPaused.value = false
}

function getFullText() {
  if (!issue.value) return ''
  const parts = []
  for (const sub of issue.value.submissions) {
    parts.push(sub.title + '。' + (sub.body || '').replace(/[#*`\[\]()]/g, '').substring(0, 2000))
  }
  for (const n of issue.value.weeklyNews) {
    parts.push(n.title + '。' + (n.summary || ''))
  }
  for (const d of issue.value.discussions) {
    parts.push(d.title + '。' + (d.summary || ''))
  }
  return parts.join('\n\n')
}

// 键盘翻页
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
    const res = await fetch(withBase(`/data/magazine/${id}.json`))
    issue.value = await res.json()
    currentPage.value = 0
  } catch (e) {
    console.error('Failed to load issue:', e)
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  initTTS()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  stopTTS()
})
</script>
