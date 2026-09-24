"""LS01-014 — read-only aggregates over stored SQLite stats."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from chess_statistics.db import StatisticsRepository
from chess_statistics.learning_events import collect_learning_events, summarize_learning_events
from chess_statistics.ratings import infer_ranking_final_chain
from chess_statistics.training_profile import build_training_profile
from chess_statistics.training_track import TRAINING_TRACKS, filter_training_rows

RESULT_WIN = "G"
RESULT_DRAW = "T"
RESULT_LOSS = "P"


def _finite(values: list[Any]) -> list[float]:
    out: list[float] = []
    for value in values:
        if value is None:
            continue
        try:
            out.append(float(value))
        except (TypeError, ValueError):
            continue
    return out


def mean_with_n(values: list[Any]) -> dict[str, Any]:
    nums = _finite(values)
    if not nums:
        return {"mean": None, "n": 0}
    return {"mean": sum(nums) / len(nums), "n": len(nums)}


def _period(rows: list[dict[str, Any]]) -> dict[str, Any]:
    dates = [str(row["fecha"]) for row in rows if row.get("fecha")]
    return {
        "since": min(dates) if dates else None,
        "until": max(dates) if dates else None,
        "n_games": len(rows),
    }


def _result_counts(rows: list[dict[str, Any]]) -> dict[str, int]:
    counts = {RESULT_WIN: 0, RESULT_DRAW: 0, RESULT_LOSS: 0}
    for row in rows:
        key = row.get("resultado")
        if key in counts:
            counts[key] += 1
    return counts


def _metrics_block(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Game-level means; precision/ACPL ``n`` can be below ``n_games`` if evals are missing."""
    return {
        "n_games": len(rows),
        "results": _result_counts(rows),
        "precision_general": mean_with_n([g.get("precision_general") for g in rows]),
        "perdida_promedio_cp": mean_with_n([g.get("perdida_promedio_cp") for g in rows]),
        "precision_apertura": mean_with_n([g.get("precision_apertura") for g in rows]),
        "precision_medio_juego": mean_with_n([g.get("precision_medio_juego") for g in rows]),
        "precision_final": mean_with_n([g.get("precision_final") for g in rows]),
    }


def _by_phase(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Phase accuracies over the same game cohort (not a second engine)."""
    return {
        "opening": {
            "n_games": len(rows),
            "precision": mean_with_n([g.get("precision_apertura") for g in rows]),
        },
        "middlegame": {
            "n_games": len(rows),
            "precision": mean_with_n([g.get("precision_medio_juego") for g in rows]),
        },
        "endgame": {
            "n_games": len(rows),
            "precision": mean_with_n([g.get("precision_final") for g in rows]),
        },
    }


def summarize_rows(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Means skip nulls; ``n`` is the count used in that mean, plus period n_games."""
    period = _period(rows)
    by_color: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_opening: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_month: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        color = str(row.get("color") or "") or "unknown"
        by_color[color].append(row)
        opening = str(row.get("apertura") or "").strip() or "(sin apertura)"
        by_opening[opening].append(row)
        fecha = str(row.get("fecha") or "")
        month = fecha[:7] if len(fecha) >= 7 else "(sin fecha)"
        by_month[month].append(row)

    def group_block(groups: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
        return {key: _metrics_block(group) for key, group in sorted(groups.items())}

    metrics = _metrics_block(rows)
    return {
        "layer": "A",
        "period": period,
        "rating_evolution": [
            {
                "fecha": row.get("fecha"),
                "lichess_id": row.get("lichess_id"),
                "ranking_inicial": row.get("ranking_inicial"),
                "ranking_final": row.get("ranking_final"),
                "track": row.get("track"),
            }
            for row in rows
        ],
        "precision_general": metrics["precision_general"],
        "perdida_promedio_cp": metrics["perdida_promedio_cp"],
        "precision_apertura": metrics["precision_apertura"],
        "precision_medio_juego": metrics["precision_medio_juego"],
        "precision_final": metrics["precision_final"],
        "by_phase": _by_phase(rows),
        "judgments": {
            "imprecisiones": mean_with_n([row.get("imprecisiones") for row in rows]),
            "errores": mean_with_n([row.get("errores") for row in rows]),
            "errores_graves": mean_with_n([row.get("errores_graves") for row in rows]),
            "totals": {
                "imprecisiones": int(sum(_finite([row.get("imprecisiones") for row in rows]))),
                "errores": int(sum(_finite([row.get("errores") for row in rows]))),
                "errores_graves": int(sum(_finite([row.get("errores_graves") for row in rows]))),
                "n": len(_finite([row.get("imprecisiones") for row in rows])),
            },
        },
        "results": metrics["results"],
        "by_color": group_block(by_color),
        "by_opening": group_block(by_opening),
        "by_month": group_block(by_month),
    }


class AggregateQueryService:
    """Read-only queries; no engine, no HTTP."""

    def __init__(self, repo: StatisticsRepository) -> None:
        self._repo = repo

    def rows(
        self,
        username: str,
        *,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        last_n: int | None = None,
        track: str | None = None,
        training_only: bool = False,
    ) -> list[dict[str, Any]]:
        rows = self._repo.list_games_with_stats(
            usuario=username,
            since=since,
            until=until,
            ritmo=ritmo,
        )
        rows = filter_training_rows(rows, track=track, training_only=training_only)
        if last_n is not None:
            if last_n < 1:
                raise ValueError("last_n must be >= 1")
            rows = rows[-last_n:]
        rows = infer_ranking_final_chain(rows)
        return rows

    def report(
        self,
        username: str,
        *,
        since: str | None = None,
        until: str | None = None,
        ritmo: str | None = None,
        last_n: int | None = None,
        track: str | None = None,
        training_only: bool = False,
    ) -> dict[str, Any]:
        rows = self.rows(
            username,
            since=since,
            until=until,
            ritmo=ritmo,
            last_n=last_n,
            track=track,
            training_only=training_only,
        )
        payload = summarize_rows(rows)
        payload["track"] = track
        payload["training_only"] = bool(training_only or track)
        payload["by_track"] = {
            name: summarize_rows([row for row in rows if row.get("track") == name])
            for name in TRAINING_TRACKS
            if any(row.get("track") == name for row in rows)
        }
        events = collect_learning_events(self._repo, rows)
        payload["learning_events"] = summarize_learning_events(events)
        if training_only or track:
            payload["training_profile"] = build_training_profile(username, payload)
        return payload

    def compare_periods(
        self,
        username: str,
        *,
        period_a: tuple[str | None, str | None],
        period_b: tuple[str | None, str | None],
        ritmo: str | None = None,
        track: str | None = None,
        training_only: bool = False,
    ) -> dict[str, Any]:
        a_since, a_until = period_a
        b_since, b_until = period_b
        return {
            "period_a": self.report(
                username,
                since=a_since,
                until=a_until,
                ritmo=ritmo,
                track=track,
                training_only=training_only,
            ),
            "period_b": self.report(
                username,
                since=b_since,
                until=b_until,
                ritmo=ritmo,
                track=track,
                training_only=training_only,
            ),
        }
