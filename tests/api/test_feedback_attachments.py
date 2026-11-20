"""FEAT-120 — image attachments on feedback."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SRC_API = ROOT / "src" / "api"
if str(SRC_API) not in sys.path:
    sys.path.insert(0, str(SRC_API))

from services.feedback_attachments import (  # noqa: E402
    FeedbackAttachmentError,
    append_images_to_issue_body,
    save_image_attachment,
    validate_image_upload,
)
from services.github_feedback import build_issue, upload_feedback_image_to_github  # noqa: E402


def test_validate_rejects_oversize():
    with pytest.raises(FeedbackAttachmentError, match="MB"):
        validate_image_upload(filename="x.png", content_type="image/png", size_bytes=6 * 1024 * 1024)


def test_save_png_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("FEEDBACK_ATTACHMENTS_DIR", str(tmp_path))
    tiny_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
        b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    meta = save_image_attachment(filename="captura.png", content_type="image/png", data=tiny_png)
    assert len(meta["id"]) == 32
    assert meta["mime"] == "image/png"


def test_build_issue_appends_image_markdown():
    issue = build_issue(
        username="ana",
        kind="bug",
        title="Tablero",
        description="Se ve mal.",
        image_markdown=[
            ("captura.png", "https://raw.githubusercontent.com/o/r/main/.feedback/attachments/abc.png")
        ],
    )
    assert "## Adjuntos" in issue["body"]
    assert "![captura.png]" in issue["body"]
    assert "Abrir captura.png" in issue["body"]


def test_upload_feedback_image_returns_download_url(monkeypatch):
    captured = {}

    class FakeResponse:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def read(self):
            return b'{"content":{"download_url":"https://raw.githubusercontent.com/o/r/x.png"}}'

    def fake_urlopen(request, timeout=0):
        captured["url"] = request.full_url
        captured["method"] = request.method
        return FakeResponse()

    monkeypatch.setattr("services.github_feedback.urllib.request.urlopen", fake_urlopen)
    url = upload_feedback_image_to_github(
        repo="o/r",
        token="tok",
        attachment_id="a" * 32,
        filename="shot.png",
        data=b"\x89PNG",
        mime="image/png",
    )
    assert url.endswith("x.png")
    assert "/contents/.feedback/attachments/" in captured["url"]
    assert captured["method"] == "PUT"


def test_append_images_respects_limit():
    body = "x" * 7900
    out = append_images_to_issue_body(body, [("a", "https://example.com/a.png")])
    assert len(out) <= 8000