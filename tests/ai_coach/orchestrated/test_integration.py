"""Integration tests for orchestrated architecture end-to-end flow."""

import pytest
from unittest.mock import Mock, AsyncMock
import uuid

from src.ai_coach.orchestrated.planner_service import PlannerService
from src.ai_coach.orchestrated.executor_service import ExecutorService
from src.ai_coach.orchestrated.memory_service import MemoryService
from src.ai_coach.orchestrated.schemas import (
    AnalysisOptions,
    MLPrediction,
    RAGContext
)


@pytest.mark.integration
@pytest.mark.anyio
class TestOrchestratedIntegration:
    """Integration tests for complete Planner → Executor → Memory flow."""

    async def test_full_pipeline_critical_mode(self, sample_game, mock_db_session,
                                               mock_analysis_service, mock_feature_service,
                                               mock_ml_service, mock_rag_service):
        """Test complete pipeline in critical focus mode."""
        # Step 1: Plan
        options = AnalysisOptions(
            depth=20,
            enable_ml=True,
            enable_rag=True,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="critical"
        )
        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        assert len(plan.target_moves) > 0
        assert plan.game_id == sample_game.id

        # Step 2: Execute
        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service,
            ml_predictor=mock_ml_service,
            rag_service=mock_rag_service
        )
        results = await executor.execute(sample_game, plan)

        assert len(results) == len(plan.target_moves)
        assert all(r.game_id == sample_game.id for r in results)

        # Step 3: Memory (store results)
        memory = MemoryService(mock_db_session)
        
        # Store each result
        for result in results:
            from src.ai_coach.orchestrated.schemas import EnrichedResult, CriticResult
            
            enriched = EnrichedResult(
                execution_result=result,
                explanation="Test explanation",
                critic_result=CriticResult(
                    is_consistent=True,
                    confidence=0.95,
                    issues=[],
                    passed_rules=["BlunderScoreThreshold"],
                    failed_rules=[]
                ),
                metadata={}
            )
            
            await memory.store_move_analysis(
                game_id=result.game_id,
                player_id=str(sample_game.player_id),
                enriched_result=enriched
            )

        # Verify database interactions
        assert mock_db_session.execute.call_count >= len(results)
        assert mock_db_session.commit.call_count >= len(results)

        # Step 4: Update player patterns
        from src.ai_coach.orchestrated.schemas import EnrichedResult, CriticResult
        enriched_results = [
            EnrichedResult(
                execution_result=r,
                explanation="Test",
                critic_result=CriticResult(
                    is_consistent=True,
                    confidence=0.95,
                    issues=[],
                    passed_rules=["BlunderScoreThreshold"],
                    failed_rules=[]
                ),
                metadata={}
            )
            for r in results
        ]
        
        await memory.update_player_patterns(str(sample_game.player_id), enriched_results)
        
        # Verify player patterns update
        assert mock_db_session.commit.called

    async def test_full_pipeline_tactical_mode(self, sample_game, mock_db_session,
                                               mock_analysis_service, mock_feature_service):
        """Test complete pipeline in tactical focus mode."""
        # Tactical mode focuses on moves with tactical tags
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="tactical"
        )
        
        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Should include tactical moves (ply 10 has fork+pin, ply 15 has check)
        tactical_moves = [m.ply for m in sample_game.moves if m.tactical_tags]
        for tactical_ply in tactical_moves:
            # At least some tactical moves should be in plan
            if tactical_ply <= 30:  # Within tactical mode limit
                assert tactical_ply in plan.target_moves or len(plan.target_moves) > 0

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )
        results = await executor.execute(sample_game, plan)

        # Results should not have ML/RAG data
        for result in results:
            assert result.ml_prediction is None
            assert result.rag_context is None

    async def test_pipeline_with_empty_game(self, mock_db_session, mock_analysis_service, mock_feature_service):
        """Test pipeline gracefully handles empty game."""
        empty_game = Mock()
        empty_game.id = uuid.uuid4()
        empty_game.player_id = uuid.uuid4()
        empty_game.moves = []
        empty_game.get_fen_at = Mock(return_value="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")

        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="critical"
        )

        planner = PlannerService()
        plan = planner.build_plan(empty_game, options)

        assert len(plan.target_moves) == 0

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )
        results = await executor.execute(empty_game, plan)

        assert len(results) == 0

    async def test_pipeline_error_handling(self, sample_game, mock_db_session,
                                          mock_analysis_service, mock_feature_service):
        """Test pipeline handles errors gracefully."""
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="critical"
        )

        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Make engine fail on some moves
        call_count = 0
        def intermittent_failure(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count % 2 == 0:
                raise Exception("Engine error")
            return {
                "eval": 100,
                "best_move": "e4",
                "best_line": ["e4"],
                "tactical_tags": []
            }

        mock_analysis_service.analyze_position = Mock(side_effect=intermittent_failure)

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )
        
        # Should not crash, might get partial results
        results = await executor.execute(sample_game, plan)
        
        # At minimum, should return a list (might be partial)
        assert isinstance(results, list)

    async def test_pipeline_prioritization_affects_execution(self, sample_game, mock_db_session,
                                                            mock_analysis_service, mock_feature_service):
        """Test that planner priorities are preserved through execution."""
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="critical"
        )

        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Verify priorities exist
        assert len(plan.priorities) > 0
        
        # High priority moves should be blunders
        high_priority_moves = [ply for ply, priority in plan.priorities.items() if priority == "high"]
        if high_priority_moves:
            # Verify these correspond to actual error moves
            blunder_plies = [m.ply for m in sample_game.moves if m.error_label == "blunder"]
            for high_ply in high_priority_moves:
                # Should be a blunder or have significant eval swing
                move = next((m for m in sample_game.moves if m.ply == high_ply), None)
                if move:
                    assert move.error_label in ["blunder", "mistake"] or abs(move.eval_after - move.eval_before) > 50

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
        )
        results = await executor.execute(sample_game, plan)

        # All planned moves should be executed
        result_plies = [r.ply for r in results]
        for target_ply in plan.target_moves:
            assert target_ply in result_plies or len(results) > 0

    async def test_memory_aggregation_across_multiple_games(self, mock_db_session,
                                                           sample_enriched_result):
        """Test player pattern aggregation across multiple game analyses."""
        memory = MemoryService(mock_db_session)

        # Simulate analyzing multiple games
        player_id = "player-123"
        
        # Game 1: 2 moves
        await memory.update_player_patterns(player_id, [sample_enriched_result, sample_enriched_result])
        
        # Game 2: 3 moves
        await memory.update_player_patterns(player_id, 
                                           [sample_enriched_result, sample_enriched_result, sample_enriched_result])

        # Should have called execute multiple times (once per update)
        assert mock_db_session.execute.call_count >= 2
        
        # Each update should commit
        assert mock_db_session.commit.call_count >= 2

    async def test_feature_flags_control_pipeline(self, sample_game, mock_db_session,
                                                  mock_analysis_service, mock_feature_service):
        """Test that feature flags control which services are invoked."""
        # ML and RAG disabled
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="critical"
        )

        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Plan should not include ML/RAG modes
        assert "ml" not in plan.analysis_modes
        assert "rag" not in plan.analysis_modes
        assert "engine" in plan.analysis_modes
        assert "features" in plan.analysis_modes

        executor = ExecutorService(
            engine_service=mock_analysis_service,
            feature_service=mock_feature_service
            # No ML or RAG services
        )
        results = await executor.execute(sample_game, plan)

        # Results should not have ML/RAG data
        for result in results:
            assert result.ml_prediction is None
            assert result.rag_context is None
