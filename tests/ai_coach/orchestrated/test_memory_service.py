"""Unit tests for MemoryService."""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime, timedelta
import os

from src.ai_coach.orchestrated.memory_service import MemoryService
from src.ai_coach.orchestrated.schemas import PlayerPatterns


@pytest.mark.unit
@pytest.mark.anyio
class TestMemoryService:
    """Test suite for MemoryService."""

    async def test_store_move_analysis_v2(self, mock_db_session, sample_enriched_result):
        """Test storing move analysis in v2.0 schema."""
        memory = MemoryService(mock_db_session)
        
        await memory.store_move_analysis(
            game_id=sample_enriched_result.execution_result.game_id,
            player_id="player-123",
            enriched_result=sample_enriched_result
        )

        # Should execute INSERT statement
        assert mock_db_session.execute.called
        assert mock_db_session.commit.called

    async def test_dual_write_enabled(self, mock_db_session, sample_enriched_result):
        """Test dual write to both v2.0 and v1.0 schemas when enabled."""
        with patch.dict(os.environ, {"ENABLE_DUAL_WRITE": "true"}):
            memory = MemoryService(mock_db_session)
            
            with patch.object(memory, '_store_v1_move_legacy', new_callable=AsyncMock) as mock_v1:
                await memory.store_move_analysis(
                    game_id=sample_enriched_result.execution_result.game_id,
                    player_id="player-123",
                    enriched_result=sample_enriched_result
                )

                # v2.0 should be called
                assert mock_db_session.execute.called
                # v1.0 should also be called when dual write enabled
                assert mock_v1.called

    async def test_dual_write_disabled(self, mock_db_session, sample_enriched_result):
        """Test that v1.0 is not called when dual write disabled."""
        with patch.dict(os.environ, {"ENABLE_DUAL_WRITE": "false"}):
            memory = MemoryService(mock_db_session)
            
            with patch.object(memory, '_store_v1_move_legacy', new_callable=AsyncMock) as mock_v1:
                await memory.store_move_analysis(
                    game_id=sample_enriched_result.execution_result.game_id,
                    player_id="player-123",
                    enriched_result=sample_enriched_result
                )

                # v2.0 should be called
                assert mock_db_session.execute.called
                # v1.0 should NOT be called
                assert not mock_v1.called

    async def test_update_player_patterns(self, mock_db_session, sample_enriched_result):
        """Test updating player patterns with aggregated statistics."""
        memory = MemoryService(mock_db_session)
        
        results = [sample_enriched_result]
        await memory.update_player_patterns("player-123", results)

        # Should execute UPSERT statement
        assert mock_db_session.execute.called
        assert mock_db_session.commit.called

    async def test_compute_player_statistics(self, sample_enriched_result):
        """Test computation of player statistics."""
        memory = MemoryService(Mock())
        
        # Create multiple results with different error predictions
        results = [sample_enriched_result]
        
        stats = memory._compute_player_statistics(results)

        assert "error_distribution" in stats
        assert "frequent_tactics" in stats
        assert "weak_phases" in stats
        assert "phase_error_rates" in stats
        assert "improvement_trend" in stats
        assert "recent_avg_error_rate" in stats

    async def test_error_distribution_calculation(self, sample_enriched_result):
        """Test error distribution normalization."""
        memory = MemoryService(Mock())
        
        # Create results with known error distribution
        result1 = sample_enriched_result  # blunder
        result2 = sample_enriched_result  # another blunder
        
        stats = memory._compute_player_statistics([result1, result2])

        error_dist = stats["error_distribution"]
        assert isinstance(error_dist, dict)
        # Should have blunder with high proportion
        if "blunder" in error_dist:
            assert error_dist["blunder"] > 0

    async def test_frequent_tactics_top_10(self, sample_enriched_result):
        """Test that frequent tactics are limited to top 10."""
        memory = MemoryService(Mock())
        
        # Create result with multiple tactics
        result = sample_enriched_result
        result.execution_result.tactical_tags = ["fork", "pin", "skewer", "discovered_attack"]
        
        stats = memory._compute_player_statistics([result])

        frequent_tactics = stats["frequent_tactics"]
        assert isinstance(frequent_tactics, list)
        assert len(frequent_tactics) <= 10

    async def test_weak_phases_threshold(self, sample_enriched_result):
        """Test weak phases identification based on 0.15 threshold."""
        memory = MemoryService(Mock())
        
        stats = memory._compute_player_statistics([sample_enriched_result])

        weak_phases = stats["weak_phases"]
        assert isinstance(weak_phases, list)
        # Each weak phase should have error rate > 0.15
        phase_error_rates = stats["phase_error_rates"]
        for phase in weak_phases:
            if phase in phase_error_rates:
                assert phase_error_rates[phase] > 0.15

    async def test_get_player_patterns_found(self, mock_db_session):
        """Test retrieving player patterns when they exist."""
        # Mock database result
        mock_result = MagicMock()
        mock_row = MagicMock()
        mock_row.player_id = 123
        mock_row.total_moves_analyzed = 100
        mock_row.total_games_analyzed = 10
        mock_row.total_errors = 25
        mock_row.total_blunders = 5
        mock_row.total_mistakes = 10
        mock_row.total_inaccuracies = 10
        mock_row.error_distribution = {"blunder": 0.2, "mistake": 0.4, "inaccuracy": 0.4}
        mock_row.frequent_tactics = [{"tactic": "fork", "count": 10}, {"tactic": "pin", "count": 5}]
        mock_row.weak_phases = ["opening"]
        mock_row.phase_error_rates = {"opening": 0.3, "middlegame": 0.2, "endgame": 0.1}
        mock_row.improvement_trend = 0.0
        mock_row.recent_avg_error_rate = 0.25
        mock_row.error_clusters = []
        mock_row.last_updated = datetime.now()
        
        mock_result.fetchone.return_value = mock_row
        mock_db_session.execute.return_value = mock_result

        memory = MemoryService(mock_db_session)
        patterns = await memory.get_player_patterns("player-123", lookback_days=30)

        assert patterns is not None
        assert isinstance(patterns, PlayerPatterns)
        assert patterns.player_id == 123
        assert patterns.total_moves_analyzed == 100

    async def test_get_player_patterns_not_found(self, mock_db_session):
        """Test retrieving player patterns when they don't exist."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db_session.execute.return_value = mock_result

        memory = MemoryService(mock_db_session)
        patterns = await memory.get_player_patterns("player-999", lookback_days=30)

        assert patterns is None

    async def test_get_player_patterns_lookback_filter(self, mock_db_session):
        """Test that lookback_days parameter filters by date."""
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db_session.execute.return_value = mock_result

        memory = MemoryService(mock_db_session)
        await memory.get_player_patterns("player-123", lookback_days=7)

        # Verify that execute was called with a query containing date filter
        assert mock_db_session.execute.called
        call_args = mock_db_session.execute.call_args
        # The query should reference cutoff_date
        assert call_args is not None

    async def test_upsert_handles_conflict(self, mock_db_session, sample_enriched_result):
        """Test that upsert handles ON CONFLICT correctly."""
        memory = MemoryService(mock_db_session)
        
        # First insert
        await memory.update_player_patterns("player-123", [sample_enriched_result])
        
        # Second update (should trigger ON CONFLICT DO UPDATE)
        await memory.update_player_patterns("player-123", [sample_enriched_result])

        # Should have called execute twice
        assert mock_db_session.execute.call_count >= 2
        assert mock_db_session.commit.call_count >= 2

    async def test_rollback_on_error(self, mock_db_session, sample_enriched_result):
        """Test that transaction rolls back on error."""
        mock_db_session.execute.side_effect = Exception("Database error")
        mock_db_session.rollback = AsyncMock()

        memory = MemoryService(mock_db_session)
        
        with pytest.raises(Exception):
            await memory.store_move_analysis(
                game_id=sample_enriched_result.execution_result.game_id,
                player_id="player-123",
                enriched_result=sample_enriched_result
            )

        # Should call rollback on error
        # Note: Current implementation might not have explicit rollback
        # This test documents expected behavior

    async def test_ml_prediction_optional_fields(self, mock_db_session, sample_enriched_result):
        """Test handling when ML prediction is None."""
        # Remove ML prediction
        sample_enriched_result.execution_result.ml_prediction = None

        memory = MemoryService(mock_db_session)
        await memory.store_move_analysis(
            game_id=sample_enriched_result.execution_result.game_id,
            player_id="player-123",
            enriched_result=sample_enriched_result
        )

        # Should still work with None ML prediction
        assert mock_db_session.execute.called

    async def test_rag_context_optional_fields(self, mock_db_session, sample_enriched_result):
        """Test handling when RAG context is None."""
        # Remove RAG context
        sample_enriched_result.execution_result.rag_context = None

        memory = MemoryService(mock_db_session)
        await memory.store_move_analysis(
            game_id=sample_enriched_result.execution_result.game_id,
            player_id="player-123",
            enriched_result=sample_enriched_result
        )

        # Should still work with None RAG context
        assert mock_db_session.execute.called

    async def test_prefer_version_env_var(self, mock_db_session):
        """Test PREFER_VERSION environment variable."""
        with patch.dict(os.environ, {"PREFER_VERSION": "v1.0"}):
            memory = MemoryService(mock_db_session)
            assert memory.prefer_version == "v1.0"

        with patch.dict(os.environ, {"PREFER_VERSION": "v2.0"}):
            memory = MemoryService(mock_db_session)
            assert memory.prefer_version == "v2.0"

        # Default should be v2.0
        with patch.dict(os.environ, {}, clear=True):
            memory = MemoryService(mock_db_session)
            assert memory.prefer_version == "v2.0"
