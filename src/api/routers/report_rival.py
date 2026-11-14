"""RPT-FEAT-05: rival ranking and precision, with both curves, for the signed-in user's games."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from database import get_db
from modules.module07.chesscom_settings import get_chesscom_import_settings
from modules.module07.lichess_settings import get_lichess_import_settings
from modules.module07.rival_comparison import build_rival_report, load_rival_rows

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/rival")
def rival_comparison(
    request: Request,
    months: int = Query(default=12, ge=1, le=120),
    player: str | None = Query(default=None),
    rival: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    user = getattr(request.state, "user", None) or {}
    user_id = user.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    owner = int(user_id)
    rows, evals = load_rival_rows(db, owner)
    lichess = get_lichess_import_settings(db, owner).get("lichess_username") or ""
    chesscom = get_chesscom_import_settings(db, owner).get("chesscom_username") or ""
    return build_rival_report(
        rows,
        today=date.today(),
        months=months,
        lichess_username=lichess,
        chesscom_username=chesscom,
        player=player,
        rival=rival,
        evals_by_game=evals,
    )
