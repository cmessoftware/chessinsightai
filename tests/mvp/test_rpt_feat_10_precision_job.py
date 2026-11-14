"""RPT-FEAT-10 — missing precision is calculated off the request, then notified."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[2]
for path in (ROOT / "src", ROOT / "src" / "api"):
    if str(path) not in sys.path:
        sys.path.insert(0, str(path))

from modules.module07.precision_job import (  # noqa: E402
    calculation_succeeded,
    notification_fields,
    summarize_calculations,
)


def _result(stored=True, ply_count=4):
    return SimpleNamespace(stored=stored, ply_count=ply_count)


def test_a_stored_zero_with_plies_counts_as_calculated():
    assert calculation_succeeded(_result(), {"precision_general": 0.0, "precision_final": None})


def test_a_row_without_plies_or_precision_does_not_count_as_calculated():
    assert not calculation_succeeded(_result(ply_count=0), {"precision_general": 0.0})
    assert not calculation_succeeded(_result(), {"precision_general": None})
    assert not calculation_succeeded(_result(stored=False, ply_count=4), {"precision_general": 80.0})


def test_failures_do_not_stop_the_rest_and_the_notice_names_both_counts():
    def compute(game_id):
        if game_id == "boom":
            raise RuntimeError("engine")
        if game_id == "empty":
            return _result(stored=False, ply_count=0)
        return _result()

    def read(game_id):
        return {"precision_general": 70.0}

    counts = summarize_calculations(["ok", "boom", "empty"], compute, read)
    assert counts == {"calculated": 1, "failed": 2}
    fields = notification_fields(counts["calculated"], counts["failed"])
    assert fields["type"] == "warning"
    assert fields["status"] == "completed"
    assert fields["message"] == "Se calculó la precisión de 1 partida. 2 no se pudieron calcular."


def test_all_failures_become_an_error_notification():
    fields = notification_fields(0, 3)
    assert fields["type"] == "error"
    assert fields["status"] == "failed"
    assert "No se pudo calcular" in fields["message"]


def test_one_success_uses_the_singular():
    fields = notification_fields(1, 0)
    assert fields["type"] == "success"
    assert fields["message"] == "Se calculó la precisión de 1 partida."
