# 讨论

<script setup>
import { onMounted, ref } from 'vue'
const composeOpen = ref(false)
const ghDiscussions = ref([])
const loading = ref(true)
const ONE_MONTH = 30 * 24 * 60 * 60 * 1000

function isArchived(dateStr) {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() > ONE_MONTH
}

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/discussions.json')
    const data = await res.json()
    ghDiscussions.value = (data.discussions || []).filter(d => !isArchived(d.date))
  } catch {} finally { loading.value = false }
})
</script>

<ForumLinks />

<!-- 发布入口 -->
<div class="composer-section">
  <button v-if="!composeOpen" class="feed-compose-btn" @click="composeOpen = true">💬 发起讨论</button>
  <PostComposer v-if="composeOpen" @created="composeOpen = false" />
</div>

<!-- GitHub 讨论 -->
<div v-if="ghDiscussions.length > 0" class="disc-section">
  <div class="disc-header">
    <span class="lab">🐙</span>
    <h2>GitHub 讨论</h2>
    <small>{{ ghDiscussions.length }} 条</small>
  </div>
  <div class="disc-grid">
    <a v-for="item in ghDiscussions" :key="item.id" :href="item.url" target="_blank" class="disc-card disc-card-link">
      <h3>{{ item.title }}</h3>
      <p>{{ (item.body || '').substring(0, 150) }}...</p>
      <div class="disc-card-meta">
        <span>{{ item.author }}</span>
        <span>{{ item.dateFormatted }}</span>
        <span v-if="item.comments">💬 {{ item.comments }}</span>
      </div>
    </a>
  </div>
</div>

<!-- 自建讨论 -->
<div class="disc-section">
  <div class="disc-header">
    <span class="lab">Local</span>
    <h2>自建讨论</h2>
  </div>
  <ContentFeed type="discussions" />
</div>

<style>
.composer-section { max-width: 800px; margin: 0 auto; padding: 0 28px; }
.disc-section { max-width: 800px; margin: 0 auto; padding: 20px 28px; }
.disc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.disc-header .lab { font-family: var(--font-mono); font-size: 11px; color: var(--cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.disc-header h2 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.disc-header small { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--faint); }
.disc-grid { display: grid; gap: 0; }
.disc-card { border: 1px solid var(--border); background: var(--surface); margin-top: -1px; padding: 16px; text-decoration: none; color: inherit; }
.disc-card:hover { background: var(--cyan-dim); }
.disc-card h3 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text); }
.disc-card p { margin: 0 0 8px; font-size: 13px; color: var(--muted); }
.disc-card-meta { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--faint); }
</style>
<ContentFeed type="discussions" />

<style>
.resources { max-width: 800px; margin: 0 auto; padding: 0 28px 60px; }
</style>
