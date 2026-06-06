# 新闻

群友分享的最新资讯。

<script setup>
import { onMounted, ref } from 'vue'

const items = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('./data/discussions.json')
    const data = await res.json()
    items.value = data.discussions.filter(d => d.category === 'Announcements')
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<div v-if="loading" class="loading">加载中...</div>
<div v-else-if="items.length === 0" class="empty">暂无新闻</div>
<div v-else class="list">
  <article v-for="item in items" :key="item.id" class="card">
    <a :href="item.url" target="_blank" rel="noopener noreferrer" class="card-link">
      <div class="card-header">
        <img v-if="item.avatar" :src="item.avatar" :alt="item.author" class="avatar" />
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </div>
      </div>
      <div class="card-meta">
        <span>{{ item.author }}</span>
        <span>{{ item.dateFormatted }}</span>
        <span v-if="item.comments">评论 {{ item.comments }}</span>
      </div>
    </a>
    <CommunityWidget item-type="news" :item-id="item.id" />
  </article>
</div>

<style>
.list { display: grid; gap: 12px; max-width: 800px; margin: 0 auto; padding: 40px 28px; }
.card { display: block; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; color: inherit; transition: all 0.2s; }
.card:hover { border-color: var(--cyan); transform: translateY(-2px); }
.card-link { display: block; color: inherit; text-decoration: none; }
.card-header { display: flex; gap: 16px; margin-bottom: 12px; }
.avatar { width: 48px; height: 48px; border-radius: 50%; }
.card h3 { margin: 0 0 6px; font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); }
.card p { margin: 0; font-size: 14px; color: var(--muted); }
.card-meta { display: flex; gap: 16px; font-family: var(--font-mono); font-size: 12px; color: var(--faint); }
.loading, .empty { text-align: center; padding: 40px; color: var(--faint); font-family: var(--font-mono); }
</style>
