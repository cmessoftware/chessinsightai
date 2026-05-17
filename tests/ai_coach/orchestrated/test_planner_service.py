"""Unit tests for PlannerService."""

import pytest
from unittest.mock import Mock

from src.ai_coach.orchestrated.planner_service import PlannerService
from src.ai_coach.orchestrated.schemas import AnalysisOptions


@pytest.mark.unit
class TestPlannerService:
    """Test suite for PlannerService."""

    def test_build_plan_critical_mode(self, sample_game, analysis_options):
        """Test plan generation in critical focus mode."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        assert plan.game_id == sample_game.id
        assert len(plan.target_moves) > 0
        assert "engine" in plan.analysis_modes
        assert "features" in plan.analysis_modes
        assert "ml" in plan.analysis_modes  # enabled in options
        assert "rag" in plan.analysis_modes  # enabled in options
        assert plan.options == analysis_options

    def test_build_plan_full_mode(self, sample_game):
        """Test plan generation in full focus mode."""
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="full"
        )
        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Full mode should analyze more moves
        assert len(plan.target_moves) >= len([m for m in sample_game.moves if m.ply > 0])
        assert "ml" not in plan.analysis_modes  # disabled in options
        assert "rag" not in plan.analysis_modes  # disabled in options

    def test_identify_critical_moments_blunder(self, sample_game, analysis_options):
        """Test that blunders are identified as critical."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        # Ply 10 is a blunder (-200cp eval swing, -300 material, 2 tactical tags)
        assert 10 in plan.target_moves
        assert plan.priorities.get(10) == "high"

    def test_identify_critical_moments_mistake(self, sample_game, analysis_options):
        """Test that mistakes are identified."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        # Ply 15 is a mistake
        assert 15 in plan.target_moves

    def test_priority_assignment_high(self, sample_game, analysis_options):
        """Test high priority assignment for critical moves."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        # Blunder should be high priority
        blunder_ply = 10
        assert plan.priorities.get(blunder_ply) in ["high"]

    def test_priority_assignment_medium(self, sample_game, analysis_options):
        """Test medium priority assignment."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        # Mistake should be medium priority
        mistake_ply = 15
        assert plan.priorities.get(mistake_ply) in ["medium", "high"]

    def test_focus_mode_critical_limits_moves(self, sample_game):
        """Test that critical mode limits number of moves analyzed."""
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

        # Critical mode should limit to max 20 moves
        assert len(plan.target_moves) <= 20

    def test_focus_mode_tactical(self, sample_game):
        """Test tactical focus mode."""
        options = AnalysisOptions(
            depth=20,
            enable_ml=True,
            enable_rag=True,
            enable_cv=False,
            elo_threshold=1200,
            focus_mode="tactical"
        )
        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        # Should prioritize moves with tactical tags
        tactical_moves = [m.ply for m in sample_game.moves if m.tactical_tags]
        for ply in tactical_moves:
            if ply in plan.target_moves:
                # Tactical moves should have high priority in tactical mode
                assert plan.priorities.get(ply) in ["high", "medium"]

    def test_analysis_modes_based_on_options(self, sample_game):
        """Test that analysis modes reflect options correctly."""
        # Test with ML and RAG disabled
        options = AnalysisOptions(
            depth=20,
            enable_ml=False,
            enable_rag=False,
            enable_cv=True,  # CV enabled
            elo_threshold=1200,
            focus_mode="critical"
        )
        planner = PlannerService()
        plan = planner.build_plan(sample_game, options)

        assert "engine" in plan.analysis_modes
        assert "features" in plan.analysis_modes
        assert "ml" not in plan.analysis_modes
        assert "rag" not in plan.analysis_modes
        assert "cv" in plan.analysis_modes

    def test_phase_determination(self):
        """Test phase determination logic."""
        planner = PlannerService()

        # Test opening phase
        assert planner._get_move_phase(5, 100) == "opening"
        assert planner._get_move_phase(12, 100) == "opening"

        # Test middlegame phase
        assert planner._get_move_phase(20, 100) == "middlegame"
        assert planner._get_move_phase(35, 80) == "middlegame"

        # Test endgame phase
        assert planner._get_move_phase(45, 100) == "endgame"
        assert planner._get_move_phase(42, 60) == "endgame"

    def test_threshold_for_focus_modes(self):
        """Test score thresholds for different focus modes."""
        planner = PlannerService()

        assert planner._get_threshold_for_focus_mode("critical") == 5
        assert planner._get_threshold_for_focus_mode("full") == 0
        assert planner._get_threshold_for_focus_mode("tactical") == 3
        assert planner._get_threshold_for_focus_mode("positional") == 4

    def test_max_moves_for_focus_modes(self):
        """Test max moves limits for different focus modes."""
        planner = PlannerService()

        assert planner._get_max_moves_for_focus_mode("critical") == 20
        assert planner._get_max_moves_for_focus_mode("full") == 200
        assert planner._get_max_moves_for_focus_mode("tactical") == 30
        assert planner._get_max_moves_for_focus_mode("positional") == 25

    def test_metadata_populated(self, sample_game, analysis_options):
        """Test that plan metadata is populated correctly."""
        planner = PlannerService()
        plan = planner.build_plan(sample_game, analysis_options)

        assert "total_moves" in plan.metadata
        assert plan.metadata["total_moves"] > 0
        assert "focus_mode" in plan.metadata
        assert plan.metadata["focus_mode"] == "critical"

    def test_empty_game_handling(self, analysis_options):
        """Test handling of game with no moves."""
        import uuid
        empty_game = Mock()
        empty_game.id = uuid.uuid4()
        empty_game.moves = []

        planner = PlannerService()
        plan = planner.build_plan(empty_game, analysis_options)

        assert len(plan.target_moves) == 0
        assert plan.metadata["total_moves"] == 0
