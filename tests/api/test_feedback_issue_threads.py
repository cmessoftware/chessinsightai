"""FEAT-123 — list and comment on feedback issues via GitHub proxy."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from services.github_feedback import (  # noqa: E402
    build_comment_body,
    list_feedback_issues,
    parse_issue_username,
    post_feedback_issue_comment,
    user_may_access_issue,
)


def test_parse_issue_username_reads_marker():
    body = "**Tipo:** Bug\n**Usuario:** ana\n\nDetalle."
    assert parse_issue_username(body) == "ana"
    assert parse_issue_username("sin marca") is None


def test_user_may_access_issue_respects_owner_and_admin():
    issue = {"body": "**Usuario:** luis\n\nHola."}
    assert user_may_access_issue(issue, "luis", is_admin=False) is True
    assert user_may_access_issue(issue, "ana", is_admin=False) is False
    assert user_may_access_issue(issue, "ana", is_admin=True) is True


def test_list_feedback_issues_filters_by_username():
    raw_page = [
        {"number": 1, "title": "[Bug] A", "state": "open", "body": "**Usuario:** ana\n", "created_at": "t", "updated_at": "t"},
        {"number": 2, "title": "PR", "state": "open", "body": "**Usuario:** ana\n", "pull_request": {}, "created_at": "t", "updated_at": "t"},
        {"number": 3, "title": "[Bug] B", "state": "closed", "body": "**Usuario:** luis\n", "created_at": "t", "updated_at": "t"},
    ]

    def fetcher(repo, token, page, per_page):
        return raw_page

    result = list_feedback_issues(repo="o/r", token="t", username="ana", fetcher=fetcher)
    assert len(result["items"]) == 1
    assert result["items"][0]["number"] == 1


def test_build_comment_body_includes_username():
    body = build_comment_body(username="ana", text="Gracias.")
    assert "**Usuario:** ana" in body
    assert "Gracias." in body


def test_post_feedback_issue_comment_uses_poster():
    sent = {}

    def poster(repo, token, number, payload):
        sent["payload"] = payload
        return {
            "id": 99,
            "body": payload["body"],
            "created_at": "2026-01-01T00:00:00Z",
            "user": {"login": "ana"},
        }

    out = post_feedback_issue_comment(
        repo="o/r",
        token="tok",
        number=5,
        username="ana",
        text="Seguimiento",
        poster=poster,
    )
    assert out["id"] == 99
    assert "**Usuario:** ana" in sent["payload"]["body"]