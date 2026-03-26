"""
Planner Service - Arquitectura Orquestada

Responsabilidad: Decide QUÉ analizar
- Identifica jugadas críticas
- Prioriza análisis
- Define modos de ejecución (engine/ml/rag/cv)
"""

import logging
from typing import Any, Dict, List, Tuple
from uuid import UUID

from .schemas import AnalysisOptions, AnalysisPlan

logger = logging.getLogger(__name__)


class PlannerService:
    """
    Servicio de planificación de análisis de partidas.

    El Planner es el componente que decide QUÉ analizar basándose en:
    - Swing de evaluación
    - Cambio de material
    - Tácticas presentes
    - Fase de juego
    - Modo de análisis (critical/full/tactical/positional)
    """

    def __init__(self):
        """Inicializa el servicio de planificación."""
        pass

    def build_plan(self, game: Any, options: AnalysisOptions) -> AnalysisPlan:
        """
        Construye un plan de análisis para una partida.

        Args:
            game: Part objeto Game con moves y metadata
            options: Opciones de análisis (profundidad, modos, ELO adaptación)

        Returns:
            AnalysisPlan con jugadas objetivo y modos de ejecución

        Raises:
            ValueError: Si el game no tiene moves o ID válido
        """
        logger.info(f"[Planner] Construyendo plan para game {game.id}")

        # Validar inputs
        if not hasattr(game, "moves") or len(game.moves) == 0:
            raise ValueError("Game must have at least one move")

        if not hasattr(game, "id"):
            raise ValueError("Game must have an ID")

        # Identificar jugadas críticas según focus_mode
        target_moves = self._identify_critical_moments(game, options)

        # Determinar modos de análisis activos
        analysis_modes = self._determine_analysis_modes(options)

        # Asignar prioridades a cada jugada
        priorities = self._assign_priorities(game, target_moves, options)

        # Construir metadata del plan
        metadata = {
            "total_moves": len(game.moves),
            "player_color": getattr(game, "player_color", "unknown"),
            "result": getattr(game, "result", "unknown"),
            "focus_mode": options.focus_mode,
            "player_elo": options.elo_threshold if options.elo_threshold else "unknown",
        }

        plan = AnalysisPlan(
            game_id=game.id,
            target_moves=target_moves,
            analysis_modes=analysis_modes,
            priorities=priorities,
            metadata=metadata,
            options=options,
        )

        logger.info(
            f"[Planner] Plan completado: {len(target_moves)} jugadas críticas, "
            f"modos={analysis_modes}"
        )

        return plan

    def _identify_critical_moments(
        self, game: Any, options: AnalysisOptions
    ) -> List[int]:
        """
        Identifica jugadas críticas usando múltiples criterios.

        Args:
            game: Partida con moves
            options: Opciones de análisis

        Returns:
            Lista de índices de jugadas críticas ordenadas por prioridad

        Algoritmo de priorización:
        - Eval swing > 100 cp → high priority
        - Material loss ≥ 3 → high priority
        - Tactical tags → medium priority
        - Game phase consideration
        """
        critical_moves: List[Tuple[int, int]] = []  # (index, score)

        for i, move in enumerate(game.moves):
            score = 0

            # Criterio 1: Eval swing (peso alto)
            if hasattr(move, "eval_before") and hasattr(move, "eval_after"):
                eval_swing = abs(move.eval_after - move.eval_before)
                if eval_swing > 100:
                    score += 10
                elif eval_swing > 50:
                    score += 5
                elif eval_swing > 20:
                    score += 2

            # Criterio 2: Material change (peso alto)
            if hasattr(move, "material_change"):
                if move.material_change < -200:  # Pérdida de pieza menor
                    score += 8
                elif move.material_change < -100:  # Pérdida de peón
                    score += 4

            # Criterio 3: Tactical tags (peso medio)
            if hasattr(move, "tactical_tags") and move.tactical_tags:
                score += len(move.tactical_tags) * 2

            # Criterio 4: Error label si existe (peso alto)
            if hasattr(move, "error_label"):
                error_weights = {
                    "blunder": 10,
                    "mistake": 7,
                    "inaccuracy": 4,
                    "good": 0,
                }
                score += error_weights.get(move.error_label, 0)

            # Criterio 5: Fase de juego (ajuste según focus_mode)
            phase = self._get_move_phase(i, len(game.moves))
            if options.focus_mode == "tactical" and phase == "middlegame":
                score += 3
            elif options.focus_mode == "positional" and phase == "endgame":
                score += 3

            # Agregar si supera threshold
            threshold = self._get_threshold_for_focus_mode(options.focus_mode)
            if score >= threshold:
                critical_moves.append((i, score))

        # Ordenar por score descendente
        critical_moves.sort(key=lambda x: x[1], reverse=True)

        # Aplicar límite según focus_mode
        max_moves = self._get_max_moves_for_focus_mode(options.focus_mode)
        target_indices = [idx for idx, _ in critical_moves[:max_moves]]

        logger.debug(
            f"[Planner] Identified {len(target_indices)} critical moves "
            f"from {len(game.moves)} total (focus={options.focus_mode})"
        )

        return target_indices

    def _determine_analysis_modes(self, options: AnalysisOptions) -> List[str]:
        """
        Determina qué modos de análisis activar.

        Args:
            options: Opciones de análisis

        Returns:
            Lista de modos activos: ["engine", "features", "ml", "rag", "cv"]
        """
        modes = ["engine", "features"]  # Siempre activos

        if options.enable_ml:
            modes.append("ml")

        if options.enable_rag:
            modes.append("rag")

        if options.enable_cv:
            modes.append("cv")

        return modes

    def _assign_priorities(
        self, game: Any, target_moves: List[int], options: AnalysisOptions
    ) -> Dict[int, str]:
        """
        Asigna prioridad (high/medium/low) a cada jugada objetivo.

        Args:
            game: Partida
            target_moves: Índices de jugadas a analizar
            options: Opciones

        Returns:
            Diccionario {move_index: "high" | "medium" | "low"}
        """
        priorities: Dict[int, str] = {}

        for idx in target_moves:
            move = game.moves[idx]
            priority_score = 0

            # Criterio 1: Error label
            if hasattr(move, "error_label"):
                if move.error_label == "blunder":
                    priority_score += 10
                elif move.error_label == "mistake":
                    priority_score += 7
                elif move.error_label == "inaccuracy":
                    priority_score += 4

            # Criterio 2: Eval swing
            if hasattr(move, "eval_before") and hasattr(move, "eval_after"):
                eval_swing = abs(move.eval_after - move.eval_before)
                if eval_swing > 100:
                    priority_score += 8
                elif eval_swing > 50:
                    priority_score += 4

            # Criterio 3: Material loss
            if hasattr(move, "material_change") and move.material_change < -200:
                priority_score += 6

            # Asignar prioridad según score
            if priority_score >= 10:
                priorities[idx] = "high"
            elif priority_score >= 5:
                priorities[idx] = "medium"
            else:
                priorities[idx] = "low"

        return priorities

    @staticmethod
    def _get_move_phase(move_index: int, total_moves: int) -> str:
        """
        Determina la fase de juego de una jugada.

        Args:
            move_index: Índice de la jugada (0-based)
            total_moves: Total de jugadas en la partida

        Returns:
            "opening" | "middlegame" | "endgame"
        """
        if move_index < 15:
            return "opening"
        elif move_index < 40 or move_index < total_moves * 0.7:
            return "middlegame"
        else:
            return "endgame"

    @staticmethod
    def _get_threshold_for_focus_mode(focus_mode: str) -> int:
        """Retorna threshold de score para incluir jugada según focus_mode."""
        thresholds = {
            "critical": 5,  # Solo jugadas muy importantes
            "full": 0,  # Todas las jugadas
            "tactical": 3,  # Jugadas con táctica
            "positional": 4,  # Jugadas estratégicas importantes
        }
        return thresholds.get(focus_mode, 5)

    @staticmethod
    def _get_max_moves_for_focus_mode(focus_mode: str) -> int:
        """Retorna máximo de jugadas a analizar según focus_mode."""
        max_moves = {
            "critical": 20,  # Top 20 jugadas
            "full": 200,  # Prácticamente todas
            "tactical": 30,  # Jugadas tácticas
            "positional": 25,  # Jugadas estratégicas
        }
        return max_moves.get(focus_mode, 20)
