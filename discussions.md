# 讨论

热门话题与交流。

<script setup>
import { onMounted, ref } from 'vue'

const ONE_MONTH = 30 * 24 * 60 * 60 * 1000
const activeItems = ref([])
const archivedItems = ref([])
const showArchive = ref(false)

function isArchived(dateStr) {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() > ONE_MONTH
}

onMounted(async () => {
  try {
    const res = await fetch('/flesh-is-weak-seminar/data/discussions.json')
    const data = await res.json()
    const all = data.discussions || []
    activeItems.value = all.filter(d => !isArchived(d.date))
    archivedItems.value = all.filter(d => isArchived(d.date))
  } catch {}
})
</script>

<ForumLinks />

<!-- 活跃讨论（1个月内） -->
<section class="disc-section">
  <div class="disc-header">
    <span class="lab">Active</span>
    <h2>活跃讨论</h2>
    <small>{{ activeItems.length }} 条</small>
  </div>
  <div v-if="activeItems.length === 0" class="empty">暂无活跃讨论</div>
  <div v-else class="disc-grid">
    <div v-for="item in activeItems" :key="item.id" class="disc-card">
      <a :href="item.url" target="_blank" class="disc-card-link">
        <div class="disc-card-top">
          <span class="lifecycle-badge fresh">活跃</span>
          <span v-if="item.category" class="cat-badge">{{ item.categoryEmoji }} {{ item.category }}</span>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ (item.body || '').substring(0, 150) }}...</p>
        <div class="disc-card-meta">
          <span>{{ item.author }}</span>
          <span>{{ item.dateFormatted }}</span>
          <span v-if="item.comments">💬 {{ item.comments }}</span>
        </div>
      </a>
      <ContentReactions item-type="discussions" :item-id="String(item.id)" />
    </div>
  </div>
</section>

<!-- 归档讨论 -->
<section v-if="archivedItems.length > 0" class="disc-section archive-section">
  <div class="disc-header" @click="showArchive = !showArchive" style="cursor:pointer">
    <span class="arrow" :class="{ open: showArchive }">▶</span>
    <h2>归档讨论</h2>
    <small>{{ archivedItems.length }} 条（超过 1 个月）</small>
  </div>
  <div v-if="showArchive" class="disc-grid">
    <div v-for="item in archivedItems" :key="item.id" class="disc-card archived">
      <a :href="item.url" target="_blank" class="disc-card-link">
        <div class="disc-card-top">
          <span class="lifecycle-badge archived">归档</span>
        </div>
        <h3>{{ item.title }}</h3>
        <p>{{ (item.body || '').substring(0, 150) }}...</p>
        <div class="disc-card-meta">
          <span>{{ item.author }}</span>
          <span>{{ item.dateFormatted }}</span>
        </div>
      </a>
      <ContentReactions item-type="discussions" :item-id="String(item.id)" />
    </div>
  </div>
</section>

<style>
.disc-section { max-width: 800px; margin: 0 auto; padding: 20px 28px; }
.disc-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
.disc-header .lab { font-family: var(--font-mono); font-size: 11px; color: var(--cyan); font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.disc-header h2 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text); margin: 0; }
.disc-header small { margin-left: auto; font-family: var(--font-mono); font-size: 12px; color: var(--faint); }
.disc-header .arrow { transition: transform 0.2s; font-size: 10px; }
.disc-header .arrow.open { transform: rotate(90deg); }
.disc-grid { display: grid; gap: 0; }
.disc-card { border: 1px solid var(--border); border-radius: 0; background: var(--surface); margin-top: -1px; }
.disc-card.archived { opacity: 0.7; }
.disc-card-link { display: block; padding: 16px; text-decoration: none; color: inherit; }
.disc-card-link:hover { background: var(--cyan-dim); }
.disc-card-top { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.disc-card h3 { margin: 0 0 6px; font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.3; }
.disc-card p { margin: 0 0 8px; font-size: 13px; color: var(--muted); line-height: 1.5; }
.disc-card-meta { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--faint); }
.archive-section { margin-top: 32px; padding-top: 20px; border-top: 2px solid var(--border); }
/* ForumLinks 样式 */
.forum-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto 32px;
  padding: 28px 28px 0;
}

.forum-link-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--surface);
  border: 2px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.forum-link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.forum-link-card.github:hover { border-color: #238636; }
.forum-link-card.email:hover { border-color: var(--cyan); }

.forum-link-icon { font-size: 32px; }
.forum-link-info { flex: 1; }
.forum-link-info h3 { margin: 0 0 4px; font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); }
.forum-link-info p { margin: 0; font-size: 13px; color: var(--muted); }
.forum-link-arrow { font-size: 20px; color: var(--faint); }

/* ForumList 样式 */
.forum-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 28px 40px;
}

.forum-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.filter-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 6px 14px;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn:hover { border-color: var(--cyan); color: var(--cyan); }
.filter-btn.active { border-color: var(--cyan); color: var(--cyan); background: var(--cyan-dim); }

.forum-cards { display: flex; flex-direction: column; gap: 12px; }

.forum-card {
  display: block;
  padding: 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s;
}

.forum-card:hover { border-color: var(--cyan); transform: translateY(-1px); }

.forum-card-header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.source-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.source-badge.github { background: rgba(35, 134, 54, 0.1); color: #238636; }
.source-badge.remark42 { background: var(--cyan-dim); color: var(--cyan); }

.cat-badge {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 8px;
  background: var(--card);
  border-radius: 4px;
  color: var(--faint);
}

.forum-card h3 {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.forum-card-body {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.forum-card-footer {
  display: flex;
  gap: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--faint);
  align-items: center;
}

.forum-comments { color: var(--cyan); }

.loading, .empty { text-align: center; padding: 40px; color: var(--faint); font-family: var(--font-mono); }

@media (max-width: 768px) {
  .forum-links { grid-template-columns: 1fr; padding: 20px 16px 0; }
  .forum-list { padding: 0 16px 40px; }
}
</style>
