"""RPT-FEAT-03: ranking by speed class for the signed-in user's games."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from modules.module07.chesscom_settings import get_chesscom_import_settings
from modules.module07.lichess_settings import get_lichess_import_settings
from modules.module07.ranking_by_speed import build_ranking_report, load_ranking_rows

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/ranking")
def ranking_by_speed(
    request: Request,
    months: int = Query(default=12, ge=1, le=120),
    player: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user = getattr(request.state, "user", None) or {}
    user_id = user.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    owner = int(user_id)
    rows = load_ranking_rows(db, owner)
    lichess = get_lichess_import_settings(db, owner).get("lichess_username") or ""
    chesscom = get_chesscom_import_settings(db, owner).get("chesscom_username") or ""
    return build_ranking_report(
        rows,
        today=date.today(),
        months=months,
        lichess_username=lichess,
        chesscom_username=chesscom,
        player=player,
    )
