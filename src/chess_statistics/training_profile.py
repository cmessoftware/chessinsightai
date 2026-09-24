"""LS01-020 — layer C training profile from layer A + B reports."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

PROFILE_SCHEMA_VERSION = "1"
MAX_WEAKNESS_FOCI = 3
MAX_SESSION_CANDIDATES = 8
DEFAULT_RECENCY_HALF_LIFE_DAYS = 14
EXCLUDED_SPEEDS = ("blitz", "bullet")
ALLOWED_USE_EXPLAIN = "explain"

_PHASE_LABELS = {
    "opening": "Opening",
    "middlegame": "Middlegame",
    "endgame": "Endgame",
}


def _parse_date(value: str | None) -> date | None:
    text = str(value or "").strip()
    if len(text) < 10:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def recency_weight(
    event_date: str | None,
    *,
    until: str | None,
    half_life_days: int = DEFAULT_RECENCY_HALF_LIFE_DAYS,
) -> float:
    """Exponential decay: recent events weigh more (1.0 at ``until``)."""
    end = _parse_date(until) or date.today()
    when = _parse_date(event_date)
    if when is None:
        return 0.5
    age_days = max(0, (end - when).days)
    if half_life_days <= 0:
        return 1.0
    return 0.5 ** (age_days / half_life_days)


def _judgment_criticality(judgment: str | None) -> float:
    if judgment == "Blunder":
        return 1.0
    if judgment == "Mistake":
        return 0.75
    if judgment == "Inaccuracy":
        return 0.45
    return 0.35


def event_criticality(event: dict[str, Any]) -> float:
    loss = event.get("eval_loss_cp")
    try:
        cp = max(0, int(loss))
    except (TypeError, ValueError):
        cp = 0
    cp_factor = min(1.0, cp / 400.0)
    return max(cp_factor, _judgment_criticality(event.get("judgment")))


def score_event(event: dict[str, Any], *, until: str | None) -> float:
    return event_criticality(event) * recency_weight(event.get("fecha"), until=until)


def _focus_key(event: dict[str, Any]) -> str:
    phase = str(event.get("phase") or "unknown").strip().lower() or "unknown"
    return f"phase:{phase}"


def build_weaknesses(
    events: list[dict[str, Any]],
    *,
    until: str | None,
    max_foci: int = MAX_WEAKNESS_FOCI,
) -> list[dict[str, Any]]:
    if not events:
        return []
    groups: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        groups.setdefault(_focus_key(event), []).append(event)

    scored: list[dict[str, Any]] = []
    total = len(events)
    for key, group in groups.items():
        phase = key.split(":", 1)[-1]
        frequency = len(group) / total
        criticality = sum(event_criticality(item) for item in group) / len(group)
        recency = sum(recency_weight(item.get("fecha"), until=until) for item in group) / len(group)
        score = frequency * criticality * recency
        losses = [int(item["eval_loss_cp"]) for item in group if item.get("eval_loss_cp") is not None]
        scored.append(
            {
                "focus_id": key,
                "phase": phase,
                "label": _PHASE_LABELS.get(phase, phase.replace("_", " ").title()),
                "score": round(score, 4),
                "event_count": len(group),
                "mean_eval_loss_cp": round(sum(losses) / len(losses), 1) if losses else None,
                "components": {
                    "frequency": round(frequency, 4),
                    "criticality": round(criticality, 4),
                    "recency": round(recency, 4),
                },
            }
        )
    scored.sort(key=lambda item: (-float(item["score"]), -int(item["event_count"])))
    for index, item in enumerate(scored[:max_foci], start=1):
        item["rank"] = index
    return scored[:max_foci]


def build_candidate_positions(
    events: list[dict[str, Any]],
    *,
    until: str | None,
    max_candidates: int = MAX_SESSION_CANDIDATES,
) -> list[dict[str, Any]]:
    ranked: list[tuple[float, dict[str, Any]]] = []
    for event in events:
        ranked.append((score_event(event, until=until), event))
    ranked.sort(key=lambda pair: (-pair[0], str(pair[1].get("fecha") or ""), int(pair[1].get("ply") or 0)))

    seen: set[tuple[str, int]] = set()
    out: list[dict[str, Any]] = []
    for event_score, event in ranked:
        game_id = str(event.get("game_id") or "")
        ply = int(event.get("ply") or 0)
        key = (game_id, ply)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "rank": len(out) + 1,
                "priority_score": round(event_score, 4),
                "game_id": game_id,
                "url": event.get("url"),
                "fecha": event.get("fecha"),
                "ply": ply,
                "fen_before": event.get("fen_before"),
                "move_san": event.get("move_san"),
                "phase": event.get("phase"),
                "judgment": event.get("judgment"),
                "eval_loss_cp": event.get("eval_loss_cp"),
                "tactical_motifs": list(event.get("tactical_motifs") or []),
                "endgame_signature": event.get("endgame_signature"),
                "allowed_uses": [ALLOWED_USE_EXPLAIN],
            }
        )
        if len(out) >= max_candidates:
            break
    return out


def build_training_profile(
    username: str,
    report: dict[str, Any],
    *,
    generated_at: datetime | None = None,
) -> dict[str, Any]:
    """Layer C JSON from an aggregate report that already includes layers A and B."""
    layer_b = report.get("learning_events") or {}
    events = list(layer_b.get("events") or [])
    until = (report.get("period") or {}).get("until")
    weaknesses = build_weaknesses(events, until=until)
    candidates = build_candidate_positions(events, until=until)
    when = generated_at or datetime.now().astimezone()
    return {
        "schema_version": PROFILE_SCHEMA_VERSION,
        "layer": "C",
        "generated_at": when.isoformat(timespec="seconds"),
        "usuario": username,
        "track": report.get("track"),
        "training_only": bool(report.get("training_only")),
        "period": report.get("period"),
        "rating_series": report.get("rating_evolution") or [],
        "weaknesses": weaknesses,
        "candidate_positions": candidates,
        "provenance": {
            "module": "chess_statistics",
            "feature_id": "LS01-020",
            "excluded_speeds": list(EXCLUDED_SPEEDS),
            "drop_threshold_cp": layer_b.get("drop_threshold_cp"),
            "n_learning_events": layer_b.get("n_events"),
        },
    }


def entrenamiento_sheet_tables(profile: dict[str, Any]) -> tuple[list[str], list[list[Any]], list[str], list[list[Any]]]:
    """Return (foci_headers, foci_rows, session_headers, session_rows) for Excel."""
    foci_headers = ["Prioridad", "Foco", "Fase", "Puntuación", "Eventos", "Pérdida media (cp)"]
    foci_rows: list[list[Any]] = []
    for item in profile.get("weaknesses") or []:
        foci_rows.append(
            [
                item.get("rank"),
                item.get("label"),
                item.get("phase"),
                item.get("score"),
                item.get("event_count"),
                item.get("mean_eval_loss_cp"),
            ]
        )

    session_headers = ["#", "FEN", "Jugada", "Fase", "Juicio", "Pérdida (cp)", "Partida"]
    session_rows: list[list[Any]] = []
    for item in profile.get("candidate_positions") or []:
        session_rows.append(
            [
                item.get("rank"),
                item.get("fen_before"),
                item.get("move_san"),
                item.get("phase"),
                item.get("judgment"),
                item.get("eval_loss_cp"),
                item.get("url"),
            ]
        )
    return foci_headers, foci_rows, session_headers, session_rows
