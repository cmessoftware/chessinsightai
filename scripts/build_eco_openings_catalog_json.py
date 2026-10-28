#!/usr/bin/env python3
"""Build frontend ECO catalog from lichess-org/chess-openings (CC0)."""

from __future__ import annotations

import csv
import io
import json
import urllib.request
from pathlib import Path

REPO = "https://raw.githubusercontent.com/lichess-org/chess-openings/master"
ROOT = Path(__file__).resolve().parents[1]
LOCAL_TSV = ROOT / ".tmp_eco"
OUT = ROOT / "src" / "frontend" / "public" / "config" / "eco_openings.v1.json"


def _read_tsv(vol: str) -> csv.DictReader:
    local = LOCAL_TSV / f"{vol}.tsv"
    if local.is_file():
        handle = local.open(encoding="utf-8")
    else:
        url = f"{REPO}/{vol}.tsv"
        with urllib.request.urlopen(url, timeout=120) as resp:
            text = resp.read().decode("utf-8")
        handle = io.StringIO(text)
    return csv.DictReader(handle, delimiter="\t")


def main() -> None:
    seen: set[tuple[str, str]] = set()
    openings: list[dict[str, str]] = []
    for vol in "abcde":
        reader = _read_tsv(vol)
        for row in reader:
            eco = (row.get("eco") or "").strip().upper()
            name = (row.get("name") or "").strip()
            if not eco or not name:
                continue
            key = (eco, name)
            if key in seen:
                continue
            seen.add(key)
            openings.append({"eco": eco, "name": name})
    openings.sort(key=lambda x: (x["eco"], x["name"]))
    payload = {
        "meta": {
            "version": 1,
            "source": "https://github.com/lichess-org/chess-openings",
            "license": "CC0-1.0",
            "entry_count": len(openings),
        },
        "openings": openings,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(openings)} openings to {OUT}")


if __name__ == "__main__":
    main()
