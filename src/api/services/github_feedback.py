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
DEFAULT_ATTACHMENTS_BRANCH = "feedback-attachments"

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


def feedback_attachments_branch() -> str:
    raw = (os.environ.get("GITHUB_FEEDBACK_ATTACHMENTS_BRANCH") or DEFAULT_ATTACHMENTS_BRANCH).strip()
    return raw or DEFAULT_ATTACHMENTS_BRANCH


def _github_error_message(detail: str, *, status: int) -> str:
    try:
        parsed = json.loads(detail)
    except json.JSONDecodeError:
        return detail or f"GitHub respondió {status}."
    message = (parsed.get("message") or "").strip()
    combined = message
    errors = parsed.get("errors")
    if isinstance(errors, list):
        for item in errors:
            if isinstance(item, dict) and item.get("message"):
                combined = f"{combined}\n{item['message']}".strip()
    lower = combined.lower()
    if status == 409 and ("pull request" in lower or "repository rule" in lower):
        branch = feedback_attachments_branch()
        return (
            "GitHub bloquea commits directos en la rama protegida (reglas del repo: solo vía PR). "
            f"Los adjuntos se suben a la rama «{branch}»; creala en el remoto o eximila de la regla, "
            "o configurá FEEDBACK_ATTACHMENT_PUBLIC_BASE_URL con la URL pública de la API."
        )
    if status in (401, 403):
        return "El token de GitHub no puede subir adjuntos (necesita permiso Contents: Read and write en el repo)."
    return combined or f"GitHub respondió {status} al subir la imagen."


def _repo_default_branch_sha(repo: str, token: str) -> tuple[str, str]:
    request = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}",
        headers=_github_headers(token, content_type=None),
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        meta = json.loads(response.read().decode("utf-8"))
    default_name = meta["default_branch"]
    ref_req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/ref/heads/{urllib.parse.quote(default_name)}",
        headers=_github_headers(token, content_type=None),
        method="GET",
    )
    with urllib.request.urlopen(ref_req, timeout=20) as ref_response:
        ref = json.loads(ref_response.read().decode("utf-8"))
    return default_name, ref["object"]["sha"]


def _ensure_attachments_branch(repo: str, token: str, branch: str) -> None:
    encoded_branch = urllib.parse.quote(branch)
    check = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/ref/heads/{encoded_branch}",
        headers=_github_headers(token, content_type=None),
        method="GET",
    )
    try:
        urllib.request.urlopen(check, timeout=20)
        return
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            return
    _, base_sha = _repo_default_branch_sha(repo, token)
    create = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/refs",
        data=json.dumps({"ref": f"refs/heads/{branch}", "sha": base_sha}).encode("utf-8"),
        headers=_github_headers(token),
        method="POST",
    )
    try:
        urllib.request.urlopen(create, timeout=20)
    except urllib.error.HTTPError as exc:
        if exc.code == 422:
            return
        detail = exc.read().decode("utf-8", errors="replace")
        raise FeedbackError(_github_error_message(detail, status=exc.code)) from exc


def upload_feedback_image_to_github(
    *,
    repo: str,
    token: str,
    attachment_id: str,
    filename: str,
    data: bytes,
    mime: str,
) -> str:
    """Store image on a dedicated repo branch (not default) so branch rules allow direct API commits."""
    branch = feedback_attachments_branch()
    _ensure_attachments_branch(repo, token, branch)
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
        "branch": branch,
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
        raise FeedbackError(_github_error_message(detail, status=exc.code)) from exc
    except urllib.error.URLError as exc:
        raise FeedbackError("No se pudo contactar a GitHub para subir la imagen.") from exc
    content = body.get("content") or {}
    url = (content.get("download_url") or "").strip()
    if not url:
        owner, name = repo.split("/", 1)
        url = f"https://raw.githubusercontent.com/{owner}/{name}/{branch}/{path}"
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
