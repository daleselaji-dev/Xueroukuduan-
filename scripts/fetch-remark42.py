#!/usr/bin/env python3
"""
Remark42 数据抓取脚本

从 Remark42 API 获取评论数据，保存为 JSON 文件。
仅当环境变量 REMARK42_URL 存在时运行。

环境变量：
  REMARK42_URL  — Remark42 服务地址（如 https://remark42.example.com）
  REMARK42_SITE — Remark42 site ID（默认 default）

输出：
  public/data/forum/remark42.json
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


def main():
    print("=== Remark42 Fetcher ===\n")

    remark42_url = os.environ.get("REMARK42_URL", "").strip()
    if not remark42_url:
        print("  No REMARK42_URL configured, nothing to do.")
        return

    site = os.environ.get("REMARK42_SITE", "default")
    output_dir = REPO_ROOT / "public" / "data" / "forum"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 获取评论
    url = f"{remark42_url}/api/v1/last/100?site={site}"
    try:
        import requests
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        comments = data.get("comments", [])
        print(f"  Got {len(comments)} comments from Remark42")
    except ImportError:
        print("  requests not installed, skipping.")
        return
    except Exception as e:
        print(f"  Failed to fetch Remark42: {e}")
        return

    # 保存
    out_data = {
        "source": "remark42",
        "url": remark42_url,
        "fetchedAt": datetime.now().isoformat(),
        "comments": comments
    }

    out_file = output_dir / "remark42.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, indent=2)

    print(f"  Saved to {out_file}")


if __name__ == "__main__":
    main()
