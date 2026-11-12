"""LOG-FEAT-10: authenticated users file bugs and suggestions as GitHub issues."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from services.github_feedback import FeedbackError, create_feedback_issue

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class FeedbackBody(BaseModel):
    kind: str = Field(..., description="bug or suggestion")
    title: str = Field(..., min_length=1, max_length=160)
    description: str = Field(..., min_length=1, max_length=8000)


@router.post("")
def submit_feedback(body: FeedbackBody, request: Request):
    user = getattr(request.state, "user", None) or {}
    username = (user.get("username") or "").strip()
    if not username:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        return create_feedback_issue(
            username=username,
            kind=body.kind,
            title=body.title,
            description=body.description,
        )
    except FeedbackError as exc:
        message = str(exc)
        status = 503 if "no está configurado" in message else 400 if "obligatori" in message or "tipo" in message else 502
        raise HTTPException(status_code=status, detail=message) from exc
