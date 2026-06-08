<template>
<div class="shelf">
  <!-- 年/月导航 -->
  <div class="shelf-nav">
    <button class="nav-btn" @click="prevYear" :disabled="!canPrevYear">◀</button>
    <span class="nav-label year">{{ currentYear }} 年</span>
    <button class="nav-btn" @click="nextYear" :disabled="!canNextYear">▶</button>
    <span class="nav-sep">·</span>
    <button class="nav-btn" @click="prevMonth" :disabled="!canPrevMonth">◀</button>
    <span class="nav-label">{{ monthNames[currentMonth] }}</span>
    <button class="nav-btn" @click="nextMonth" :disabled="!canNextMonth">▶</button>
  </div>

  <!-- 加载状态 -->
  <div v-if="loading" class="shelf-loading">加载中...</div>
  <div v-else-if="filteredIssues.length === 0" class="shelf-empty">本月暂无期刊</div>

  <!-- 期卡片网格 -->
  <div v-else class="shelf-grid">
    <div v-for="issue in filteredIssues" :key="issue.id"
         class="issue-card" @click="openIssue(issue.id)">
      <div class="issue-cover">
        <div class="issue-week">W{{ issue.week }}</div>
        <div class="issue-deco">{{ currentYear }}</div>
      </div>
      <div class="issue-info">
        <h3>{{ issue.label }}</h3>
        <p class="issue-date">{{ issue.dateRange }}</p>
        <div class="issue-stats">
          <span v-if="issue.count.submissions > 0">📝 {{ issue.count.submissions }}</span>
          <span v-if="issue.count.news > 0">📰 {{ issue.count.news }}</span>
          <span v-if="issue.count.discussions > 0">💬 {{ issue.count.discussions }}</span>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const emit = defineEmits(['open-issue'])

const loading = ref(true)
const issues = ref([])
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

const monthNames = ['', '一月', '二月', '三月', '四月', '五月', '六月',
                    '七月', '八月', '九月', '十月', '十一月', '十二月']

// 可用的年份列表
const availableYears = computed(() => {
  const years = new Set(issues.value.map(i => i.year))
  return [...years].sort()
})

// 当前年月的期
const filteredIssues = computed(() => {
  return issues.value.filter(i => i.year === currentYear.value && i.month === currentMonth.value)
})

// 导航按钮状态
const canPrevYear = computed(() => availableYears.value.length > 0 && currentYear.value > Math.min(...availableYears.value))
const canNextYear = computed(() => availableYears.value.length > 0 && currentYear.value < Math.max(...availableYears.value))
const canPrevMonth = computed(() => {
  if (currentMonth.value > 1) return true
  return canPrevYear.value
})
const canNextMonth = computed(() => {
  if (currentMonth.value < 12) return true
  return canNextYear.value
})

function prevMonth() {
  if (currentMonth.value > 1) {
    currentMonth.value--
  } else if (canPrevYear.value) {
    currentMonth.value = 12
    currentYear.value--
  }
}

function nextMonth() {
  if (currentMonth.value < 12) {
    currentMonth.value++
  } else if (canNextYear.value) {
    currentMonth.value = 1
    currentYear.value++
  }
}

function prevYear() {
  if (canPrevYear.value) currentYear.value--
}

function nextYear() {
  if (canNextYear.value) currentYear.value++
}

function openIssue(id) {
  emit('open-issue', id)
}

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/magazine/index.json')
    const data = await res.json()
    issues.value = data.issues || []

    // 如果当前月没有期，跳到最近有内容的月
    if (filteredIssues.value.length === 0 && issues.value.length > 0) {
      const latest = issues.value[0]
      currentYear.value = latest.year
      currentMonth.value = latest.month
    }
  } catch (e) {
    console.error('Failed to load magazine index:', e)
  } finally {
    loading.value = false
  }
})
</script>
