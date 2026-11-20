"""LOG-FEAT-10: turn a bug or suggestion into a GitHub issue."""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, List, Optional, Tuple

from services.feedback_attachments import append_images_to_issue_body

GITHUB_API = "https://api.github.com"
DEFAULT_REPO = "cmessoftware/chessinsightai"

KINDS = {
    "bug": ("Bug", "bug"),
    "suggestion": ("Sugerencia", "enhancement"),
}


class FeedbackError(Exception):
    """The report cannot be sent."""


def _github_headers(token: str, *, content_type: str = "application/json") -> dict:
    headers = {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "chessinsightai-feedback",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def upload_feedback_image_to_github(
    *,
    repo: str,
    token: str,
    attachment_id: str,
    filename: str,
    data: bytes,
    mime: str,
) -> str:
    """Store image in the repo so GitHub issue markdown can load it (not localhost/camo)."""
    ext = mimetypes.guess_extension(mime) or ""
    if ext == ".jpe":
        ext = ".jpg"
    if not ext:
        ext = os.path.splitext(filename or "")[1] or ".bin"
    path = f".feedback/attachments/{attachment_id}{ext}"
    encoded_path = "/".join(urllib.parse.quote(part) for part in path.split("/"))
    payload = {
        "message": f"feedback: attachment {attachment_id}",
        "content": base64.b64encode(data).decode("ascii"),
        "committer": {
            "name": "chessinsightai-feedback",
            "email": "41898282+github-actions[bot]@users.noreply.github.com",
        },
    }
    request = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/contents/{encoded_path}",
        data=json.dumps(payload).encode("utf-8"),
        headers=_github_headers(token),
        method="PUT",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        if exc.code in (401, 403):
            raise FeedbackError(
                "El token de GitHub no puede subir adjuntos (necesita permiso contents: write)."
            ) from exc
        raise FeedbackError(detail or f"GitHub respondió {exc.code} al subir la imagen.") from exc
    except urllib.error.URLError as exc:
        raise FeedbackError("No se pudo contactar a GitHub para subir la imagen.") from exc
    content = body.get("content") or {}
    url = (content.get("download_url") or "").strip()
    if not url:
        raise FeedbackError("GitHub no devolvió URL pública para la imagen.")
    return url


def build_issue(
    *,
    username: str,
    kind: str,
    title: str,
    description: str,
    image_markdown: list[tuple[str, str]] | None = None,
) -> dict:
    if kind not in KINDS:
        raise FeedbackError("El tipo tiene que ser bug o sugerencia.")
    clean_title = " ".join((title or "").split())
    clean_body = (description or "").strip()
    if not clean_title:
        raise FeedbackError("El título es obligatorio.")
    if not clean_body:
        raise FeedbackError("La descripción es obligatoria.")
    label_name, label = KINDS[kind]
    prefix = f"[{label_name}] "
    if not clean_title.lower().startswith(prefix.lower()):
        clean_title = prefix + clean_title
    body = (
        f"**Tipo:** {label_name}\n"
        f"**Usuario:** {(username or '').strip() or 'desconocido'}\n\n"
        f"{clean_body}"
    )
    if image_markdown:
        body = append_images_to_issue_body(body, image_markdown)
    return {
        "title": clean_title[:160],
        "body": body[:8000],
        "labels": [label],
    }


def create_feedback_issue(
    *,
    username: str,
    kind: str,
    title: str,
    description: str,
    image_markdown: Optional[List[Tuple[str, str]]] = None,
    poster: Optional[Callable[[str, str, dict], dict]] = None,
) -> dict:
    token = (os.environ.get("GITHUB_FEEDBACK_TOKEN") or os.environ.get("GITHUB_TOKEN") or "").strip()
    if not token:
        raise FeedbackError("El registro de reportes no está configurado.")
    repo = (os.environ.get("GITHUB_FEEDBACK_REPO") or DEFAULT_REPO).strip()
    payload = build_issue(
        username=username,
        kind=kind,
        title=title,
        description=description,
        image_markdown=image_markdown,
    )
    send = poster or _post_issue
    try:
        created = send(repo, token, payload)
    except FeedbackError as exc:
        if payload["labels"] and "label" in str(exc).lower():
            payload = {**payload, "labels": []}
            created = send(repo, token, payload)
        else:
            raise
    return {
        "number": created.get("number"),
        "url": created.get("html_url"),
        "title": created.get("title") or payload["title"],
    }


def _post_issue(repo: str, token: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/issues",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "chessinsightai-feedback",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise FeedbackError(detail or f"GitHub respondió {exc.code}") from exc
    except urllib.error.URLError as exc:
        raise FeedbackError("No se pudo contactar a GitHub.") from exc
