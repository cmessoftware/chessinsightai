"""LOG-FEAT-10 + FEAT-120: feedback as GitHub issues with optional image attachments."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from services.feedback_attachments import (
    FeedbackAttachmentError,
    MAX_ATTACHMENT_COUNT,
    resolve_attachment_path,
    save_image_attachment,
)
from services.github_feedback import (
    FeedbackError,
    create_feedback_issue,
    get_feedback_issue,
    list_feedback_issue_comments,
    is_chessdash_feedback_issue,
    list_feedback_issues,
    post_feedback_issue_comment,
    serialize_issue_summary,
    upload_feedback_image_to_github,
)

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackBody(BaseModel):
    kind: str = Field(..., description="bug or suggestion")
    title: str = Field(..., min_length=1, max_length=160)
    description: str = Field(..., min_length=1, max_length=8000)


def _public_attachment_base(request: Request) -> str:
    import os

    configured = (os.environ.get("FEEDBACK_ATTACHMENT_PUBLIC_BASE_URL") or "").strip().rstrip("/")
    if configured:
        return configured
    return str(request.base_url).rstrip("/")


def _github_feedback_credentials() -> tuple[str, str]:
    import os

    token = (os.environ.get("GITHUB_FEEDBACK_TOKEN") or os.environ.get("GITHUB_TOKEN") or "").strip()
    repo = (os.environ.get("GITHUB_FEEDBACK_REPO") or "cmessoftware/chessinsightai").strip()
    return token, repo


def _require_user(request: Request) -> tuple[str, bool]:
    user = getattr(request.state, "user", None) or {}
    username = (user.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    roles = user.get("roles") or []
    is_admin = "admin" in roles
    return username, is_admin


def _require_github() -> tuple[str, str]:
    token, repo = _github_feedback_credentials()
    if not token:
        raise HTTPException(status_code=503, detail="El registro de reportes no está configurado.")
    return token, repo


def _feedback_error_to_http(exc: FeedbackError) -> HTTPException:
    message = str(exc)
    status = 503 if "no está configurado" in message else 502
    return HTTPException(status_code=status, detail=message)


def _is_local_base_url(base: str) -> bool:
    from urllib.parse import urlparse

    host = (urlparse(base).hostname or "").lower()
    return host in {"localhost", "127.0.0.1", "::1"} or host.endswith(".local")


async def _save_uploads(
    files: List[UploadFile], request: Request
) -> tuple[list[tuple[str, str]], list[dict], list[str]]:
    if len(files) > MAX_ATTACHMENT_COUNT:
        raise FeedbackAttachmentError(f"Máximo {MAX_ATTACHMENT_COUNT} imágenes por envío.")
    base = _public_attachment_base(request)
    token, repo = _github_feedback_credentials()
    saved_meta: list[dict] = []
    markdown: list[tuple[str, str]] = []
    warnings: list[str] = []
    for upload in files:
        if not upload.filename and not upload.content_type:
            continue
        data = await upload.read()
        if not data:
            continue
        meta = save_image_attachment(
            filename=upload.filename or "imagen",
            content_type=upload.content_type,
            data=data,
        )
        local_url = f"{base}/api/feedback/attachments/{meta['id']}"
        issue_url: str | None = None
        if token:
            try:
                issue_url = upload_feedback_image_to_github(
                    repo=repo,
                    token=token,
                    attachment_id=meta["id"],
                    filename=meta["filename"],
                    data=data,
                    mime=meta["mime"],
                )
            except FeedbackError as exc:
                if _is_local_base_url(base):
                    warnings.append(f"{meta['filename']}: no se embebió en GitHub ({exc}).")
                else:
                    issue_url = local_url
        elif _is_local_base_url(base):
            warnings.append(
                f"{meta['filename']}: no se embebió en GitHub (falta GITHUB_FEEDBACK_TOKEN con contents: write)."
            )
        else:
            issue_url = local_url
        if issue_url:
            markdown.append((meta["filename"], issue_url))
        saved_meta.append({**meta, "url": local_url})
    return markdown, saved_meta, warnings


async def _submit(
    request: Request,
    *,
    username: str,
    kind: str,
    title: str,
    description: str,
    files: Optional[List[UploadFile]] = None,
):
    image_markdown = None
    attachments: list[dict] = []
    attachment_warnings: list[str] = []
    if files:
        try:
            image_markdown, attachments, attachment_warnings = await _save_uploads(files, request)
        except FeedbackAttachmentError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        created = create_feedback_issue(
            username=username,
            kind=kind,
            title=title,
            description=description,
            image_markdown=image_markdown or None,
        )
    except FeedbackError as exc:
        message = str(exc)
        status = (
            503
            if "no está configurado" in message
            else 400
            if "obligatori" in message or "tipo" in message
            else 502
        )
        raise HTTPException(status_code=status, detail=message) from exc
    if attachments:
        created["attachments"] = attachments
    if attachment_warnings:
        created["attachment_warnings"] = attachment_warnings
    return created


@router.post("")
async def submit_feedback(
    request: Request,
    kind: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(default=[]),
):
    """Multipart: kind, title, description, optional image files (FEAT-120)."""
    user = getattr(request.state, "user", None) or {}
    username = (user.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _submit(
        request,
        username=username,
        kind=kind,
        title=title,
        description=description,
        files=files or None,
    )


@router.post("/json")
async def submit_feedback_json(body: FeedbackBody, request: Request):
    """JSON body without attachments (compat tests / clientes legacy)."""
    user = getattr(request.state, "user", None) or {}
    username = (user.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _submit(
        request,
        username=username,
        kind=body.kind,
        title=body.title,
        description=body.description,
    )


@router.get("/issues")
def list_feedback_history(request: Request, page: int = 1, per_page: int = 30):
    """FEAT-123: historial de reportes ChessDash (todos los usuarios autenticados)."""
    _require_user(request)
    token, repo = _require_github()
    try:
        return list_feedback_issues(repo=repo, token=token, page=page, per_page=per_page)
    except FeedbackError as exc:
        raise _feedback_error_to_http(exc) from exc


@router.get("/issues/{issue_number}")
def get_feedback_issue_thread(issue_number: int, request: Request):
    """FEAT-123: metadatos, descripción inicial y comentarios (sin URL de GitHub)."""
    _require_user(request)
    token, repo = _require_github()
    try:
        raw = get_feedback_issue(repo, token, issue_number)
    except FeedbackError as exc:
        raise _feedback_error_to_http(exc) from exc
    if not is_chessdash_feedback_issue(raw):
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")
    comments = list_feedback_issue_comments(repo, token, issue_number)
    return {
        "issue": serialize_issue_summary(raw),
        "initial_body": (raw.get("body") or "").strip(),
        "comments": comments,
    }


@router.post("/issues/{issue_number}/comments")
async def add_feedback_issue_comment(
    issue_number: int,
    request: Request,
    text: str = Form(""),
    files: List[UploadFile] = File(default=[]),
):
    """FEAT-123: publicar comentario en el hilo (multipart opcional con imágenes)."""
    username, _ = _require_user(request)
    token, repo = _require_github()
    try:
        raw = get_feedback_issue(repo, token, issue_number)
    except FeedbackError as exc:
        raise _feedback_error_to_http(exc) from exc
    if not is_chessdash_feedback_issue(raw):
        raise HTTPException(status_code=404, detail="Reporte no encontrado.")
    image_markdown = None
    attachment_warnings: list[str] = []
    if files:
        try:
            image_markdown, _, attachment_warnings = await _save_uploads(files, request)
        except FeedbackAttachmentError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        comment = post_feedback_issue_comment(
            repo=repo,
            token=token,
            number=issue_number,
            username=username,
            text=text,
            image_markdown=image_markdown or None,
        )
    except FeedbackError as exc:
        message = str(exc)
        status = 400 if "obligatorio" in message else 502
        raise HTTPException(status_code=status, detail=message) from exc
    result = {"comment": comment}
    if attachment_warnings:
        result["attachment_warnings"] = attachment_warnings
    return result


@router.get("/attachments/{attachment_id}")
def get_feedback_attachment(attachment_id: str):
    """Public read by opaque id so GitHub can render issue images."""
    try:
        path, mime = resolve_attachment_path(attachment_id)
    except FeedbackAttachmentError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path, media_type=mime)