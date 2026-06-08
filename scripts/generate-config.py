#!/usr/bin/env python3
"""
生成 config.json 配置文件

根据环境变量判断是否启用 Remark42，生成前端配置文件。

环境变量：
  REMARK42_URL  — Remark42 服务地址（为空则禁用）
  REMARK42_SITE — Remark42 site ID（默认 default）

输出：
  public/data/config.json
"""

import json
import os
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent


def main():
    print("=== Config Generator ===\n")

    remark42_url = os.environ.get("REMARK42_URL", "").strip()
    remark42_site = os.environ.get("REMARK42_SITE", "default")

    config = {
        "remark42": {
            "enabled": bool(remark42_url),
            "url": remark42_url,
            "site": remark42_site
        }
    }

    output_dir = REPO_ROOT / "public" / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    out_file = output_dir / "config.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

    status = "ENABLED" if config["remark42"]["enabled"] else "DISABLED"
    print(f"  Remark42: {status}")
    print(f"  Saved to {out_file}")


if __name__ == "__main__":
    main()
