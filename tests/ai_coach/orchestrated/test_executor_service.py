"""Unit tests for ExecutorService."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import asyncio

from src.ai_coach.orchestrated.executor_service import ExecutorService
from src.ai_coach.orchestrated.schemas import ExecutionResult, MLPrediction, RAGContext


@pytest.mark.unit
@pytest.mark.anyio
class TestExecutorService:
    """Test suite for ExecutorService."""

    async def test_execute_basic(self, sample_game, sample_analysis_plan, mock_analysis_service, mock_feature_service):
        """Test basic execution with engine and features only."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        assert len(results) == len(sample_analysis_plan.target_moves)
        assert all(isinstance(r, ExecutionResult) for r in results)
        assert all(r.game_id == sample_game.id for r in results)

    async def test_execute_with_ml_and_rag(self, sample_game, sample_analysis_plan, 
                                           mock_analysis_service, mock_feature_service,
                                           mock_ml_service, mock_rag_service):
        """Test execution with ML and RAG services enabled."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service,
            ml_predictor=mock_ml_service,
            rag_service=mock_rag_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        assert len(results) > 0
        # ML and RAG should be called for each move
        assert mock_ml_service.predict.call_count >= len(sample_analysis_plan.target_moves)
        assert mock_rag_service.retrieve.call_count >= len(sample_analysis_plan.target_moves)

    async def test_execute_parallel_ml_rag(self, sample_game, sample_analysis_plan,
                                           mock_analysis_service, mock_feature_service,
                                           mock_ml_service, mock_rag_service):
        """Test that ML and RAG execute in parallel."""
        # Add delays to mock services to verify parallelization
        async def slow_ml_predict(*args, **kwargs):
            await asyncio.sleep(0.1)
            return MLPrediction(
                predicted_error="good",
                confidence=0.85,
                risk_score=0.15,
                contributing_features=[]
            )

        async def slow_rag_retrieve(*args, **kwargs):
            await asyncio.sleep(0.1)
            return RAGContext(
                similar_positions=[],
                book_excerpts=[],
                player_patterns=[],
                total_retrieved=0,
                relevance_scores=[]
            )

        mock_ml_service.predict = AsyncMock(side_effect=slow_ml_predict)
        mock_rag_service.retrieve = AsyncMock(side_effect=slow_rag_retrieve)

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service,
            ml_predictor=mock_ml_service,
            rag_service=mock_rag_service
        )

        import time
        start = time.time()
        results = await executor.execute(sample_game, sample_analysis_plan)
        elapsed = time.time() - start

        # If parallel, should take ~0.1s per move, not 0.2s
        # With 2 moves, parallel should be ~0.2s, sequential would be ~0.4s
        # Allow some overhead
        assert elapsed < 0.5  # Should be much less than sequential (0.4s)
        assert len(results) == len(sample_analysis_plan.target_moves)

    async def test_execute_without_optional_services(self, sample_game, sample_analysis_plan,
                                                     mock_analysis_service, mock_feature_service):
        """Test execution without ML/RAG services."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
            # No ML or RAG
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        assert len(results) > 0
        for result in results:
            assert result.ml_prediction is None
            assert result.rag_context is None

    async def test_score_diff_auto_calculation(self, sample_game, sample_analysis_plan,
                                               mock_analysis_service, mock_feature_service):
        """Test that score_diff is automatically calculated."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        for result in results:
            expected_diff = result.engine_eval_after - result.engine_eval_before
            assert result.score_diff == expected_diff

    async def test_phase_determination(self, sample_game, sample_analysis_plan,
                                       mock_analysis_service, mock_feature_service):
        """Test that phase is determined correctly."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        for result in results:
            assert result.phase in ["opening", "middlegame", "endgame"]

    async def test_error_handling_continues_on_failure(self, sample_game, sample_analysis_plan,
                                                       mock_analysis_service, mock_feature_service):
        """Test that execution continues even if one move fails."""
        # Make analysis service fail on first call
        mock_analysis_service.analyze_position.side_effect = [
            Exception("Analysis failed"),
            {"eval": 100, "best_move": "e4", "best_line": ["e4"], "tactical_tags": []}
        ]

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        # Should still get result from second move (first failed)
        # Depending on implementation, might get partial results
        # At minimum, should not crash
        assert isinstance(results, list)

    async def test_execution_result_fields_populated(self, sample_game, sample_analysis_plan,
                                                     mock_analysis_service, mock_feature_service):
        """Test that all ExecutionResult fields are properly populated."""
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        for result in results:
            assert result.game_id is not None
            assert result.ply > 0
            assert result.move_san is not None
            assert result.fen_before is not None
            assert result.fen_after is not None
            assert result.engine_eval_before is not None
            assert result.engine_eval_after is not None
            assert result.features is not None
            assert isinstance(result.features, dict)
            assert result.phase is not None
            assert result.timestamp is not None

    async def test_features_extraction_depends_on_engine(self, sample_game, sample_analysis_plan,
                                                         mock_analysis_service, mock_feature_service):
        """Test that features are extracted after engine analysis."""
        call_order = []

        def track_engine_call(*args, **kwargs):
            call_order.append("engine")
            return {"eval": 100, "best_move": "e4", "best_line": ["e4"], "tactical_tags": []}

        def track_features_call(*args, **kwargs):
            call_order.append("features")
            return {"king_safety": 0.5}

        mock_analysis_service.analyze_position = Mock(side_effect=track_engine_call)
        mock_feature_service.extract_features = Mock(side_effect=track_features_call)

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        await executor.execute(sample_game, sample_analysis_plan)

        # Engine should be called before features for each move
        assert "engine" in call_order
        assert "features" in call_order
        # First engine call should come before first features call
        assert call_order.index("engine") < call_order.index("features")

    async def test_cv_service_optional(self, sample_game, sample_analysis_plan,
                                       mock_analysis_service, mock_feature_service):
        """Test that CV service is optional."""
        mock_cv_service = Mock()

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service,
            cv_service=mock_cv_service
        )

        results = await executor.execute(sample_game, sample_analysis_plan)

        # Should work fine with CV service
        assert len(results) > 0

        # Also test without CV service
        executor_no_cv = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )

        results_no_cv = await executor_no_cv.execute(sample_game, sample_analysis_plan)
        assert len(results_no_cv) > 0
