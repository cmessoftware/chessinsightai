"""Shared fixtures for orchestrated architecture tests."""

import pytest
from unittest.mock import Mock, MagicMock, AsyncMock
from datetime import datetime
import uuid


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    """Only test with asyncio backend (trio not installed)."""
    return request.param

from src.ai_coach.orchestrated.schemas import (
    AnalysisOptions,
    AnalysisPlan,
    ExecutionResult,
    MLPrediction,
    RAGContext,
    CriticResult,
    EnrichedResult,
    ValidationIssue,
    PlayerPatterns
)


@pytest.fixture
def sample_game():
    """Create a mock game object for testing."""
    game = Mock()
    game.id = uuid.uuid4()
    game.player_id = uuid.uuid4()
    game.moves = [
        Mock(
            ply=1,
            move_san="e4",
            eval_before=15,
            eval_after=25,
            material_change=0,
            tactical_tags=[],
            error_label=None,
            best_move=""
        ),
        Mock(
            ply=2,
            move_san="e5",
            eval_before=25,
            eval_after=20,
            material_change=0,
            tactical_tags=[],
            error_label=None,
            best_move=""
        ),
        Mock(
            ply=10,
            move_san="Nxe5",
            eval_before=50,
            eval_after=-150,
            material_change=-300,
            tactical_tags=["fork", "pin"],
            error_label="blunder",
            best_move=""
        ),
        Mock(
            ply=15,
            move_san="Qh5",
            eval_before=-150,
            eval_after=-210,
            material_change=0,
            tactical_tags=["check"],
            error_label="mistake",
            best_move=""
        ),
    ]
    game.get_fen_at = Mock(side_effect=lambda ply: f"fen_at_ply_{ply}")
    return game


@pytest.fixture
def analysis_options():
    """Create default analysis options."""
    return AnalysisOptions(
        depth=20,
        enable_ml=True,
        enable_rag=True,
        enable_cv=False,
        elo_threshold=1200,
        focus_mode="critical"
    )


@pytest.fixture
def sample_analysis_plan(sample_game, analysis_options):
    """Create a sample analysis plan."""
    return AnalysisPlan(
        game_id=sample_game.id,
        target_moves=[10, 15],
        analysis_modes=["engine", "features", "ml", "rag"],
        priorities={10: "high", 15: "medium"},
        metadata={"total_moves": 20, "critical_count": 2},
        options=analysis_options
    )


@pytest.fixture
def sample_execution_result(sample_game):
    """Create a sample execution result."""
    return ExecutionResult(
        game_id=sample_game.id,
        ply=10,
        move_san="Nxe5",
        fen_before="fen_at_ply_9",
        fen_after="fen_at_ply_10",
        engine_eval_before=50,
        engine_eval_after=-150,
        score_diff=-200,
        best_move="Nc3",
        best_line=["Nc3", "d5", "e4"],
        features={
            "king_safety": 0.6,
            "material_balance": -0.3,
            "center_control": 0.5,
            "piece_activity": 0.4
        },
        tactical_tags=["fork", "pin"],
        phase="middlegame",
        execution_time=1.0,
        ml_prediction=MLPrediction(
            predicted_error="blunder",
            confidence=0.92,
            risk_score=0.88,
            contributing_features=[
                {"feature_name": "material_balance", "impact": 0.6},
                {"feature_name": "tactical_tags", "impact": 0.32}
            ]
        ),
        rag_context=RAGContext(
            similar_positions=[],
            book_excerpts=[],
            player_patterns=[],
            total_retrieved=0,
            relevance_scores=[]
        )
    )


@pytest.fixture
def sample_critic_result():
    """Create a sample critic result."""
    return CriticResult(
        is_consistent=True,
        confidence=0.95,
        issues=[],
        passed_rules=["BlunderScoreThreshold", "TacticalEvidenceRequired"],
        failed_rules=[]
    )


@pytest.fixture
def sample_enriched_result(sample_execution_result, sample_critic_result):
    """Create a sample enriched result."""
    return EnrichedResult(
        execution_result=sample_execution_result,
        explanation="This move loses material due to a tactical oversight (fork + pin).",
        critic_result=sample_critic_result,
        metadata={"llm_model": "gpt-4", "generation_time": 1.5}
    )


@pytest.fixture
def mock_db_session():
    """Create a mock async database session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def mock_analysis_service():
    """Create a mock analysis service (Stockfish wrapper)."""
    service = Mock()
    service.analyze_position = Mock(return_value={
        "eval": -150,
        "best_move": "Nc3",
        "best_line": ["Nc3", "d5", "e4"],
        "tactical_tags": ["fork"]
    })
    return service


@pytest.fixture
def mock_feature_service():
    """Create a mock feature service."""
    service = Mock()
    service.extract_features = Mock(return_value={
        "king_safety": 0.6,
        "material_balance": -0.3,
        "center_control": 0.5,
        "piece_activity": 0.4
    })
    return service


@pytest.fixture
def mock_ml_service():
    """Create a mock ML prediction service."""
    service = Mock()
    service.predict = AsyncMock(return_value=MLPrediction(
        predicted_error="blunder",
        confidence=0.92,
        risk_score=0.88,
        contributing_features=[
            {"feature_name": "material_balance", "impact": 0.6},
            {"feature_name": "tactical_tags", "impact": 0.32}
        ]
    ))
    return service


@pytest.fixture
def mock_rag_service():
    """Create a mock RAG service."""
    service = Mock()
    service.retrieve = AsyncMock(return_value=RAGContext(
        similar_positions=[],
        book_excerpts=[],
        player_patterns=[],
        total_retrieved=0,
        relevance_scores=[]
    ))
    return service
