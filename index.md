---
layout: home

hero:
  name: "血肉苦短研讨班"
  text: " "
  tagline: 群友讨论与分享 · 收集精彩内容
  actions:
    - theme: brand
      text: 浏览讨论
      link: /discussions
    - theme: alt
      text: GitHub
      link: https://github.com/daleselaji-dev/Xueroukuduan-

features:
  - icon: 📰
    title: 新闻
    details: 群友分享的最新资讯
  - icon: 🔧
    title: 小工具
    details: 群友开发的实用工具
  - icon: 💬
    title: 讨论
    details: 热门话题与交流
---

<script setup>
import { onMounted, ref, computed } from 'vue'

const discussions = ref([])
const contributors = ref([])
const stats = ref({})
const loading = ref(true)
const activeCategory = ref("all")
const allItems = ref([])

const categories = [
  { id: "all", name: "全部", emoji: "🔥" },
  { id: "Announcements", name: "新闻", emoji: "📰" },
  { id: "Show and tell", name: "小工具", emoji: "🔧" },
  { id: "General", name: "讨论", emoji: "💬" }
]

const filtered = computed(() => {
  if (activeCategory.value === "all") return allItems.value
  return allItems.value.filter(d => d.category === activeCategory.value)
})

onMounted(async () => {
  try {
    const res = await fetch("/flesh-is-weak-seminar/data/discussions.json")
    const data = await res.json()
    discussions.value = data.discussions || []
    contributors.value = data.contributors || []
    stats.value = data.stats || {}

    allItems.value = (data.discussions || [])
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

function setCategory(id) { activeCategory.value = id }
</script>

<section class="sec">
  <div class="sec-head">
    <span class="lab">Latest</span>
    <h2>最新内容</h2>
  </div>
  <div class="cats">
    <button v-for="cat in categories" :key="cat.id" :class="{ on: activeCategory === cat.id }" @click="setCategory(cat.id)">
      {{ cat.emoji }} {{ cat.name }}
    </button>
  </div>
  <div v-if="loading" class="empty">加载中...</div>
  <div v-else-if="filtered.length === 0" class="empty">暂无内容</div>
  <div v-else class="dlist">
    <a v-for="item in filtered" :key="item.id" :href="item.url" target="_blank" rel="noopener noreferrer" class="dcard">
      <div class="dcard-top">
        <img v-if="item.avatar" :src="item.avatar" :alt="item.author" class="avatar" />
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </div>
      </div>
      <div class="dcard-meta">
        <span>{{ item.author }}</span>
        <span>{{ item.dateFormatted }}</span>
        <span v-if="item.comments">💬 {{ item.comments }}</span>
      </div>
    </a>
  </div>
</section>

<section class="sec">
  <div class="sec-head">
    <span class="lab">Contributors</span>
    <h2>贡献者</h2>
  </div>
  <div v-if="loading" class="empty">加载中...</div>
  <div v-else class="contribs">
    <a v-for="c in contributors" :key="c.login" :href="c.url" target="_blank" rel="noopener noreferrer" class="contrib">
      <img :src="c.avatar" :alt="c.login" />
      <span>{{ c.login }}</span>
      <span class="count">{{ c.contributions }} commits</span>
    </a>
  </div>
</section>

