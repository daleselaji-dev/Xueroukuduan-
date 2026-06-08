---
layout: home

hero:
  name: "血肉苦短研讨班"
  text: "👽"
  tagline: 群友讨论与分享 · 收集精彩内容
  actions:
    - theme: brand
      text: 浏览讨论
      link: /discussions
    - theme: alt
      text: GitHub
      link: https://github.com/daleselaji-dev/Xueroukuduan-

features:
  - icon: ✍️
    title: 群友投稿
    details: PR 提交的优质文章和资源
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
import { renderMarkdown } from './.vitepress/theme/markdown.js'

const discussions = ref([])
const submissions = ref([])
const contributors = ref([])
const stats = ref({})
const loading = ref(true)
const activeCategory = ref('all')
const allItems = ref([])

const categories = [
  { id: 'all', name: '全部', emoji: '🔥' },
  { id: 'submission', name: '投稿', emoji: '✍️' },
  { id: 'Announcements', name: '新闻', emoji: '📰' },
  { id: 'Show and tell', name: '小工具', emoji: '🔧' },
  { id: 'General', name: '讨论', emoji: '💬' }
]

// 合并 discussions 和 submissions 并按时间排序
const filtered = computed(() => {
  if (activeCategory.value === 'all') return allItems.value
  return allItems.value.filter(d => d.category === activeCategory.value)
})

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/discussions.json')
    const data = await res.json()
    discussions.value = data.discussions || []
    submissions.value = data.submissions || []
    contributors.value = data.contributors || []
    stats.value = data.stats || {}

    // 将 submissions 转换为统一格式，合并到 allItems
    const submissionItems = (data.submissions || []).map(s => ({
      id: 'sub-' + s.folder,
      title: s.title,
      body: s.summary,
      category: 'submission',
      author: s.author,
      avatar: '',
      date: s.date,
      dateFormatted: s.date,
      license: s.license || '',
      comments: 0,
      url: '#',
      isSubmission: true,
      submissionData: s
    }))

    allItems.value = [...submissionItems, ...(data.discussions || [])]
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
    <template v-for="item in filtered" :key="item.id">
      <!-- 投稿卡片 -->
      <a v-if="item.isSubmission" href="/submissions.html" class="dcard submission">
        <div class="dcard-top">
          <div class="dcard-badge">✍️ 投稿</div>
          <div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.body }}</p>
          </div>
        </div>
        <div class="dcard-meta">
          <span>{{ item.author }}</span>
          <span>{{ item.dateFormatted }}</span>
          <span v-if="item.license" class="dcard-license">{{ item.license }}</span>
          <span class="dcard-link">查看详情 →</span>
        </div>
      </a>
      <CommunityWidget v-if="item.isSubmission" item-type="submissions" :item-id="item.submissionData.folder" />
      <!-- 讨论卡片 -->
      <a v-else :href="item.url" target="_blank" rel="noopener noreferrer" class="dcard">
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
      <CommunityWidget v-if="!item.isSubmission" :item-type="item.category === 'Announcements' ? 'news' : item.category === 'Show and tell' ? 'tools' : 'discussions'" :item-id="item.id" />
    </template>
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

<style>
.sec { max-width: 1080px; margin: 0 auto; padding: 80px 28px; }
.sec-head { margin-bottom: 40px; }
.lab { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cyan); margin-bottom: 12px; display: block; }
.sec h2 { font-family: var(--font-display); font-size: clamp(28px, 4vw, 40px); line-height: 1.15; letter-spacing: -0.03em; font-weight: 700; color: var(--text); }
.cats { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
.cats button { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--muted); background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 8px 16px; cursor: pointer; transition: all 0.15s; }
.cats button.on { background: var(--cyan); border-color: var(--cyan); color: var(--bg); }
.cats button:hover:not(.on) { border-color: var(--cyan); color: var(--cyan); }
.dlist { display: grid; gap: 12px; }
.dcard { display: block; padding: 20px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s; cursor: pointer; }
.dcard:hover { border-color: var(--cyan); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0, 229, 176, 0.1); }
.dcard.submission { border-left: 3px solid var(--cyan); }
.dcard-top { display: flex; gap: 16px; margin-bottom: 12px; }
.dcard-badge { font-family: var(--font-mono); font-size: 11px; padding: 3px 10px; background: var(--cyan-dim); color: var(--cyan); border-radius: 100px; white-space: nowrap; height: fit-content; }
.avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
.dcard h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); }
.dcard p { margin: 0; font-size: 14px; color: var(--muted); line-height: 1.5; }
.dcard-meta { display: flex; gap: 16px; font-family: var(--font-mono); font-size: 12px; color: var(--faint); align-items: center; }
.dcard-license { padding: 2px 8px; background: var(--cyan-dim); color: var(--cyan); border-radius: 4px; font-size: 11px; }
.dcard-link { color: var(--cyan); }
.contribs { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.contrib { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s; }
.contrib:hover { border-color: var(--cyan); transform: translateY(-2px); }
.contrib img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border); }
.contrib span { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text); }
.contrib .count { font-size: 11px; color: var(--faint); font-weight: 400; }
.empty { padding: 40px 24px; text-align: center; color: var(--faint); font-family: var(--font-mono); font-size: 14px; }
/* 移动端适配 */
@media (max-width: 768px) {
  .sec { padding: 40px 16px; }
  .sec h2 { font-size: 24px; }
  .cats { gap: 6px; }
  .cats button { font-size: 12px; padding: 6px 12px; }
  .dcard { padding: 16px; }
  .dcard-top { gap: 12px; }
  .avatar { width: 40px; height: 40px; }
  .dcard h3 { font-size: 15px; }
  .dcard p { font-size: 13px; }
  .dcard-meta { font-size: 11px; gap: 10px; flex-wrap: wrap; }
  .contribs { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .contrib { padding: 16px; }
  .contrib img { width: 48px; height: 48px; }
  .contrib span { font-size: 12px; }
}
</style>
