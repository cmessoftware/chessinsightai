"""Background analysis: F07 review packs + mental model per critical ply."""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy.orm import Session

from api.database import SessionLocal
from modules.module07.f07_bridge import ensure_f07_import_path
from modules.module07.repository import add_decision_point, get_job, set_job_status
from modules.module07.serialize import mental_model_to_json

logger = logging.getLogger(__name__)

TOP_CRITICAL_PLIES = 5


def run_analysis_job(job_id: str, owner_user_id: int) -> None:
    ensure_f07_import_path()
    from analysis.abstention import assess_diagnosis_abstention
    from analysis.comparison import compare_played_to_candidates
    from analysis.game_models import select_analyzed_player
    from analysis.mental_model import assess_decision_point
    from analysis.position_extractor import import_game_from_pgn
    from analysis.review_pack import build_review_pack
    from analysis.criticality import rank_player_game

    db: Session = SessionLocal()
    try:
        job = get_job(db, job_id, owner_user_id)
        if job is None:
            logger.error("module07 job not found: %s", job_id)
            return
        job.started_at = datetime.utcnow()
        db.commit()
        set_job_status(db, job, "running")
        games = [g for g in job.games if g.owner_user_id == owner_user_id]
        depth = job.stockfish_depth
        multipv = job.stockfish_multipv

        for game_row in games:
            try:
                normalized = import_game_from_pgn(game_row.pgn)
                player = select_analyzed_player(
                    normalized, username=game_row.player_username
                )
                ranked = rank_player_game(
                    player,
                    depth=depth,
                    top_n=TOP_CRITICAL_PLIES,
                )
                ply_by_index = {p.ply: p for p in player.plies}
                for ranked_row in ranked:
                    ply_record = ply_by_index.get(ranked_row.item.ply)
                    if ply_record is None:
                        continue
                    comparison = compare_played_to_candidates(
                        ply_record.fen_before,
                        ply_record.uci,
                        depth=depth,
                        multipv=multipv,
                        player_color=player.color,
                        move_number=ply_record.move_number,
                        criticality=ranked_row.item,
                    )
                    pack = build_review_pack(
                        normalized,
                        ply_record,
                        player,
                        comparison,
                        assess_diagnosis_abstention(comparison),
                        pgn_source=game_row.id,
                        criticality=ranked_row.item,
                    )
                    prev_uci = None
                    if ply_record.ply > 0:
                        prev = ply_by_index.get(ply_record.ply - 1)
                        if prev:
                            prev_uci = prev.uci
                    top_uci = [d.candidate.move_uci for d in comparison.diffs[:multipv]]
                    mental = assess_decision_point(
                        fen=ply_record.fen_before,
                        last_move_uci=prev_uci,
                        candidate_count=len(comparison.diffs),
                        top_moves_uci=top_uci,
                    )
                    add_decision_point(
                        db,
                        game_id=game_row.id,
                        ply=ply_record.ply,
                        fen_before=ply_record.fen_before,
                        criticality=ranked_row.item.score,
                        review_pack=pack,
                        mental_model=mental_model_to_json(mental),
                    )
            except Exception as exc:
                logger.exception("module07 failed game %s", game_row.id)
                set_job_status(
                    db,
                    job,
                    "failed",
                    error_message=f"Failed on game {game_row.id}: {exc}",
                )
                return

        job.finished_at = datetime.utcnow()
        db.commit()
        set_job_status(db, job, "completed")
    except Exception as exc:
        logger.exception("module07 job %s crashed", job_id)
        job = get_job(db, job_id, owner_user_id)
        if job:
            set_job_status(db, job, "failed", error_message=str(exc))
    finally:
        db.close()
