# 贡献者

活跃群友展示。

<script setup>
import { onMounted, ref } from 'vue'

const contributors = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/discussions.json')
    const data = await res.json()
    contributors.value = data.contributors
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<div v-if="loading" class="loading">加载中...</div>
<div v-else-if="contributors.length === 0" class="empty">暂无贡献者</div>
<div v-else class="grid">
  <a v-for="c in contributors" :key="c.login" :href="c.url" target="_blank" class="card">
    <img :src="c.avatar" :alt="c.login" />
    <span class="name">{{ c.login }}</span>
    <span class="count">{{ c.contributions }} commits</span>
  </a>
</div>

<style>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; max-width: 800px; margin: 0 auto; padding: 40px 28px; }
.card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s; }
.card:hover { border-color: var(--cyan); transform: translateY(-2px); }
.card img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border); }
.card .name { font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text); }
.card .count { font-family: var(--font-mono); font-size: 11px; color: var(--faint); }
.loading, .empty { text-align: center; padding: 40px; color: var(--faint); font-family: var(--font-mono); }
</style>
