"""LOG-FEAT-10 — bug and suggestion reports become GitHub issues."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from services.github_feedback import (  # noqa: E402
    FeedbackError,
    build_issue,
    create_feedback_issue,
)


def test_bug_issue_names_the_user_and_the_kind():
    issue = build_issue(
        username="ana",
        kind="bug",
        title="El filtro no aplica",
        description="Queda la lista completa.",
    )
    assert issue["title"] == "[Bug] El filtro no aplica"
    assert "**Usuario:** ana" in issue["body"]
    assert "Queda la lista completa." in issue["body"]
    assert issue["labels"] == ["bug"]


def test_suggestion_uses_the_enhancement_label():
    issue = build_issue(
        username="luis",
        kind="suggestion",
        title="Exportar el estudio",
        description="Poder bajar el PGN.",
    )
    assert issue["title"].startswith("[Sugerencia] ")
    assert issue["labels"] == ["enhancement"]


def test_blank_title_is_rejected():
    with pytest.raises(FeedbackError):
        build_issue(username="ana", kind="bug", title="  ", description="texto")


def test_create_sends_the_issue_and_returns_its_url(monkeypatch):
    monkeypatch.setenv("GITHUB_FEEDBACK_TOKEN", "token")
    sent = {}

    def poster(repo, token, payload):
        sent["repo"] = repo
        sent["token"] = token
        sent["payload"] = payload
        return {"number": 12, "html_url": "https://github.com/cmessoftware/chessinsightai/issues/12", "title": payload["title"]}

    created = create_feedback_issue(
        username="ana",
        kind="suggestion",
        title="Atajo de teclado",
        description="Volver con la flecha.",
        poster=poster,
    )
    assert sent["repo"] == "cmessoftware/chessinsightai"
    assert sent["token"] == "token"
    assert created["number"] == 12
    assert created["url"].endswith("/issues/12")


def test_missing_token_does_not_call_github(monkeypatch):
    monkeypatch.delenv("GITHUB_FEEDBACK_TOKEN", raising=False)
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    with pytest.raises(FeedbackError, match="no está configurado"):
        create_feedback_issue(
            username="ana",
            kind="bug",
            title="Falla",
            description="Detalle",
        )
