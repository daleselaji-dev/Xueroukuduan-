# 新闻

每日自动爬取的科技资讯。

<ContentFeed type="news" />

<script setup>
import { ref } from 'vue'
const resourcesExpanded = ref(false)
</script>

<!-- 扩展资源 -->
<div class="resources">
  <div class="resources-toggle" @click="resourcesExpanded = !resourcesExpanded">
    <span class="arrow" :class="{ open: resourcesExpanded }">▶</span>
    <span>🔗 更多新闻源 & 自部署方案</span>
  </div>
  <div v-if="resourcesExpanded" class="resources-content">

    <div class="resources-note">
      <strong>💡 提示：</strong>以下资源供有兴趣的群友自行探索。信息过载是现代人的通病——建议精选 2-3 个高质量源即可。
    </div>

    <h2>免费新闻日报/周报服务</h2>

    <table>
      <tr><th>服务</th><th>网址</th><th>频率</th><th>说明</th></tr>
      <tr><td>TLDR 中文版</td><td><a href="https://tldrnewsletter.cn" target="_blank">tldrnewsletter.cn</a></td><td>每日</td><td>5分钟读懂全球科技圈</td></tr>
      <tr><td>少数派</td><td><a href="https://sspai.com" target="_blank">sspai.com</a></td><td>每日</td><td>数码效率类资讯</td></tr>
      <tr><td>36氪</td><td><a href="https://36kr.com" target="_blank">36kr.com</a></td><td>每日</td><td>创业科技资讯</td></tr>
      <tr><td>机器之心</td><td><a href="https://jiqizhixin.com" target="_blank">jiqizhixin.com</a></td><td>每日</td><td>AI 领域中文日报</td></tr>
      <tr><td>TLDR</td><td><a href="https://tldr.tech" target="_blank">tldr.tech</a></td><td>每日</td><td>全球最知名技术日报</td></tr>
      <tr><td>FounderKit</td><td><a href="https://founderkit.md" target="_blank">founderkit.md</a></td><td>每日</td><td>AI Builder 动态</td></tr>
    </table>

    <blockquote>
      <strong>最后更新：</strong>2026-06-09<br>
      所有服务均经过验证为免费或提供免费额度。
    </blockquote>
  </div>
</div>

<style>
.resources { max-width: 800px; margin: 0 auto; padding: 0 28px 60px; }
.resources-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-family: var(--font-mono); font-size: 13px; color: var(--muted); padding: 16px 0; border-top: 1px solid var(--border); }
.resources-toggle:hover { color: var(--cyan); }
.arrow { transition: transform 0.2s; font-size: 10px; }
.arrow.open { transform: rotate(90deg); }
.resources-content { padding: 0 0 20px; }
.resources-content h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text); margin: 28px 0 12px; }
.resources-content table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.resources-content th, .resources-content td { border: 1px solid var(--border); padding: 8px 12px; text-align: left; }
.resources-content th { background: var(--card); font-weight: 600; }
.resources-content a { color: var(--cyan); text-decoration: none; }
.resources-note { background: var(--cyan-dim); border: 1px solid var(--cyan); border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.7; }
.resources-note strong { color: var(--cyan); }
.resources-content blockquote { border-left: 3px solid var(--cyan); padding-left: 16px; margin: 16px 0; color: var(--muted); font-size: 14px; }
@media (max-width: 768px) { .resources { padding: 0 16px 40px; } }
</style>