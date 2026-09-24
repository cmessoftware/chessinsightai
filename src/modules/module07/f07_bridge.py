"""Import path for F07 course analysis packages."""

from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def course_root() -> Path:
    return Path(__file__).resolve().parents[3] / "docs" / "ai_chess_coach_course"


def ensure_f07_import_path() -> Path:
    root = course_root()
    text = str(root)
    if text not in sys.path:
        sys.path.insert(0, text)
    return root
