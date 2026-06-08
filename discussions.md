# 讨论

热门话题与交流。

<ForumLinks />

<ForumList />

<style>
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
