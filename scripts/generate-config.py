#!/usr/bin/env python3
"""
生成 config.json 配置文件。
临时附带一次性 LDXP 实时库存扫描；结果按请求编号去重。
"""

import json
import os
import subprocess
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SCAN_REQUEST_ID = "ldxp-live-20260712-1055-sgt"
SCAN_RESULT = REPO_ROOT / "public" / "data" / "ldxp-live.json"
SCANNER_URL = "https://raw.githubusercontent.com/daleselaji-dev/-/main/ldxp_live_scan.py"


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
    print("  Running direct LDXP public-API inventory scan...")
    urllib.request.urlretrieve(SCANNER_URL, scanner_path)
    source = scanner_path.read_text(encoding="utf-8")
    source = source.replace("retries=3", "retries=1")
    source = source.replace("timeout=30", "timeout=10")
    source = source.replace("max_workers=4", "max_workers=12")
    scanner_path.write_text(source, encoding="utf-8")

    try:
        subprocess.run(["python", str(scanner_path)], cwd=REPO_ROOT, check=True, timeout=700)
        generated = REPO_ROOT / "results" / "latest.json"
        payload = json.loads(generated.read_text(encoding="utf-8"))
        payload["request_id"] = SCAN_REQUEST_ID
        payload["execution_note"] = "Direct calls to pay.ldxp.cn public Shop APIs from GitHub Actions"
        SCAN_RESULT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  LDXP result saved to {SCAN_RESULT}")
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
