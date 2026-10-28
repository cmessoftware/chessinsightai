"""Cache key con historial completo (arch §4, SPAR-03)."""

from __future__ import annotations

import hashlib


def build_maia_cache_key(
    *,
    provider: str,
    model_version: str | None,
    fen: str,
    uci_history: tuple[str, ...],
    self_rating: int,
    opponent_rating: int,
) -> str:
    parts = (
        provider,
        model_version or "",
        fen,
        ",".join(uci_history),
        str(self_rating),
        str(opponent_rating),
    )
    digest = hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()
    return digest
