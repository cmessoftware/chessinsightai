"""Deprecated import path. Use ``chess_statistics``."""

from __future__ import annotations

import warnings

warnings.warn(
    "lichess_statistics was renamed to chess_statistics",
    DeprecationWarning,
    stacklevel=2,
)

from chess_statistics import *  # noqa: F403
from chess_statistics import __all__  # noqa: F401
