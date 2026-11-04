"""FEAT-063 — Coach Partidas advanced list filters."""

from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parents[2] / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from modules.module07.coach_game_list_filters import (  # noqa: E402
    CoachGameListFilters,
    study_name_ilike_pattern,
    wildcard_to_ilike_pattern,
)


def test_wildcard_to_ilike_pattern():
    assert wildcard_to_ilike_pattern("*gambit*") == "%gambit%"
    assert wildcard_to_ilike_pattern("Carlsen") == "Carlsen"
    assert wildcard_to_ilike_pattern("B9*") == "B9%"
    assert wildcard_to_ilike_pattern("") == ""


def test_filters_from_query_merges_sources_and_results():
    f = CoachGameListFilters.from_query(
        corpus_type="personal",
        corpus_types=["fide", "fide"],
        results=["1-0", "0-1"],
        white_player=" alice ",
        eco="C00",
        opening="*French*",
        date_from="2024.01.01",
        date_to="2024-12-31",
    )
    assert f.corpus_types == ("personal", "fide")
    assert f.results == ("1-0", "0-1")
    assert f.white_player == "alice"
    assert f.eco == "C00"
    assert f.opening == "*French*"
    assert f.date_from == "2024-01-01"
    assert f.date_to == "2024-12-31"
    assert f.has_any()


def test_rhythm_filter_includes_correspondence_alias():
    f = CoachGameListFilters.from_query(rhythms=["Rapid", "daily"])
    assert f.rhythms == ("rapid", "daily", "correspondence")
    assert f.has_any()


def test_study_name_matches_the_pgn_header():
    assert study_name_ilike_pattern("Larsen") == '[StudyName "%Larsen%"]'
    assert study_name_ilike_pattern("*finales*") == '[StudyName "%finales%"]'
    f = CoachGameListFilters.from_query(study_name="  Larsen ")
    assert f.study_name == "Larsen"
    assert f.has_any()


def test_imported_range_is_parsed():
    f = CoachGameListFilters.from_query(
        imported_from="2026.03.01",
        imported_to="2026-03-31",
    )
    assert f.imported_from == "2026-03-01"
    assert f.imported_to == "2026-03-31"
    assert f.has_any()
    assert f.date_from is None


def test_empty_filters_has_any_false():
    f = CoachGameListFilters.from_query()
    assert not f.has_any()
