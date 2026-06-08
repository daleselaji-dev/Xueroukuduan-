# 新闻

每日自动爬取的科技资讯，来源：[FounderKit](https://founderkit.md)

<script setup>
import { onMounted, ref, computed, watch } from 'vue'

const loading = ref(true)
const dates = ref([])
const currentIndex = ref(0)
const currentData = ref(null)
const digestExpanded = ref(false)
const resourcesExpanded = ref(false)

const currentDate = computed(() => dates.value[currentIndex.value] || '')
const canPrev = computed(() => currentIndex.value < dates.value.length - 1)
const canNext = computed(() => currentIndex.value > 0)

function prevDay() { if (canPrev.value) currentIndex.value++ }
function nextDay() { if (canNext.value) currentIndex.value-- }

// 加载日期索引
async function loadIndex() {
  try {
    // 尝试加载 news 目录的 index（如果有）
    // 否则扫描最近7天
    const today = new Date()
    const found = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      try {
        const res = await fetch(`/flesh-is-weak-seminar/data/news/${dateStr}.json`, { method: 'HEAD' })
        if (res.ok) found.push(dateStr)
      } catch {}
    }
    dates.value = found
  } catch (e) {
    console.error(e)
  }
}

// 加载某天的新闻
async function loadDate(date) {
  if (!date) return
  loading.value = true
  try {
    const res = await fetch(`/flesh-is-weak-seminar/data/news/${date}.json`)
    currentData.value = await res.json()
  } catch (e) {
    console.error('Failed to load news:', e)
    currentData.value = null
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

<!-- 日期导航 -->
<div class="news-nav">
  <button class="nav-btn" @click="prevDay" :disabled="!canPrev">◀</button>
  <span class="nav-date">{{ currentDate || '暂无数据' }}</span>
  <button class="nav-btn" @click="nextDay" :disabled="!canNext">▶</button>
</div>

<div v-if="loading" class="loading">加载中...</div>
<div v-else-if="!currentData" class="empty">暂无新闻数据</div>
<div v-else class="news-container">

  <!-- AI 日报摘要 -->
  <div v-if="currentData.digest" class="digest-section">
    <div class="digest-toggle" @click="digestExpanded = !digestExpanded">
      <span class="arrow" :class="{ open: digestExpanded }">▶</span>
      <span>📰 AI 日报摘要</span>
      <span class="digest-source">by FounderKit</span>
    </div>
    <div v-if="digestExpanded" class="digest-content" v-html="currentData.digest"></div>
  </div>

  <!-- 新闻列表 -->
  <div class="news-list">
    <div class="news-category-header">
      <span class="cat-icon">📡</span>
      <h2>今日资讯</h2>
      <span class="cat-count">{{ currentData.count }} 条</span>
    </div>
    <div class="news-grid">
      <a v-for="(item, i) in currentData.articles" :key="i"
         :href="item.link || '#'" target="_blank" class="news-card">
        <span class="news-cat">{{ item.category || '其他' }}</span>
        <h3>{{ item.title }}</h3>
        <p v-if="item.summary">{{ item.summary }}</p>
        <div class="news-meta">
          <span v-if="item.source">{{ item.source }}</span>
          <span v-if="item.score">🔺 {{ item.score }}</span>
        </div>
      </a>
    </div>
  </div>
</div>

<!-- 扩展资源 -->
<div class="resources">
  <div class="resources-toggle" @click="resourcesExpanded = !resourcesExpanded">
    <span class="arrow" :class="{ open: resourcesExpanded }">▶</span>
    <span>🔗 更多新闻源 & 自部署方案</span>
  </div>
  <div v-if="resourcesExpanded" class="resources-content">

    <div class="resources-note">
      <strong>💡 提示：</strong>以下资源供有兴趣的群友自行探索。信息过载是现代人的通病——建议精选 2-3 个高质量源即可，或者把大量信息丢给 AI 处理，让它帮你筛选摘要。
    </div>

    <h2>免费新闻日报/周报服务</h2>

    <h3>中文免费邮件订阅</h3>
    <table>
      <tr><th>服务</th><th>网址</th><th>频率</th><th>说明</th></tr>
      <tr><td>太长不看</td><td><a href="https://tldrnewsletter.cn" target="_blank">tldrnewsletter.cn</a></td><td>每日</td><td>TLDR 中文版，5分钟读懂全球科技圈</td></tr>
      <tr><td>少数派</td><td><a href="https://sspai.com" target="_blank">sspai.com</a></td><td>每日</td><td>数码效率类资讯，支持 RSS</td></tr>
      <tr><td>36氪</td><td><a href="https://36kr.com" target="_blank">36kr.com</a></td><td>每日</td><td>创业科技资讯，支持 RSS</td></tr>
      <tr><td>机器之心</td><td><a href="https://jiqizhixin.com" target="_blank">jiqizhixin.com</a></td><td>每日</td><td>AI 领域中文日报</td></tr>
      <tr><td>量子位</td><td><a href="https://qbitai.com" target="_blank">qbitai.com</a></td><td>每日</td><td>AI 速递</td></tr>
    </table>

    <h3>英文高质量源</h3>
    <table>
      <tr><th>服务</th><th>网址</th><th>频率</th><th>说明</th></tr>
      <tr><td>TLDR</td><td><a href="https://tldr.tech" target="_blank">tldr.tech</a></td><td>每日</td><td>全球最知名技术日报</td></tr>
      <tr><td>TLDR AI</td><td><a href="https://tldr.tech/ai" target="_blank">tldr.tech/ai</a></td><td>每日</td><td>AI 专项日报</td></tr>
      <tr><td>Hackernewsletter</td><td><a href="https://hackernewsletter.com" target="_blank">hackernewsletter.com</a></td><td>每周</td><td>HN 编辑精选</td></tr>
      <tr><td>FounderKit</td><td><a href="https://founderkit.md" target="_blank">founderkit.md</a></td><td>每日</td><td>AI Builder 动态（我们正在用的）</td></tr>
    </table>

    <h3>免费 API（可自建爬虫）</h3>
    <table>
      <tr><th>API</th><th>网址</th><th>免费额度</th><th>中文</th></tr>
      <tr><td>FounderKit</td><td><a href="https://founderkit.md/api/data" target="_blank">founderkit.md/api/data</a></td><td>无限</td><td>✅</td></tr>
      <tr><td>Hacker News</td><td><a href="https://github.com/hackernews/api" target="_blank">hackernews/api</a></td><td>无限</td><td>❌</td></tr>
      <tr><td>arXiv</td><td><a href="https://info.arxiv.org/help/api" target="_blank">arxiv.org/api</a></td><td>无限</td><td>❌</td></tr>
      <tr><td>GNews</td><td><a href="https://gnews.io" target="_blank">gnews.io</a></td><td>100次/天</td><td>✅</td></tr>
      <tr><td>NewsData</td><td><a href="https://newsdata.io" target="_blank">newsdata.io</a></td><td>200次/天</td><td>✅</td></tr>
    </table>

    <h3>自部署自动化工具</h3>
    <table>
      <tr><th>工具</th><th>网址</th><th>说明</th></tr>
      <tr><td>n8n</td><td><a href="https://n8n.io" target="_blank">n8n.io</a></td><td>开源工作流，定时抓取→AI总结→推送</td></tr>
      <tr><td>GitHub Actions</td><td><a href="https://github.com" target="_blank">github.com</a></td><td>免费2000分钟/月，定时跑脚本</td></tr>
      <tr><td>RSSHub</td><td><a href="https://rsshub.app" target="_blank">rsshub.app</a></td><td>万物皆可RSS，可自部署</td></tr>
    </table>

    <blockquote>
      <strong>最后更新：</strong>2026-06-07<br>
      所有服务均经过验证为免费或提供免费额度，具体限制请以各官网最新说明为准。
    </blockquote>
  </div>
</div>

<style>
.news-nav {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  padding: 40px 28px 0; font-family: var(--font-mono);
}
.nav-btn {
  background: var(--card); border: 1px solid var(--border); color: var(--muted);
  width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
  transition: all 0.15s;
}
.nav-btn:hover:not(:disabled) { border-color: var(--cyan); color: var(--cyan); }
.nav-btn:disabled { opacity: 0.3; cursor: default; }
.nav-date { font-size: 16px; font-weight: 600; color: var(--text); min-width: 100px; text-align: center; }

.news-container { max-width: 800px; margin: 0 auto; padding: 24px 28px; }

/* AI 日报摘要 */
.digest-section { margin-bottom: 32px; }
.digest-toggle {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; user-select: none;
  font-family: var(--font-mono); font-size: 14px; color: var(--text);
  padding: 14px 16px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; transition: all 0.2s;
}
.digest-toggle:hover { border-color: var(--cyan); }
.digest-source { margin-left: auto; font-size: 11px; color: var(--faint); }
.digest-content {
  padding: 20px; margin-top: 8px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  font-size: 14px; line-height: 1.8; color: var(--text);
}
.digest-content h2, .digest-content h3 { font-family: var(--font-display); color: var(--text); margin: 16px 0 8px; }
.digest-content p { margin: 8px 0; }
.digest-content a { color: var(--cyan); }
.digest-content strong { color: var(--text); }
.arrow { transition: transform 0.2s; font-size: 10px; }
.arrow.open { transform: rotate(90deg); }

/* 新闻列表 */
.news-category-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.cat-icon { font-size: 18px; }
.news-category-header h2 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.cat-count { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--faint); }

.news-grid { display: grid; gap: 12px; }
.news-card {
  display: block; padding: 16px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  text-decoration: none; color: inherit; transition: all 0.2s;
}
.news-card:hover { border-color: var(--cyan); transform: translateY(-2px); }
.news-cat {
  font-family: var(--font-mono); font-size: 10px; padding: 2px 8px;
  background: var(--cyan-dim); color: var(--cyan); border-radius: 4px;
  display: inline-block; margin-bottom: 8px;
}
.news-card h3 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.4; }
.news-card p { margin: 0 0 8px; font-size: 13px; color: var(--muted); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.news-meta { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--faint); }

/* 扩展资源 */
.resources { max-width: 800px; margin: 0 auto; padding: 0 28px 60px; }
.resources-toggle {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; user-select: none;
  font-family: var(--font-mono); font-size: 13px; color: var(--muted);
  padding: 16px 0; border-top: 1px solid var(--border);
}
.resources-toggle:hover { color: var(--cyan); }
.resources-content { padding: 0 0 20px; }
.resources-content h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text); margin: 28px 0 12px; }
.resources-content h3 { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); margin: 20px 0 10px; }
.resources-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.resources-content th, .resources-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.resources-content th { background: var(--card); font-weight: 600; color: var(--text); }
.resources-content td { color: var(--muted); }
.resources-content a { color: var(--cyan); text-decoration: none; }
.resources-content a:hover { text-decoration: underline; }
.resources-content blockquote { border-left: 3px solid var(--cyan); padding-left: 16px; margin: 16px 0; color: var(--muted); font-size: 14px; }
.resources-note {
  background: var(--cyan-dim); border: 1px solid var(--cyan);
  border-radius: 8px; padding: 16px; margin: 20px 0;
  font-size: 13px; color: var(--text); line-height: 1.7;
}
.resources-note strong { color: var(--cyan); }

.loading, .empty { text-align: center; padding: 60px; color: var(--faint); font-family: var(--font-mono); }

@media (max-width: 768px) {
  .news-nav { padding: 20px 16px 0; }
  .news-container { padding: 16px; }
  .resources { padding: 0 16px 40px; }
}
</style>
