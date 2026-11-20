"""FEAT-120: persist feedback image attachments for GitHub issue bodies."""

from __future__ import annotations

import mimetypes
import os
import re
import uuid
from pathlib import Path
from typing import BinaryIO, Optional

MAX_ATTACHMENT_BYTES = int(os.environ.get("FEEDBACK_ATTACHMENT_MAX_BYTES", 5 * 1024 * 1024))
MAX_ATTACHMENT_COUNT = int(os.environ.get("FEEDBACK_ATTACHMENT_MAX_COUNT", 5))

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

_SAFE_NAME = re.compile(r"[^a-zA-Z0-9._-]+")


class FeedbackAttachmentError(Exception):
    pass


def attachments_root() -> Path:
    raw = os.environ.get("FEEDBACK_ATTACHMENTS_DIR", "data/feedback_attachments")
    root = Path(raw)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _sanitize_filename(name: str) -> str:
    base = Path(name or "imagen").name
    base = _SAFE_NAME.sub("_", base).strip("._") or "imagen"
    return base[:120]


def validate_image_upload(
    *,
    filename: str,
    content_type: Optional[str],
    size_bytes: int,
) -> str:
    if size_bytes <= 0:
        raise FeedbackAttachmentError("El archivo está vacío.")
    if size_bytes > MAX_ATTACHMENT_BYTES:
        mb = MAX_ATTACHMENT_BYTES / (1024 * 1024)
        raise FeedbackAttachmentError(f"Cada imagen puede pesar hasta {mb:.0f} MB.")
    mime = (content_type or "").split(";")[0].strip().lower()
    if mime not in ALLOWED_IMAGE_TYPES:
        guessed, _ = mimetypes.guess_type(filename)
        mime = (guessed or "").lower()
    if mime not in ALLOWED_IMAGE_TYPES:
        raise FeedbackAttachmentError("Formato no admitido. Usá JPEG, PNG, WebP o GIF.")
    return mime


def save_image_attachment(
    *,
    filename: str,
    content_type: Optional[str],
    data: bytes,
) -> dict:
    mime = validate_image_upload(
        filename=filename, content_type=content_type, size_bytes=len(data)
    )
    attachment_id = uuid.uuid4().hex
    ext = mimetypes.guess_extension(mime) or ".bin"
    if ext == ".jpe":
        ext = ".jpg"
    safe = _sanitize_filename(filename)
    meta_name = f"{attachment_id}.json"
    root = attachments_root()
    (root / f"{attachment_id}{ext}").write_bytes(data)
    (root / meta_name).write_text(
        f'{{"id":"{attachment_id}","filename":"{safe}","mime":"{mime}"}}',
        encoding="utf-8",
    )
    return {"id": attachment_id, "filename": safe, "mime": mime, "size": len(data)}


def load_attachment_meta(attachment_id: str) -> dict:
    if not re.fullmatch(r"[a-f0-9]{32}", attachment_id or ""):
        raise FeedbackAttachmentError("Adjunto no encontrado.")
    meta_path = attachments_root() / f"{attachment_id}.json"
    if not meta_path.is_file():
        raise FeedbackAttachmentError("Adjunto no encontrado.")
    import json

    return json.loads(meta_path.read_text(encoding="utf-8"))


def resolve_attachment_path(attachment_id: str) -> tuple[Path, str]:
    meta = load_attachment_meta(attachment_id)
    mime = meta.get("mime") or "application/octet-stream"
    root = attachments_root()
    for path in root.glob(f"{attachment_id}.*"):
        if path.suffix == ".json":
            continue
        return path, mime
    raise FeedbackAttachmentError("Adjunto no encontrado.")


def append_images_to_issue_body(body: str, images: list[tuple[str, str]]) -> str:
    if not images:
        return body
    lines = [body.rstrip(), "", "## Adjuntos"]
    for name, url in images:
        lines.append(f"![{name}]({url})")
        lines.append(f"- [Abrir {name}]({url})")
    text = "\n".join(lines)
    return text[:8000]