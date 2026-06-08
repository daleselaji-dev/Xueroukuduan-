#!/usr/bin/env python3
"""
热榜爬虫 — GitHub Trending + arXiv 热门论文

数据来源：
  - GitHub Trending: 通过 GitHub API 搜索最近创建的高星项目
  - arXiv: 通过 arXiv API 获取最新 AI/ML 论文

输出：
  public/data/hotlist/{date}.json   — 当日热榜
  public/data/hotlist/index.json    — 热榜目录
"""

import json
import os
import sys
from datetime import datetime, date, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET

try:
    import requests
except ImportError:
    print("requests not installed. Run: pip install requests")
    sys.exit(1)

REPO_ROOT = Path(__file__).parent.parent
HOTLIST_DIR = REPO_ROOT / "public" / "data" / "hotlist"


def fetch_github_trending(limit=20):
    """获取 GitHub 热门项目（最近7天创建的高星项目）"""
    print("  Fetching GitHub trending...")
    since = (date.today() - timedelta(days=7)).isoformat()
    url = f"https://api.github.com/search/repositories?q=created:>{since}&sort=stars&order=desc&per_page={limit}"
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.environ.get("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        repos = []
        for i, repo in enumerate(data.get("items", [])[:limit], 1):
            repos.append({
                "rank": i,
                "name": repo["full_name"],
                "description": (repo.get("description") or "")[:200],
                "stars": repo["stargazers_count"],
                "language": repo.get("language", ""),
                "url": repo["html_url"],
                "created": repo["created_at"][:10],
            })
        print(f"    Got {len(repos)} repos")
        return repos
    except Exception as e:
        print(f"    Failed: {e}")
        return []


def fetch_arxiv_papers(category="cs.AI", limit=20):
    """获取 arXiv 最新热门论文"""
    print(f"  Fetching arXiv papers ({category})...")
    url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": f"cat:{category}",
        "start": 0,
        "max_results": limit,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }

    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        # 解析 Atom XML
        ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
        root = ET.fromstring(resp.text)
        papers = []
        for i, entry in enumerate(root.findall("atom:entry", ns), 1):
            title = entry.find("atom:title", ns)
            summary = entry.find("atom:summary", ns)
            link = entry.find("atom:id", ns)
            published = entry.find("atom:published", ns)
            authors = entry.findall("atom:author", ns)
            author_names = []
            for a in authors:
                name_el = a.find("atom:name", ns)
                if name_el is not None and name_el.text:
                    author_names.append(name_el.text)

            # 获取 PDF 链接
            pdf_link = ""
            for l in entry.findall("atom:link", ns):
                if l.get("title") == "pdf":
                    pdf_link = l.get("href", "")

            papers.append({
                "rank": i,
                "title": title.text.strip().replace("\n", " ") if title is not None and title.text else "",
                "authors": author_names[:5],
                "summary": (summary.text.strip()[:300] if summary is not None and summary.text else ""),
                "url": link.text.strip() if link is not None and link.text else "",
                "pdf": pdf_link,
                "published": published.text[:10] if published is not None and published.text else "",
                "category": category,
            })
        print(f"    Got {len(papers)} papers")
        return papers
    except Exception as e:
        print(f"    Failed: {e}")
        return []


def save_hotlist(github, arxiv, today=None):
    """保存热榜"""
    if today is None:
        today = date.today()

    HOTLIST_DIR.mkdir(parents=True, exist_ok=True)

    data = {
        "date": today.isoformat(),
        "generated": datetime.now().isoformat(),
        "github": {
            "title": "GitHub 热门项目",
            "description": "最近7天新建的高星项目",
            "items": github,
        },
        "arxiv": {
            "title": "arXiv 最新论文",
            "description": "cs.AI 分类最新提交",
            "items": arxiv,
        },
    }

    # 保存当日热榜
    out_file = HOTLIST_DIR / f"{today.isoformat()}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 更新 index.json（保留最近30天）
    index_file = HOTLIST_DIR / "index.json"
    index = {"generated": datetime.now().isoformat(), "dates": []}
    if index_file.exists():
        try:
            with open(index_file, encoding="utf-8") as f:
                index = json.load(f)
        except:
            pass

    dates = set(index.get("dates", []))
    dates.add(today.isoformat())
    # 只保留最近30天
    cutoff = (today - timedelta(days=30)).isoformat()
    dates = sorted([d for d in dates if d >= cutoff], reverse=True)
    index["dates"] = dates
    index["latest"] = today.isoformat()

    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n  Saved to {out_file}")
    return out_file


def main():
    print("=== Hotlist Crawler ===\n")

    github = fetch_github_trending(limit=20)
    arxiv = fetch_arxiv_papers(category="cs.AI", limit=20)
    # 也抓 cs.LG
    arxiv_ml = fetch_arxiv_papers(category="cs.LG", limit=10)
    # 合并去重
    seen = set()
    merged = []
    for p in arxiv + arxiv_ml:
        key = p["url"]
        if key not in seen:
            seen.add(key)
            merged.append(p)
    # 重新编号
    for i, p in enumerate(merged, 1):
        p["rank"] = i

    save_hotlist(github, merged[:30])

    # 打印摘要
    print(f"\n=== Hotlist ({date.today()}) ===")
    print(f"\nGitHub Top 5:")
    for r in github[:5]:
        print(f"  {r['rank']}. {r['name']} ⭐{r['stars']} - {r['description'][:40]}")
    print(f"\narXiv Top 5:")
    for p in merged[:5]:
        print(f"  {p['rank']}. {p['title'][:60]}")


if __name__ == "__main__":
    main()
