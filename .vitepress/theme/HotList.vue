<template>
<div class="hotlist">
  <!-- 日期导航 -->
  <div class="hotlist-nav">
    <button class="nav-btn" @click="prevDay" :disabled="!canPrev">◀</button>
    <span class="nav-date">{{ currentDate }}</span>
    <button class="nav-btn" @click="nextDay" :disabled="!canNext">▶</button>
  </div>

  <div v-if="loading" class="loading">加载中...</div>
  <div v-else-if="!data" class="empty">暂无数据</div>
  <div v-else class="hotlist-grid">

    <!-- 左侧：GitHub 热门项目 -->
    <section class="hotlist-col github-col">
      <div class="col-header">
        <span class="col-icon">🐙</span>
        <h2>GitHub 热门项目</h2>
        <span class="col-desc">最近7天新建的高星项目</span>
      </div>
      <div v-if="!data.github.items.length" class="col-empty">暂无数据</div>
      <div v-else class="rank-list">
        <a v-for="item in data.github.items" :key="item.url"
           :href="item.url" target="_blank" class="rank-item">
          <span :class="['rank-num', { top3: item.rank <= 3 }]">{{ item.rank }}</span>
          <div class="rank-content">
            <div class="rank-title">{{ item.name }}</div>
            <div class="rank-desc">{{ item.description }}</div>
            <div class="rank-meta">
              <span class="rank-stars">⭐ {{ item.stars.toLocaleString() }}</span>
              <span v-if="item.language" class="rank-lang">{{ item.language }}</span>
            </div>
          </div>
        </a>
      </div>
    </section>

    <!-- 右侧：arXiv 最新论文 -->
    <section class="hotlist-col arxiv-col">
      <div class="col-header">
        <span class="col-icon">📄</span>
        <h2>arXiv 最新论文</h2>
        <span class="col-desc">cs.AI / cs.LG 分类最新提交</span>
      </div>
      <div v-if="!data.arxiv.items.length" class="col-empty">暂无数据</div>
      <div v-else class="rank-list">
        <a v-for="item in data.arxiv.items" :key="item.url"
           :href="item.url" target="_blank" class="rank-item paper">
          <span :class="['rank-num', { top3: item.rank <= 3 }]">{{ item.rank }}</span>
          <div class="rank-content">
            <div class="rank-title">{{ item.title }}</div>
            <div class="rank-authors">{{ item.authors.join(', ') }}</div>
            <div class="rank-desc">{{ item.summary }}</div>
            <div class="rank-meta">
              <span class="rank-cat">{{ item.category }}</span>
              <span class="rank-date">{{ item.published }}</span>
              <a v-if="item.pdf" :href="item.pdf" target="_blank" class="rank-pdf" @click.stop>PDF</a>
            </div>
          </div>
        </a>
      </div>
    </section>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const loading = ref(true)
const data = ref(null)
const dates = ref([])
const currentIndex = ref(0)

const currentDate = computed(() => dates.value[currentIndex.value] || '')
const canPrev = computed(() => currentIndex.value < dates.value.length - 1)
const canNext = computed(() => currentIndex.value > 0)

function prevDay() { if (canPrev.value) currentIndex.value++ }
function nextDay() { if (canNext.value) currentIndex.value-- }

async function loadIndex() {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/hotlist/index.json')
    const index = await res.json()
    dates.value = index.dates || []
    currentIndex.value = 0
  } catch (e) {
    console.error('Failed to load hotlist index:', e)
  }
}

async function loadDate(date) {
  if (!date) return
  loading.value = true
  try {
    const res = await fetch(`/flesh-is-weak-seminar/data/hotlist/${date}.json`)
    data.value = await res.json()
  } catch (e) {
    console.error('Failed to load hotlist:', e)
    data.value = null
  } finally {
    loading.value = false
  }
}

watch(currentDate, (d) => { if (d) loadDate(d) })

onMounted(async () => {
  await loadIndex()
  if (dates.value.length > 0) {
    await loadDate(dates.value[0])
  } else {
    loading.value = false
  }
})
</script>
