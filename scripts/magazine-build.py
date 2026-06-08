#!/usr/bin/env python3
"""
杂志构建脚本 — 将 submissions 和 discussions 按周聚合为杂志 JSON

输出:
  public/data/magazine/index.json     — 期目录
  public/data/magazine/{year}-W{week}.json — 单期内容
"""

import json
import os
import re
from datetime import datetime, date
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SUBMISSIONS_DIR = REPO_ROOT / "submissions"
NEWS_DIR = REPO_ROOT / "public" / "data" / "news"
MAGAZINE_DIR = REPO_ROOT / "public" / "data" / "magazine"


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """解析 markdown frontmatter"""
    match = re.match(r'^---\n([\s\S]*?)\n---\n?([\s\S]*)$', content)
    if not match:
        return {}, content

    fm_text = match[1]
    body = match[2]

    fm = {}
    for line in fm_text.strip().split('\n'):
        m = re.match(r'^(\w+):\s*(.+)$', line)
        if m:
            key, val = m.group(1), m.group(2).strip().strip('"').strip("'")
            if key == 'tags':
                # 解析 [tag1, tag2] 格式
                arr_match = re.match(r'\[([^\]]+)\]', val)
                if arr_match:
                    fm[key] = [s.strip().strip('"').strip("'") for s in arr_match[1].split(',')]
                else:
                    fm[key] = [val]
            else:
                fm[key] = val

    return fm, body.strip()


def get_iso_week(date_str: str) -> tuple[int, int]:
    """从日期字符串获取 (year, week_number)"""
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d").date()
        iso = d.isocalendar()
        return iso[0], iso[1]
    except:
        return 0, 0


def get_week_date_range(year: int, week: int) -> str:
    """获取某周的日期范围字符串（使用 ISO 标准）"""
    try:
        from datetime import timedelta
        # ISO 标准：1月4日所在的周一定是 week 1
        jan4 = date(year, 1, 4)
        # 找到 week 1 的周一
        week1_monday = jan4 - timedelta(days=jan4.weekday())
        # 计算目标周的周一
        target_monday = week1_monday + timedelta(weeks=week - 1)
        target_sunday = target_monday + timedelta(days=6)
        return f"{target_monday.month}月{target_monday.day}日 – {target_sunday.month}月{target_sunday.day}日"
    except:
        return f"第{week}周"


def get_week_label(year: int, week: int) -> str:
    """获取期标签"""
    try:
        from datetime import timedelta
        # ISO 标准：1月4日所在的周一定是 week 1
        jan4 = date(year, 1, 4)
        week1_monday = jan4 - timedelta(days=jan4.weekday())
        target_monday = week1_monday + timedelta(weeks=week - 1)
        month_names = ['', '一月', '二月', '三月', '四月', '五月', '六月',
                       '七月', '八月', '九月', '十月', '十一月', '十二月']
        month_name = month_names[target_monday.month]
        # 计算是该月第几周
        first_of_month = date(target_monday.year, target_monday.month, 1)
        week_of_month = (target_monday.day + first_of_month.weekday()) // 7 + 1
        return f"第{week}期 · {month_name}第{week_of_month}周"
    except:
        return f"第{week}期"


def scan_submissions() -> dict:
    """扫描所有投稿，按 ISO 周分组"""
    weeks = {}

    if not SUBMISSIONS_DIR.exists():
        return weeks

    for folder in sorted(SUBMISSIONS_DIR.iterdir()):
        if not folder.is_dir() or folder.name.startswith('_'):
            continue

        index_path = folder / "index.md"
        if not index_path.exists():
            continue

        content = index_path.read_text(encoding='utf-8')
        fm, body = parse_frontmatter(content)

        date_str = fm.get('date', '')
        # 从文件夹名提取日期作为 fallback
        if not date_str:
            date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', folder.name)
            if date_match:
                date_str = date_match.group(1)

        year, week = get_iso_week(date_str)
        if year == 0:
            continue

        key = f"{year}-W{week:02d}"
        if key not in weeks:
            weeks[key] = {
                'year': year,
                'week': week,
                'submissions': [],
                'discussions': []
            }

        weeks[key]['submissions'].append({
            'folder': folder.name,
            'title': fm.get('title', folder.name),
            'author': fm.get('author', 'Unknown'),
            'date': date_str,
            'summary': fm.get('summary', ''),
            'tags': fm.get('tags', []),
            'license': fm.get('license', ''),
            'body': body
        })

    return weeks


def scan_discussions() -> dict:
    """扫描 discussions.json，按 ISO 周分组"""
    weeks = {}
    disc_path = REPO_ROOT / "public" / "data" / "discussions.json"

    if not disc_path.exists():
        return weeks

    try:
        with open(disc_path, encoding='utf-8') as f:
            data = json.load(f)

        for d in data.get('discussions', []):
            date_str = d.get('date', '')
            if not date_str:
                continue

            # 处理 ISO 格式日期
            try:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                date_str = dt.strftime('%Y-%m-%d')
            except:
                pass

            year, week = get_iso_week(date_str)
            if year == 0:
                continue

            key = f"{year}-W{week:02d}"
            if key not in weeks:
                weeks[key] = {
                    'year': year,
                    'week': week,
                    'submissions': [],
                    'discussions': []
                }

            weeks[key]['discussions'].append({
                'id': d.get('id', 0),
                'title': d.get('title', ''),
                'author': d.get('author', ''),
                'category': d.get('category', 'General'),
                'categoryEmoji': d.get('categoryEmoji', '💬'),
                'summary': d.get('body', '')[:200],
                'comments': d.get('comments', 0),
                'url': d.get('url', '')
            })
    except Exception as e:
        print(f"Failed to parse discussions.json: {e}")

    return weeks


def scan_news(year: int, week: int) -> list:
    """获取指定周的每日新闻"""
    news = []

    if not NEWS_DIR.exists():
        return news

    try:
        from datetime import timedelta
        jan1 = date(year, 1, 1)
        first_monday = jan1
        while first_monday.weekday() != 0:
            first_monday = date.fromordinal(first_monday.toordinal() + 1)
        target_monday = first_monday + timedelta(weeks=week - 1)

        for i in range(7):
            d = target_monday + timedelta(days=i)
            news_file = NEWS_DIR / f"{d.isoformat()}.json"
            if news_file.exists():
                with open(news_file, encoding='utf-8') as f:
                    data = json.load(f)
                    for article in data.get('articles', []):
                        article['date'] = d.isoformat()
                        news.append(article)
    except Exception as e:
        print(f"Failed to scan news: {e}")

    return news


def build_magazine():
    """构建杂志 JSON 文件"""
    MAGAZINE_DIR.mkdir(parents=True, exist_ok=True)

    # 扫描数据
    sub_weeks = scan_submissions()
    disc_weeks = scan_discussions()

    # 合并所有周
    all_keys = set(sub_weeks.keys()) | set(disc_weeks.keys())

    if not all_keys:
        print("No content found. Skipping magazine build.")
        return

    issues = []

    for key in sorted(all_keys, reverse=True):
        year_week = key.split('-W')
        year = int(year_week[0])
        week = int(year_week[1])

        submissions = sub_weeks.get(key, {}).get('submissions', [])
        discussions = disc_weeks.get(key, {}).get('discussions', [])
        news = scan_news(year, week)

        issue = {
            'id': key,
            'label': get_week_label(year, week),
            'dateRange': get_week_date_range(year, week),
            'year': year,
            'month': 0,  # 会在下面计算
            'week': week,
            'submissions': submissions,
            'discussions': discussions,
            'weeklyNews': news
        }

        # 计算月份（取该周周一的月份）
        try:
            from datetime import timedelta
            jan1 = date(year, 1, 1)
            first_monday = jan1
            while first_monday.weekday() != 0:
                first_monday = date.fromordinal(first_monday.toordinal() + 1)
            target_monday = first_monday + timedelta(weeks=week - 1)
            issue['month'] = target_monday.month
        except:
            pass

        # 保存单期 JSON
        issue_file = MAGAZINE_DIR / f"{key}.json"
        with open(issue_file, 'w', encoding='utf-8') as f:
            json.dump(issue, f, ensure_ascii=False, indent=2)
        print(f"Built: {key}.json ({len(submissions)} submissions, {len(discussions)} discussions, {len(news)} news)")

        # 用于 index 的摘要（不含 body）
        issues.append({
            'id': key,
            'year': year,
            'month': issue['month'],
            'week': week,
            'label': issue['label'],
            'dateRange': issue['dateRange'],
            'count': {
                'submissions': len(submissions),
                'discussions': len(discussions),
                'news': len(news)
            }
        })

    # 生成 index.json
    index = {
        'generated': datetime.now().isoformat(),
        'totalIssues': len(issues),
        'issues': issues
    }

    index_file = MAGAZINE_DIR / "index.json"
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"\nBuilt index.json with {len(issues)} issues")


if __name__ == '__main__':
    build_magazine()
