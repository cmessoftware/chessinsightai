"""
Executor Service - Arquitectura Orquestada

Responsabilidad: Produce EVIDENCIA objetiva
- Ejecuta análisis desde múltiples fuentes
- Paraleliza operaciones independientes (ML + RAG)
- Ejecuta secuencialmente operaciones dependientes (Engine → Features)
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, List, Optional

from .schemas import (
    AnalysisPlan,
    ExecutionResult,
    MLPrediction,
    RAGContext,
)

logger = logging.getLogger(__name__)


class ExecutorService:
    """
    Servicio de ejecución de análisis.

    Orquesta la producción de evidencia desde múltiples fuentes:
    - Stockfish (engine)
    - Feature extraction
    - ML models
    - RAG retrieval
    - Computer Vision (FEN extraction) - opcional
    """

    def __init__(
        self,
        engine_service: Optional[Any] = None,
        feature_service: Optional[Any] = None,
        ml_predictor: Optional[Any] = None,
        rag_service: Optional[Any] = None,
        cv_service: Optional[Any] = None,
    ):
        """
        Inicializa el servicio de ejecución.

        Args:
            engine_service: Servicio de análisis de Stockfish
            feature_service: Servicio de extracción de features
            ml_predictor: Predictor de errores ML
            rag_service: Servicio de recuperación RAG
            cv_service: Servicio de Computer Vision (opcional)
        """
        self.engine = engine_service
        self.features = feature_service
        self.ml = ml_predictor
        self.rag = rag_service
        self.cv = cv_service

        logger.info(
            f"[Executor] Inicializado con servicios: "
            f"engine={engine_service is not None}, "
            f"features={feature_service is not None}, "
            f"ml={ml_predictor is not None}, "
            f"rag={rag_service is not None}, "
            f"cv={cv_service is not None}"
        )

    async def execute(
        self, game: Any, plan: AnalysisPlan
    ) -> List[ExecutionResult]:
        """
        Ejecuta el plan de análisis y produce evidencia.

        Estrategia de paralelización:
        1. Engine + Features: Secuencial (Features dependen de Engine)
        2. ML + RAG: Paralelo (independientes)

        Args:
            game: Partida a analizar (debe tener .moves, .id, get_fen_at())
            plan: Plan generado por Planner

        Returns:
            Lista de ExecutionResult con evidencia de cada jugada

        Raises:
            ValueError: Si el game no tiene los métodos requeridos
        """
        logger.info(
            f"[Executor] Ejecutando plan: {len(plan.target_moves)} jugadas, "
            f"modos={plan.analysis_modes}"
        )

        # Validar game
        if not hasattr(game, "moves") or not hasattr(game, "id"):
            raise ValueError("Game must have 'moves' and 'id' attributes")

        if not hasattr(game, "get_fen_at"):
            raise ValueError("Game must have 'get_fen_at()' method")

        results = []
        start_time = datetime.now()

        for move_idx in plan.target_moves:
            move_start = datetime.now()

            try:
                result = await self._execute_move_analysis(game, plan, move_idx)
                results.append(result)

                logger.debug(
                    f"[Executor] Jugada {move_idx} completada en "
                    f"{(datetime.now() - move_start).total_seconds():.2f}s"
                )

            except Exception as e:
                logger.error(
                    f"[Executor] Error analizando jugada {move_idx}: {e}",
                    exc_info=True,
                )
                # Continuar con siguiente jugada
                continue

        total_time = (datetime.now() - start_time).total_seconds()
        logger.info(
            f"[Executor] Completado: {len(results)}/{len(plan.target_moves)} "
            f"jugadas en {total_time:.2f}s"
        )

        return results

    async def _execute_move_analysis(
        self, game: Any, plan: AnalysisPlan, move_idx: int
    ) -> ExecutionResult:
        """
        Ejecuta análisis completo de una jugada.

        Args:
            game: Partida
            plan: Plan de análisis
            move_idx: Índice de jugada

        Returns:
            ExecutionResult con toda la evidencia
        """
        move_start = datetime.now()

        # ====================================================================
        # PASO 1: Engine Analysis (bloqueante)
        # ====================================================================
        engine_result = await self._run_engine_analysis(game, move_idx, plan)

        # ====================================================================
        # PASO 2: Feature Extraction (depende de engine)
        # ====================================================================
        features = self._extract_features(game, move_idx, engine_result)

        # ====================================================================
        # PASO 3: ML + RAG en paralelo (independientes)
        # ====================================================================
        ml_task = None
        rag_task = None

        if "ml" in plan.analysis_modes and self.ml is not None:
            ml_task = self._run_ml_prediction(features, engine_result)

        if "rag" in plan.analysis_modes and self.rag is not None:
            rag_task = self._run_rag_retrieval(game, move_idx)

        # Ejecutar en paralelo solo si hay tasks
        ml_result = None
        rag_result = None

        if ml_task or rag_task:
            tasks = []
            if ml_task:
                tasks.append(ml_task)
            if rag_task:
                tasks.append(rag_task)

            parallel_results = await asyncio.gather(*tasks, return_exceptions=True)

            # Asignar resultados (mantener orden)
            result_idx = 0
            if ml_task:
                ml_result = (
                    parallel_results[result_idx]
                    if not isinstance(parallel_results[result_idx], Exception)
                    else None
                )
                result_idx += 1
            if rag_task:
                rag_result = (
                    parallel_results[result_idx]
                    if not isinstance(parallel_results[result_idx], Exception)
                    else None
                )

        # ====================================================================
        # PASO 4: Ensamblar resultado
        # ====================================================================
        execution_time = (datetime.now() - move_start).total_seconds()

        move = game.moves[move_idx]

        result = ExecutionResult(
            game_id=game.id,
            ply=move_idx,
            move_san=getattr(move, "san", str(move)),
            fen_before=game.get_fen_at(move_idx),
            fen_after=game.get_fen_at(move_idx + 1),
            engine_eval_before=engine_result.get("eval_before", 0.0),
            engine_eval_after=engine_result.get("eval_after", 0.0),
            score_diff=engine_result.get("score_diff", 0.0),
            best_move=engine_result.get("best_move", ""),
            best_line=engine_result.get("best_line", []),
            features=features,
            tactical_tags=engine_result.get("tactical_tags", []),
            phase=self._determine_phase(move_idx, len(game.moves)),
            ml_prediction=ml_result,
            rag_context=rag_result,
            timestamp=datetime.now(),
            execution_time=execution_time,
        )

        return result

    async def _run_engine_analysis(
        self, game: Any, move_idx: int, plan: AnalysisPlan
    ) -> dict:
        """
        Ejecuta análisis de Stockfish.

        Args:
            game: Partida
            move_idx: Índice de jugada
            plan: Plan (tiene depth en options)

        Returns:
            dict con eval_before, eval_after, best_move, best_line, tactical_tags
        """
        if self.engine is None:
            logger.warning("[Executor] Engine service not available")
            return {
                "eval_before": 0.0,
                "eval_after": 0.0,
                "score_diff": 0.0,
                "best_move": "",
                "best_line": [],
                "tactical_tags": [],
            }

        try:
            fen = game.get_fen_at(move_idx)
            depth = plan.options.depth

            # TODO: Adaptar a la interface real de AnalysisService
            # Por ahora, placeholder
            analysis = await self._engine_analyze_position(fen, depth)

            return analysis

        except Exception as e:
            logger.error(f"[Executor] Error en engine analysis: {e}")
            return {
                "eval_before": 0.0,
                "eval_after": 0.0,
                "score_diff": 0.0,
                "best_move": "",
                "best_line": [],
                "tactical_tags": [],
            }

    async def _engine_analyze_position(self, fen: str, depth: int) -> dict:
        """
        Placeholder para análisis de engine.
        TODO: Implementar integración real con AnalysisService
        """
        # Simular análisis asíncrono
        await asyncio.sleep(0.1)

        return {
            "eval_before": 0.0,
            "eval_after": 0.0,
            "score_diff": 0.0,
            "best_move": "e2e4",
            "best_line": ["e2e4", "e7e5", "Ng1f3"],
            "tactical_tags": [],
        }

    def _extract_features(
        self, game: Any, move_idx: int, engine_result: dict
    ) -> dict:
        """
        Extrae features de la posición.

        Args:
            game: Partida
            move_idx: Índice de jugada
            engine_result: Resultado del engine

        Returns:
            dict con features {feature_name: value}
        """
        if self.features is None:
            logger.warning("[Executor] Feature service not available")
            return {}

        try:
            # TODO: Adaptar a la interface real de FeatureService
            # Por ahora, placeholder
            features = {
                "king_safety": 0.5,
                "material_balance": 0.0,
                "center_control": 0.6,
                "piece_activity": 0.7,
            }

            return features

        except Exception as e:
            logger.error(f"[Executor] Error en feature extraction: {e}")
            return {}

    async def _run_ml_prediction(
        self, features: dict, engine_result: dict
    ) -> Optional[MLPrediction]:
        """
        Ejecuta predicción ML de error.

        Args:
            features: Features extraídas
            engine_result: Resultado del engine

        Returns:
            MLPrediction o None si falla
        """
        if self.ml is None:
            return None

        try:
            # TODO: Adaptar a la interface real de ChessErrorPredictor
            # Por ahora, placeholder
            await asyncio.sleep(0.05)  # Simular predicción

            prediction = MLPrediction(
                predicted_error="good",
                confidence=0.85,
                risk_score=0.15,
                contributing_features=[
                    {"feature_name": "king_safety", "impact": 0.3},
                    {"feature_name": "center_control", "impact": 0.2},
                ],
            )

            return prediction

        except Exception as e:
            logger.error(f"[Executor] Error en ML prediction: {e}")
            return None

    async def _run_rag_retrieval(
        self, game: Any, move_idx: int
    ) -> Optional[RAGContext]:
        """
        Recupera contexto similar via RAG.

        Args:
            game: Partida
            move_idx: Índice de jugada

        Returns:
            RAGContext o None si falla
        """
        if self.rag is None:
            return None

        try:
            # TODO: Implementar RAG service real
            # Por ahora, placeholder
            await asyncio.sleep(0.05)  # Simular retrieval

            context = RAGContext(
                similar_positions=[],
                book_excerpts=[],
                player_patterns=[],
                total_retrieved=0,
                relevance_scores=[],
            )

            return context

        except Exception as e:
            logger.error(f"[Executor] Error en RAG retrieval: {e}")
            return None

    @staticmethod
    def _determine_phase(move_idx: int, total_moves: int) -> str:
        """
        Determina la fase de juego.

        Args:
            move_idx: Índice de la jugada
            total_moves: Total de jugadas

        Returns:
            "opening" | "middlegame" | "endgame"
        """
        if move_idx < 15:
            return "opening"
        elif move_idx < 40 or move_idx < total_moves * 0.7:
            return "middlegame"
        else:
            return "endgame"
