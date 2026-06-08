#!/usr/bin/env python3
"""
新闻爬虫脚本 — 从 FounderKit API 获取中文 AI 日报

数据来源: https://founderkit.md
- 免费公开 API，无需认证
- 默认中文，AI 已生成摘要
- 覆盖：Twitter KOL + HN + AI Lab 博客 + GitHub Trending

输出: public/data/news/{date}.json
"""

import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

try:
    import requests
except ImportError:
    print("requests not installed. Run: pip install requests")
    sys.exit(1)

REPO_ROOT = Path(__file__).parent.parent
NEWS_DIR = REPO_ROOT / "public" / "data" / "news"

FOUNDERKIT_API = "https://founderkit.md/api/data"
FOUNDERKIT_DIGEST = "https://founderkit.md/api/digest/once"


def fetch_raw_data():
    """获取原始数据"""
    print("  Fetching from FounderKit API...")
    try:
        resp = requests.get(f"{FOUNDERKIT_API}?lang=zh&hours=24", timeout=30)
        resp.raise_for_status()
        data = resp.json()
        print(f"    tweets: {len(data.get('tweets', []))}")
        print(f"    hn_stories: {len(data.get('hn_stories', []))}")
        print(f"    blogs: {len(data.get('blogs', []))}")
        print(f"    github_trending: {len(data.get('github_trending', []))}")
        return data
    except Exception as e:
        print(f"    Failed: {e}")
        return None


def fetch_digest():
    """获取 AI 日报"""
    print("  Fetching AI digest...")
    try:
        resp = requests.get(FOUNDERKIT_DIGEST, timeout=60)
        resp.raise_for_status()
        data = resp.json()
        text = data.get('text', '')
        print(f"    Digest length: {len(text)} chars")
        return text
    except Exception as e:
        print(f"    Failed: {e}")
        return ""


def extract_articles(raw_data):
    """从原始数据提取文章列表"""
    articles = []

    # HN stories
    for h in raw_data.get('hn_stories', []):
        articles.append({
            'title': h.get('title', ''),
            'summary': '',
            'category': '技术',
            'source': 'Hacker News',
            'link': h.get('url', h.get('hn_url', '')),
            'score': h.get('score', 0),
        })

    # Blog posts
    for b in raw_data.get('blogs', []):
        blog_name = b.get('name', 'Blog')
        for p in b.get('posts', []):
            articles.append({
                'title': p.get('title', ''),
                'summary': p.get('summary', ''),
                'category': 'AI',
                'source': blog_name,
                'link': p.get('url', ''),
            })

    # GitHub trending
    for g in raw_data.get('github_trending', []):
        articles.append({
            'title': g.get('title', ''),
            'summary': g.get('summary', ''),
            'category': '开源',
            'source': 'GitHub Trending',
            'link': g.get('url', ''),
        })

    # Tweets (合并每个 KOL 的推文)
    for t in raw_data.get('tweets', []):
        handle = t.get('handle', '')
        name = t.get('name', handle)
        for tweet in t.get('tweets', [])[:3]:
            articles.append({
                'title': f"@{handle}: {tweet.get('text', '')[:60]}",
                'summary': tweet.get('text', ''),
                'category': 'Twitter',
                'source': name,
                'link': tweet.get('url', ''),
            })

    return articles


def save_news(articles, digest, today=None):
    """保存新闻到 JSON"""
    if today is None:
        today = date.today()

    NEWS_DIR.mkdir(parents=True, exist_ok=True)

    data = {
        'date': today.isoformat(),
        'generated': datetime.now().isoformat(),
        'source': 'founderkit.md',
        'digest': digest,
        'count': len(articles),
        'articles': articles,
    }

    out_file = NEWS_DIR / f"{today.isoformat()}.json"
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n  Saved to {out_file}")
    return out_file


def main():
    print("=== News Crawler (FounderKit) ===\n")

    # 获取数据
    raw = fetch_raw_data()
    if not raw:
        print("Failed to fetch data. Exiting.")
        sys.exit(1)

    digest = fetch_digest()

    # 提取文章
    articles = extract_articles(raw)
    print(f"\n  Total articles: {len(articles)}")

    # 保存
    save_news(articles, digest)

    # 打印摘要
    print(f"\n=== Today's News ({len(articles)} articles) ===")
    for i, a in enumerate(articles[:8], 1):
        cat = a.get('category', '?')
        title = a.get('title', '?')[:60]
        print(f"  {i}. [{cat}] {title}")


if __name__ == '__main__':
    main()
