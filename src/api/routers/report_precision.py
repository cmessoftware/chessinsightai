"""RPT-FEAT-04 and RPT-FEAT-10: precision by speed class for the signed-in user's games."""

from datetime import date
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from db.models.notifications import Notification
from modules.module07.chesscom_settings import get_chesscom_import_settings
from modules.module07.lichess_settings import get_lichess_import_settings
from modules.module07.precision_by_speed import build_precision_report, load_precision_rows
from modules.module07.precision_job import run_precision_job, start_message

router = APIRouter(prefix="/api/reports", tags=["reports"])

_JOB_TITLE = "Cálculo de precisión"


def _owner_id(request: Request) -> int:
    user = getattr(request.state, "user", None) or {}
    user_id = user.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return int(user_id)


def _report(db: Session, owner: int, months: int, player: str | None) -> dict:
    rows, evals = load_precision_rows(db, owner)
    lichess = get_lichess_import_settings(db, owner).get("lichess_username") or ""
    chesscom = get_chesscom_import_settings(db, owner).get("chesscom_username") or ""
    return build_precision_report(
        rows,
        today=date.today(),
        months=months,
        lichess_username=lichess,
        chesscom_username=chesscom,
        player=player,
        evals_by_game=evals,
    )


@router.get("/precision")
def precision_by_speed(
    request: Request,
    months: int = Query(default=12, ge=1, le=120),
    player: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    report = _report(db, _owner_id(request), months, player)
    report.pop("pending_ids", None)
    return report


@router.post("/precision/calculate")
def calculate_precision(
    request: Request,
    background_tasks: BackgroundTasks,
    months: int = Query(default=12, ge=1, le=120),
    player: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    owner = _owner_id(request)
    report = _report(db, owner, months, player)
    game_ids = report.get("pending_ids") or []
    if not game_ids:
        return {"status": "empty", "pending": 0}
    running = (
        db.query(Notification)
        .filter(Notification.user_id == str(owner))
        .filter(Notification.status == "processing")
        .filter(Notification.title == _JOB_TITLE)
        .first()
    )
    if running is not None:
        return {
            "status": "already_running",
            "pending": len(game_ids),
            "notificationId": running.id,
        }
    notification = Notification(
        id=str(uuid4()),
        user_id=str(owner),
        type="processing",
        status="processing",
        title=_JOB_TITLE,
        message=start_message(len(game_ids)),
        read=False,
        dismissed=False,
        meta_data={"pending": len(game_ids)},
    )
    db.add(notification)
    db.commit()
    background_tasks.add_task(run_precision_job, notification.id, list(game_ids))
    return {
        "status": "processing",
        "pending": len(game_ids),
        "notificationId": notification.id,
    }
