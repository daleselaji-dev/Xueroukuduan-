---
layout: home
---

<script setup>
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const contributors = ref([])
const loading = ref(true)
const loadError = ref('')
const activeCategory = ref('all')
const allItems = ref([])
const heroVisual = ref(null)
const dragging = ref(false)
const blobOffset = ref({ x: 0, y: 0 })

const categories = [
  { id: 'all', name: '全部', kicker: 'All' },
  { id: 'Announcements', name: '新闻', kicker: 'News' },
  { id: 'Show and tell', name: '小工具', kicker: 'Tools' },
  { id: 'General', name: '讨论', kicker: 'Talks' },
  { id: 'Q&A', name: '问答', kicker: 'Q&A' },
]

const featureLinks = [
  {
    title: '新闻',
    eyebrow: 'News',
    text: '把群友关心的新项目、技术变化和资料流放在同一条清晰时间线里。',
    href: '/news',
  },
  {
    title: '小工具',
    eyebrow: 'Tools',
    text: '展示群友做出的实用工具、脚本、实验和可复用的工作流。',
    href: '/tools',
  },
  {
    title: '讨论',
    eyebrow: 'Discussions',
    text: '把问题、经验和后续启发连起来，让内容可以被继续回应和归档。',
    href: '/discussions',
  },
]

const stats = computed(() => {
  const items = allItems.value
  return [
    { label: '内容', value: items.length },
    { label: '贡献者', value: contributors.value.length },
    { label: '栏目', value: categories.length - 1 },
  ]
})

const filtered = computed(() => {
  if (activeCategory.value === 'all') return allItems.value
  return allItems.value.filter((item) => item.category === activeCategory.value)
})

const blobStyle = computed(() => ({
  '--blob-x': `${blobOffset.value.x}px`,
  '--blob-y': `${blobOffset.value.y}px`,
}))

onMounted(async () => {
  try {
    const res = await fetch(withBase('/data/discussions.json'))
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    contributors.value = data.contributors || []
    allItems.value = (data.discussions || [])
      .slice()
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  } catch (error) {
    loadError.value = '内容暂时没有加载成功，请稍后再试。'
    console.error(error)
  } finally {
    loading.value = false
  }
})

function setCategory(id) {
  activeCategory.value = id
}

function localPath(path) {
  return withBase(path)
}

function startBlobDrag(event) {
  dragging.value = true
  event.currentTarget.setPointerCapture?.(event.pointerId)
  moveBlobDrag(event)
}

function moveBlobDrag(event) {
  if (!dragging.value || !heroVisual.value) return
  const rect = heroVisual.value.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  blobOffset.value = {
    x: Math.max(-72, Math.min(72, x * 0.16)),
    y: Math.max(-72, Math.min(72, y * 0.16)),
  }
}

function endBlobDrag(event) {
  dragging.value = false
  event.currentTarget.releasePointerCapture?.(event.pointerId)
  blobOffset.value = { x: 0, y: 0 }
}
</script>

<section class="home-hero">
  <div class="hero-meta">
    <span>Community Lab</span>
    <span>2026</span>
  </div>
  <div
    ref="heroVisual"
    :class="['hero-visual', { dragging }]"
    :style="blobStyle"
    role="img"
    aria-label="可交互的液态金属视觉"
    @pointerdown="startBlobDrag"
    @pointermove="moveBlobDrag"
    @pointerup="endBlobDrag"
    @pointercancel="endBlobDrag"
    @pointerleave="endBlobDrag"
  >
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
    <div class="blob-core"></div>
  </div>
  <div class="hero-copy">
    <p class="hero-kicker">血肉苦短研讨班</p>
    <h1>把讨论、工具和经验整理成可以继续生长的现场。</h1>
    <p class="hero-lede">群友在这里发布新闻、展示小工具、延伸讨论，也把新的灵感挂回原始内容，让每一次回应都能被看见。</p>
    <div class="hero-actions">
      <a :href="localPath('/discussions')" class="btn-main">浏览讨论</a>
      <a :href="localPath('/create')" class="btn-ghost">发布内容</a>
    </div>
  </div>
  <div class="hero-scroll">Scroll</div>
</section>

<section class="signal-strip" aria-label="站点状态">
  <div v-for="item in stats" :key="item.label" class="signal-item">
    <strong>{{ item.value }}</strong>
    <span>{{ item.label }}</span>
  </div>
</section>

<section class="section-shell feature-grid" aria-label="栏目入口">
  <a v-for="feature in featureLinks" :key="feature.title" :href="localPath(feature.href)" class="feature-panel">
    <span>{{ feature.eyebrow }}</span>
    <h2>{{ feature.title }}</h2>
    <p>{{ feature.text }}</p>
  </a>
</section>

<section class="section-shell content-section">
  <div class="section-head">
    <div>
      <span class="lab">Latest</span>
      <h2>最新内容</h2>
    </div>
    <a :href="localPath('/discussions')" class="section-link">全部讨论</a>
  </div>

  <div class="category-rail" role="tablist" aria-label="内容分类">
    <button
      v-for="cat in categories"
      :key="cat.id"
      type="button"
      :class="{ active: activeCategory === cat.id }"
      @click="setCategory(cat.id)"
    >
      <span>{{ cat.kicker }}</span>
      {{ cat.name }}
    </button>
  </div>

  <div v-if="loading" class="empty-state">加载中...</div>
  <div v-else-if="loadError" class="empty-state">{{ loadError }}</div>
  <div v-else-if="filtered.length === 0" class="empty-state">暂无内容</div>
  <div v-else class="editorial-feed">
    <a v-for="item in filtered" :key="item.id" :href="item.url" target="_blank" rel="noopener noreferrer" class="feed-row">
      <div class="feed-index">{{ item.category || 'General' }}</div>
      <div class="feed-main">
        <h3>{{ item.title }}</h3>
        <p>{{ item.body }}</p>
      </div>
      <div class="feed-meta">
        <span>{{ item.author }}</span>
        <time>{{ item.dateFormatted }}</time>
        <span v-if="item.comments">{{ item.comments }} 回复</span>
      </div>
    </a>
  </div>
</section>

<section class="section-shell contributors-section">
  <div class="section-head">
    <div>
      <span class="lab">Contributors</span>
      <h2>贡献者</h2>
    </div>
    <a :href="localPath('/contributors')" class="section-link">查看全部</a>
  </div>
  <div v-if="loading" class="empty-state">加载中...</div>
  <div v-else class="contributor-line">
    <a v-for="c in contributors" :key="c.login" :href="c.url" target="_blank" rel="noopener noreferrer" class="contrib">
      <img :src="c.avatar" :alt="c.login" />
      <span>{{ c.login }}</span>
      <small>{{ c.contributions }} commits</small>
    </a>
  </div>
</section>
