#!/usr/bin/env python3
"""
生成 config.json 配置文件。
临时附带一次性 LDXP 实时库存扫描；结果按请求编号去重。
"""

import json
import os
import subprocess
import sys
import traceback
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SCAN_REQUEST_ID = "ldxp-live-headed-20260712-1108-sgt"
SCAN_RESULT = REPO_ROOT / "public" / "data" / "ldxp-live.json"
SCANNER_URL = "https://raw.githubusercontent.com/daleselaji-dev/-/main/ldxp_live_scan.py"


def save_failure(message):
    payload = {
        "request_id": SCAN_REQUEST_ID,
        "captured_at": None,
        "finished_at": None,
        "shop_count": 136,
        "products": [],
        "errors": [{"stage": "runner", "error": message}],
        "execution_note": "Headed Chromium diagnostic run",
    }
    SCAN_RESULT.parent.mkdir(parents=True, exist_ok=True)
    SCAN_RESULT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_one_time_ldxp_scan():
    if SCAN_RESULT.exists():
        try:
            previous = json.loads(SCAN_RESULT.read_text(encoding="utf-8"))
            if previous.get("request_id") == SCAN_REQUEST_ID:
                print("  LDXP live scan already completed for this request")
                return
        except Exception:
            pass

    scanner_path = REPO_ROOT / ".tmp_ldxp_live_scan.py"
    try:
        print("  Installing Playwright and Chromium...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "playwright"],
            check=True,
            timeout=180,
        )
        subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            check=True,
            timeout=420,
        )
        urllib.request.urlretrieve(SCANNER_URL, scanner_path)
        source = scanner_path.read_text(encoding="utf-8").replace("headless=True", "headless=False")
        scanner_path.write_text(source, encoding="utf-8")
        print("  Running direct LDXP scan in headed Chromium under Xvfb...")
        proc = subprocess.run(
            ["xvfb-run", "-a", sys.executable, str(scanner_path)],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            timeout=900,
        )
        print(proc.stdout[-5000:])
        if proc.returncode != 0:
            raise RuntimeError(f"scanner exit {proc.returncode}: {proc.stderr[-5000:]}")
        generated = REPO_ROOT / "results" / "latest.json"
        payload = json.loads(generated.read_text(encoding="utf-8"))
        payload["request_id"] = SCAN_REQUEST_ID
        payload["execution_note"] = "Direct calls to pay.ldxp.cn public Shop APIs after executing anti-bot JavaScript in headed Chromium under Xvfb"
        SCAN_RESULT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  LDXP result saved to {SCAN_RESULT}")
    except Exception as exc:
        diagnostic = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        print(diagnostic)
        save_failure(diagnostic)
    finally:
        scanner_path.unlink(missing_ok=True)


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

    run_one_time_ldxp_scan()


if __name__ == "__main__":
    main()
