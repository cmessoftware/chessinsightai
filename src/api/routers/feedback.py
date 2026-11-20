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
from services.github_feedback import FeedbackError, create_feedback_issue

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


async def _save_uploads(files: List[UploadFile], request: Request) -> tuple[list[tuple[str, str]], list[dict]]:
    if len(files) > MAX_ATTACHMENT_COUNT:
        raise FeedbackAttachmentError(f"Máximo {MAX_ATTACHMENT_COUNT} imágenes por envío.")
    base = _public_attachment_base(request)
    saved_meta: list[dict] = []
    markdown: list[tuple[str, str]] = []
    for upload in files:
        if not upload.filename and not upload.content_type:
            continue
        data = await upload.read()
        meta = save_image_attachment(
            filename=upload.filename or "imagen",
            content_type=upload.content_type,
            data=data,
        )
        url = f"{base}/api/feedback/attachments/{meta['id']}"
        markdown.append((meta["filename"], url))
        saved_meta.append({**meta, "url": url})
    return markdown, saved_meta


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
    if files:
        try:
            image_markdown, attachments = await _save_uploads(files, request)
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


@router.get("/attachments/{attachment_id}")
def get_feedback_attachment(attachment_id: str):
    """Public read by opaque id so GitHub can render issue images."""
    try:
        path, mime = resolve_attachment_path(attachment_id)
    except FeedbackAttachmentError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path, media_type=mime)