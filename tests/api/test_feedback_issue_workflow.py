"""Flujo de estado Comentarios (etiquetas estado:*) — solo admin de plataforma en API."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from services.github_feedback import (  # noqa: E402
    infer_feedback_workflow_status,
    serialize_issue_summary,
    update_feedback_issue_workflow,
)


def test_infer_workflow_from_label():
    issue = {
        "state": "open",
        "labels": [{"name": "bug"}, {"name": "estado:en-curso"}],
        "body": "**Usuario:** ana\n",
    }
    assert infer_feedback_workflow_status(issue) == "in_progress"


def test_infer_workflow_closed_defaults_done():
    issue = {"state": "closed", "state_reason": "completed", "labels": [], "body": ""}
    assert infer_feedback_workflow_status(issue) == "done"


def test_serialize_includes_workflow():
    issue = {
        "number": 3,
        "title": "T",
        "state": "open",
        "labels": [{"name": "estado:por-hacer"}],
        "body": "**Usuario:** bob\n",
        "created_at": "a",
        "updated_at": "b",
    }
    out = serialize_issue_summary(issue)
    assert out["workflow_status"] == "todo"
    assert out["workflow_label"] == "Por hacer"


def test_update_workflow_merges_labels():
    captured = {}

    def fetcher(repo, token, number):
        return {
            "state": "open",
            "labels": [{"name": "bug"}, {"name": "estado:backlog"}],
        }

    def patcher(repo, token, number, body):
        captured["body"] = body
        return {
            "number": number,
            "title": "T",
            "state": body["state"],
            "state_reason": body.get("state_reason"),
            "labels": [{"name": n} for n in body["labels"]],
            "body": "**Usuario:** ana\n",
            "created_at": "t",
            "updated_at": "t",
        }

    def ensure(repo, token, label, color):
        captured.setdefault("ensured", []).append(label)

    out = update_feedback_issue_workflow(
        "o/r",
        "tok",
        7,
        "done",
        fetcher=fetcher,
        patcher=patcher,
        label_ensurer=ensure,
    )
    assert captured["body"]["state"] == "closed"
    assert captured["body"]["state_reason"] == "completed"
    assert "bug" in captured["body"]["labels"]
    assert "estado:finalizado" in captured["body"]["labels"]
    assert "estado:backlog" not in captured["body"]["labels"]
    assert out["workflow_status"] == "done"