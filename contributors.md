# 贡献者

活跃群友展示。

<script setup>
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const contributors = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch(withBase('/data/discussions.json'))
    const data = await res.json()
    contributors.value = data.contributors || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<div v-if="loading" class="loading">加载中...</div>
<div v-else-if="contributors.length === 0" class="empty">暂无贡献者</div>
<div v-else class="contribs">
  <a v-for="c in contributors" :key="c.login" :href="c.url" target="_blank" class="contrib">
    <img :src="c.avatar" :alt="c.login" />
    <span class="name">{{ c.login }}</span>
    <span class="count">{{ c.contributions }} commits</span>
  </a>
</div>
