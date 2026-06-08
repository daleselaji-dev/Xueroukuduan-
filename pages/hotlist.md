# 热榜

GitHub 热门项目 + arXiv 最新论文，每日更新。

<HotList />

<style>
.hotlist { max-width: 800px; margin: 0 auto; padding: 40px 28px; }

.hotlist-nav {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-bottom: 32px; font-family: var(--font-mono);
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

.hotlist-content { display: flex; flex-direction: column; gap: 40px; }

.hotlist-section {}
.section-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
}
.section-icon { font-size: 20px; }
.section-header h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; color: var(--text); margin: 0; }
.section-desc { font-family: var(--font-mono); font-size: 12px; color: var(--faint); margin-left: auto; }

.rank-list { display: flex; flex-direction: column; gap: 8px; }

.rank-item {
  display: flex; gap: 14px; padding: 14px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  text-decoration: none; color: inherit; transition: all 0.2s;
}
.rank-item:hover { border-color: var(--cyan); transform: translateX(4px); }

.rank-num {
  font-family: var(--font-display); font-size: 20px; font-weight: 900;
  color: var(--faint); min-width: 32px; text-align: center; line-height: 1.4;
}
.rank-num.top3 { color: var(--cyan); }

.rank-content { flex: 1; min-width: 0; }
.rank-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.rank-desc { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rank-meta { display: flex; gap: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--faint); align-items: center; }
.rank-stars { color: var(--gold); }
.rank-lang { padding: 1px 6px; background: var(--card); border-radius: 4px; }

/* 论文特有 */
.rank-item.paper .rank-title { font-size: 14px; }
.rank-authors { font-family: var(--font-mono); font-size: 11px; color: var(--faint); margin-bottom: 4px; }
.rank-cat { padding: 1px 6px; background: var(--cyan-dim); color: var(--cyan); border-radius: 4px; }
.rank-pdf { color: var(--cyan); font-weight: 600; }
.rank-pdf:hover { text-decoration: underline; }

.loading, .empty { text-align: center; padding: 60px; color: var(--faint); font-family: var(--font-mono); }

@media (max-width: 768px) {
  .hotlist { padding: 20px 16px; }
  .rank-item { padding: 12px; }
  .rank-num { font-size: 16px; min-width: 28px; }
  .rank-title { font-size: 14px; }
  .section-desc { display: none; }
}
</style>
