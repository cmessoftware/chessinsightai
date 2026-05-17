---
OBSOLETE: true
OBSOLETE_DATE: 2026-04-24
OBSOLETE_REASON: Consolidado por módulos en docs/ai_chess_coach/2-architecture/modules/
CANONICAL_LOCATION: docs/ai_chess_coach/2-architecture/modules/
---

> [!WARNING]
> Documento obsoleto. No editar. Usar versión consolidada por módulo en docs/ai_chess_coach/2-architecture/modules/.
# Fase 0 - Especificación Técnica Detallada

**Fecha:** Marzo 25, 2026  
**Versión:** 1.0  
**Estado:** En Desarrollo  
**Issue:** [#85](https://github.com/cmessoftware/chessinsightai/issues/85)

---

## Objetivo

Definir la especificación técnica completa de los componentes de la Arquitectura Orquestada (Planner/Executor/Critic/Memory) antes de iniciar la implementación.

Este documento establece:
- Interfaces y contratos de cada componente
- Reglas de validación del Critic
- Schemas de datos
- Patrones de diseño a utilizar

---

## 1. Componentes del Sistema

### 1.1 Planner (Planificador)

**Responsabilidad:** Decide QUÉ analizar y CÓMO analizarlo.

#### Interfaz

```python
class PlannerService:
    """
    Servicio de planificación de análisis de partidas.
    
    Responsabilidades:
    - Identificar jugadas críticas
    - Priorizar análisis
    - Definir modos de ejecución (engine/ml/rag/cv)
    """
    
    def build_plan(
        self, 
        game: Game, 
        options: AnalysisOptions
    ) -> AnalysisPlan:
        """
        Construye un plan de análisis para una partida.
        
        Args:
            game: Partida a analizar
            options: Opciones de análisis (profundidad, modos, ELO adaptación)
            
        Returns:
            AnalysisPlan con jugadas objetivo y modos de ejecución
        """
        pass
```

#### Modelo de Datos

```python
@dataclass
class AnalysisOptions:
    """Opciones de configuración del análisis."""
    depth: int = 20  # Profundidad Stockfish
    enable_ml: bool = True
    enable_rag: bool = True
    enable_cv: bool = False
    elo_threshold: int = None  # ELO del jugador para adaptación
    focus_mode: str = "critical"  # critical | full | tactical | positional
    
@dataclass
class AnalysisPlan:
    """Plan de análisis generado por Planner."""
    game_id: str
    target_moves: List[int]  # Índices de jugadas a analizar
    analysis_modes: List[str]  # ["engine", "features", "ml", "rag"]
    priorities: Dict[int, str]  # {move_index: "high" | "medium" | "low"}
    metadata: Dict[str, Any]  # Información adicional
```

#### Algoritmo de Priorización

**Criterios de selección de jugadas críticas:**

1. **Evaluación Swing (Alta prioridad)**
   - Cambio de evaluación > 100 cp → `high`
   - Cambio de evaluación 50-100 cp → `medium`
   - Cambio de evaluación 20-50 cp → `low`

2. **Cambio de Material (Alta prioridad)**
   - Pérdida de calidad ≥ 3 → `high`
   - Pérdida de calidad 1-2 → `medium`

3. **Jugadas Tácticas (Media prioridad)**
   - Fork, pin, skewer → `medium`
   - Discovered attack → `medium`

4. **Fases de Juego**
   - Apertura (moves 1-15): analizar si hay inaccuracies
   - Mediojuego (moves 16-40): foco en tácticas
   - Final (moves 40+): precisión técnica

**Ejemplo de Implementación:**

```python
def _identify_critical_moments(self, game: Game) -> List[int]:
    """
    Identifica jugadas críticas usando múltiples criterios.
    
    Returns:
        Lista de índices de jugadas críticas ordenadas por prioridad
    """
    critical_moves = []
    
    for i, move in enumerate(game.moves):
        score = 0
        
        # Criterio 1: Eval swing
        eval_swing = abs(move.eval_after - move.eval_before)
        if eval_swing > 100:
            score += 10
        elif eval_swing > 50:
            score += 5
            
        # Criterio 2: Material loss
        if move.material_change < -200:  # Pérdida pieza
            score += 8
            
        # Criterio 3: Tactical tags
        if move.tactical_tags:
            score += 3
            
        # Criterio 4: Error label (si existe)
        if hasattr(move, 'error_label'):
            error_weights = {
                'blunder': 10,
                'mistake': 7,
                'inaccuracy': 4
            }
            score += error_weights.get(move.error_label, 0)
            
        if score >= 5:  # Threshold para considerar crítica
            critical_moves.append((i, score))
    
    # Ordenar por score descendente y retornar top N
    critical_moves.sort(key=lambda x: x[1], reverse=True)
    return [idx for idx, _ in critical_moves[:20]]  # Max 20 jugadas
```

---

### 1.2 Executor (Ejecutor)

**Responsabilidad:** Produce EVIDENCIA objetiva usando múltiples fuentes.

#### Interfaz

```python
class ExecutorService:
    """
    Servicio de ejecución de análisis.
    
    Orquesta la producción de evidencia desde múltiples fuentes:
    - Stockfish (engine)
    - Feature extraction
    - ML models
    - RAG retrieval
    - Computer Vision (FEN extraction)
    """
    
    def __init__(
        self,
        engine_service: AnalysisService,
        feature_summarizer: FeatureSummarizer,
        ml_predictor: ChessErrorPredictor,
        rag_service: ChessRAG,
        cv_service: Optional[CVService] = None
    ):
        self.engine = engine_service
        self.features = feature_summarizer
        self.ml = ml_predictor
        self.rag = rag_service
        self.cv = cv_service
        
    def execute(
        self, 
        game: Game, 
        plan: AnalysisPlan
    ) -> List[ExecutionResult]:
        """
        Ejecuta el plan de análisis y produce evidencia.
        
        Args:
            game: Partida a analizar
            plan: Plan generado por Planner
            
        Returns:
            Lista de ExecutionResult con evidencia de cada jugada
        """
        pass
```

#### Modelo de Datos

```python
@dataclass
class ExecutionResult:
    """Resultado de ejecución de análisis de una jugada."""
    
    # Identificación
    game_id: str
    ply: int  # Índice de jugada (0-based)
    move_san: str  # Notación algebraica (e.g., "Nf3")
    fen_before: str
    fen_after: str
    
    # Evaluación Engine
    engine_eval_before: float  # Centipawns
    engine_eval_after: float
    score_diff: float  # eval_after - eval_before
    best_move: str  # Mejor jugada según engine
    best_line: List[str]  # Línea principal
    
    # Features Extraídas
    features: Dict[str, float]  # {feature_name: value}
    tactical_tags: List[str]  # ["fork", "pin", etc.]
    phase: str  # "opening" | "middlegame" | "endgame"
    
    # Predicción ML
    ml_prediction: Optional[MLPrediction] = None
    
    # Contexto RAG
    rag_context: Optional[RAGContext] = None
    
    # Metadata
    timestamp: datetime
    execution_time: float  # Segundos
    
@dataclass
class MLPrediction:
    """Predicción del modelo ML."""
    predicted_error: str  # "good" | "inaccuracy" | "mistake" | "blunder"
    confidence: float  # 0.0 - 1.0
    risk_score: float  # 0.0 - 1.0
    contributing_features: List[Tuple[str, float]]  # [(feature, impact), ...]
    
@dataclass
class RAGContext:
    """Contexto recuperado del RAG."""
    similar_positions: List[Dict]  # Posiciones similares con metadata
    book_excerpts: List[str]  # Extractos de libros relevantes
    player_patterns: List[Dict]  # Patrones históricos del jugador
    total_retrieved: int
    relevance_scores: List[float]
```

#### Implementación de Ejecución Paralela

```python
async def execute(self, game: Game, plan: AnalysisPlan) -> List[ExecutionResult]:
    """
    Ejecuta análisis con paralelización para eficiencia.
    
    Estrategia:
    1. Engine + Features: Secuencial (Features dependen de Engine)
    2. ML + RAG: Paralelo (independientes)
    """
    results = []
    
    for move_idx in plan.target_moves:
        # Paso 1: Engine analysis (bloqueante)
        engine_result = await self.engine.analyze_position(
            game.get_fen_at(move_idx),
            depth=plan.options.depth
        )
        
        # Paso 2: Feature extraction (depende de engine)
        features = self.features.extract_features(
            move_idx,
            engine_result
        )
        
        # Paso 3: ML + RAG en paralelo
        ml_task = self._run_ml_prediction(features) if "ml" in plan.analysis_modes else None
        rag_task = self._run_rag_retrieval(game.get_fen_at(move_idx)) if "rag" in plan.analysis_modes else None
        
        ml_result, rag_result = await asyncio.gather(ml_task, rag_task)
        
        # Paso 4: Ensamblar resultado
        result = ExecutionResult(
            game_id=game.id,
            ply=move_idx,
            move_san=game.moves[move_idx].san,
            fen_before=game.get_fen_at(move_idx),
            fen_after=game.get_fen_at(move_idx + 1),
            engine_eval_before=engine_result.eval_before,
            engine_eval_after=engine_result.eval_after,
            score_diff=engine_result.eval_after - engine_result.eval_before,
            best_move=engine_result.best_move,
            best_line=engine_result.principal_variation,
            features=features,
            tactical_tags=engine_result.tactical_tags,
            phase=self._determine_phase(move_idx),
            ml_prediction=ml_result,
            rag_context=rag_result,
            timestamp=datetime.now(),
            execution_time=0.0  # Calculado
        )
        
        results.append(result)
    
    return results
```

---

### 1.3 Critic (Crítico)

**Responsabilidad:** Valida COHERENCIA de resultados antes de generar explicaciones.

#### Interfaz

```python
class CriticService:
    """
    Servicio de validación de coherencia.
    
    Aplica reglas programáticas para detectar:
    - Inconsistencias lógicas
    - Explicaciones sin soporte
    - Predicciones contradictorias
    """
    
    def __init__(self, rules: List[ValidationRule]):
        self.rules = rules
        
    def validate(
        self,
        execution_result: ExecutionResult,
        explanation: Optional[str] = None
    ) -> CriticResult:
        """
        Valida coherencia del resultado de ejecución.
        
        Args:
            execution_result: Resultado del Executor
            explanation: Explicación generada (opcional, para validación post-LLM)
            
        Returns:
            CriticResult con is_consistent, issues, confidence
        """
        pass
```

#### Modelo de Datos

```python
@dataclass
class CriticResult:
    """Resultado de validación del Critic."""
    is_consistent: bool
    confidence: float  # 0.0 - 1.0
    issues: List[ValidationIssue]
    passed_rules: List[str]  # Nombres de reglas que pasaron
    failed_rules: List[str]  # Nombres de reglas que fallaron
    
@dataclass
class ValidationIssue:
    """Problema detectado por el Critic."""
    rule_name: str
    severity: str  # "error" | "warning" | "info"
    message: str
    context: Dict[str, Any]  # Información adicional para debugging
```

#### Reglas de Validación

**1. Rule: BlunderScoreThreshold**

```python
class BlunderScoreThresholdRule(ValidationRule):
    """
    No puede haber 'blunder' con score_diff bajo.
    
    Lógica:
    - Si ml_prediction.predicted_error == "blunder"
    - Entonces abs(score_diff) debe ser >= 200 cp
    """
    
    def validate(self, result: ExecutionResult) -> ValidationIssue:
        if not result.ml_prediction:
            return None
            
        if result.ml_prediction.predicted_error == "blunder":
            if abs(result.score_diff) < 200:
                return ValidationIssue(
                    rule_name="BlunderScoreThreshold",
                    severity="error",
                    message=f"ML predice blunder pero score_diff es solo {result.score_diff} cp (esperado >=200)",
                    context={
                        "score_diff": result.score_diff,
                        "ml_confidence": result.ml_prediction.confidence
                    }
                )
        return None
```

**2. Rule: TacticalEvidenceRequired**

```python
class TacticalEvidenceRequiredRule(ValidationRule):
    """
    No puede haber mención de táctica sin evidencia en tactical_tags.
    
    Lógica:
    - Si explanation contiene palabras tácticas (fork, pin, skewer, etc.)
    - Entonces tactical_tags debe contener al menos una tag
    """
    
    TACTICAL_KEYWORDS = [
        "fork", "horquilla", "pin", "clavada", "skewer",
        "discovered attack", "double attack", "sacrifice"
    ]
    
    def validate(self, result: ExecutionResult, explanation: str = None) -> ValidationIssue:
        if not explanation:
            return None
            
        # Buscar keywords tácticas en explicación
        mentioned_tactics = [
            kw for kw in self.TACTICAL_KEYWORDS 
            if kw.lower() in explanation.lower()
        ]
        
        if mentioned_tactics and not result.tactical_tags:
            return ValidationIssue(
                rule_name="TacticalEvidenceRequired",
                severity="warning",
                message=f"Explicación menciona tácticas {mentioned_tactics} pero tactical_tags está vacío",
                context={
                    "mentioned": mentioned_tactics,
                    "tactical_tags": result.tactical_tags
                }
            )
        return None
```

**3. Rule: EngineSupportRequired**

```python
class EngineSupportRequiredRule(ValidationRule):
    """
    Toda explicación debe estar soportada por evaluación del engine.
    
    Lógica:
    - Si explanation menciona "mejor jugada" o "debería"
    - Entonces debe citar best_move del engine
    """
    
    def validate(self, result: ExecutionResult, explanation: str = None) -> ValidationIssue:
        if not explanation:
            return None
            
        suggests_alternative = any(kw in explanation.lower() for kw in [
            "mejor jugada", "debería", "en su lugar", "mejor era"
        ])
        
        if suggests_alternative and result.best_move not in explanation:
            return ValidationIssue(
                rule_name="EngineSupportRequired",
                severity="error",
                message="Explicación sugiere alternativa sin mencionar best_move del engine",
                context={
                    "best_move": result.best_move,
                    "explanation_snippet": explanation[:200]
                }
            )
        return None
```

**4. Rule: MLEngineConsistency**

```python
class MLEngineConsistencyRule(ValidationRule):
    """
    Predicción ML debe ser consistente con evaluación del engine.
    
    Matriz de consistencia:
    
    | score_diff | ml_prediction | consistent? |
    | ---------- | ------------- | ----------- |
    | < -200     | blunder       | ✅           |
    | < -100     | mistake       | ✅           |
    | < -50      | inaccuracy    | ✅           |
    | >= -50     | good          | ✅           |
    | < -200     | good          | ❌ ERROR     |
    | >= -50     | blunder       | ❌ ERROR     |
    """
    
    CONSISTENCY_MATRIX = {
        "blunder": {"min_diff": -10000, "max_diff": -200},
        "mistake": {"min_diff": -200, "max_diff": -100},
        "inaccuracy": {"min_diff": -100, "max_diff": -50},
        "good": {"min_diff": -50, "max_diff": 10000}
    }
    
    def validate(self, result: ExecutionResult) -> ValidationIssue:
        if not result.ml_prediction:
            return None
            
        predicted = result.ml_prediction.predicted_error
        score_diff = result.score_diff
        
        bounds = self.CONSISTENCY_MATRIX[predicted]
        
        if not (bounds["min_diff"] <= score_diff <= bounds["max_diff"]):
            return ValidationIssue(
                rule_name="MLEngineConsistency",
                severity="warning",
                message=f"ML predice '{predicted}' pero score_diff={score_diff} está fuera de rango esperado [{bounds['min_diff']}, {bounds['max_diff']}]",
                context={
                    "ml_prediction": predicted,
                    "score_diff": score_diff,
                    "expected_range": bounds,
                    "ml_confidence": result.ml_prediction.confidence
                }
            )
        return None
```

**5. Rule: PositionLegalityCheck**

```python
class PositionLegalityCheckRule(ValidationRule):
    """
    Verifica que las posiciones FEN sean legales.
    
    Usa python-chess para validación.
    """
    
    def validate(self, result: ExecutionResult) -> ValidationIssue:
        import chess
        
        try:
            board_before = chess.Board(result.fen_before)
            board_after = chess.Board(result.fen_after)
            
            if not board_before.is_valid() or not board_after.is_valid():
                return ValidationIssue(
                    rule_name="PositionLegalityCheck",
                    severity="error",
                    message="Posición FEN ilegal detectada",
                    context={
                        "fen_before": result.fen_before,
                        "fen_after": result.fen_after
                    }
                )
        except ValueError as e:
            return ValidationIssue(
                rule_name="PositionLegalityCheck",
                severity="error",
                message=f"FEN inválido: {str(e)}",
                context={"error": str(e)}
            )
        
        return None
```

#### Estrategia de Fallback

Cuando el Critic detecta inconsistencias:

```python
if not critic_result.is_consistent:
    # Opción 1: Generar explicación restrictiva (sin táctica, solo engine)
    explanation = explainer.generate_restricted(
        execution_result,
        restrictions={
            "avoid_tactics": True,
            "cite_engine_only": True,
            "no_speculation": True
        }
    )
    
    # Opción 2: Marcar para revisión manual
    execution_result.metadata["requires_review"] = True
    execution_result.metadata["critic_issues"] = critic_result.issues
    
    # Opción 3: Usar template predefinido
    explanation = f"Jugada {result.move_san}. Evaluación cambió {result.score_diff} cp. Mejor era {result.best_move}."
```

---

### 1.4 Memory (Memoria)

**Responsabilidad:** Persistencia y aprendizaje acumulado.

#### Interfaz

```python
class MemoryService:
    """
    Servicio de persistencia y patrones de jugador.
    
    Responsabilidades:
    - Guardar análisis por jugada
    - Agregar patrones del jugador
    - Clustering de errores
    - Proveer historial para personalización
    """
    
    def __init__(self, db: Database):
        self.db = db
        
    def store_move_analysis(
        self,
        game_id: str,
        enriched_result: EnrichedResult
    ) -> None:
        """Guarda análisis de una jugada con toda la metadata."""
        pass
        
    def update_player_patterns(
        self,
        player_id: int,
        analysis_results: List[EnrichedResult]
    ) -> None:
        """
        Actualiza patrones agregados del jugador.
        
        Calcula:
        - Frecuencia de tipos de error
        - Temas tácticos recurrentes
        - Fases de juego débiles
        - Tendencias temporales
        """
        pass
        
    def get_player_patterns(
        self,
        player_id: int,
        lookback_days: int = 30
    ) -> PlayerPatterns:
        """Recupera patrones del jugador de los últimos N días."""
        pass
```

#### Modelo de Datos

```python
@dataclass
class EnrichedResult:
    """Resultado enriquecido con explicación y crítica."""
    execution_result: ExecutionResult
    explanation: str
    critic_result: CriticResult
    metadata: Dict[str, Any]
    
@dataclass
class PlayerPatterns:
    """Patrones agregados de un jugador."""
    player_id: int
    total_games_analyzed: int
    total_moves_analyzed: int
    
    # Distribución de errores
    error_distribution: Dict[str, float]  # {"blunder": 0.05, "mistake": 0.12, ...}
    
    # Temas tácticos recurrentes
    frequent_tactics: List[Tuple[str, int]]  # [("fork", 23), ("pin", 15), ...]
    
    # Fases débiles
    weak_phases: List[str]  # ["opening", "endgame"]
    phase_error_rates: Dict[str, float]  # {"opening": 0.15, "middlegame": 0.08, ...}
    
    # Tendencias temporales
    improvement_trend: float  # -1.0 (empeorando) a +1.0 (mejorando)
    recent_avg_error_rate: float
    
    # Clustering
    error_clusters: List[ErrorCluster]
    
@dataclass
class ErrorCluster:
    """Cluster de errores similares."""
    cluster_id: int
    description: str  # "Errores en finales de torres"
    size: int  # Cantidad de errores en cluster
    representative_positions: List[str]  # FENs ejemplo
    recurrence_frequency: float  # 0.0 - 1.0
```

#### Schema de Base de Datos

```sql
-- Tabla de análisis de jugadas (nueva)
CREATE TABLE move_analyses (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL,
    player_id INT NOT NULL,
    ply INT NOT NULL,
    move_san VARCHAR(10) NOT NULL,
    
    -- Execution Result
    fen_before TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    engine_eval_before FLOAT,
    engine_eval_after FLOAT,
    score_diff FLOAT,
    best_move VARCHAR(10),
    best_line TEXT[],
    features JSONB,
    tactical_tags TEXT[],
    phase VARCHAR(20),
    
    -- ML Prediction
    ml_predicted_error VARCHAR(20),
    ml_confidence FLOAT,
    ml_risk_score FLOAT,
    ml_contributing_features JSONB,
    
    -- RAG Context
    rag_similar_positions JSONB,
    rag_book_excerpts TEXT[],
    rag_total_retrieved INT,
    
    -- Explanation
    explanation TEXT,
    
    -- Critic Result
    is_consistent BOOLEAN,
    critic_confidence FLOAT,
    critic_issues JSONB,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    execution_time FLOAT,
    version VARCHAR(20),  -- Version de arquitectura (v2.0, v2.1, etc.)
    
    FOREIGN KEY (game_id) REFERENCES games(id),
    FOREIGN KEY (player_id) REFERENCES users(id),
    INDEX idx_player_created (player_id, created_at),
    INDEX idx_game_ply (game_id, ply)
);

-- Tabla de patrones de jugador (nueva)
CREATE TABLE player_patterns (
    id SERIAL PRIMARY KEY,
    player_id INT NOT NULL UNIQUE,
    
    -- Estadísticas agregadas
    total_games_analyzed INT DEFAULT 0,
    total_moves_analyzed INT DEFAULT 0,
    error_distribution JSONB,  -- {"blunder": 0.05, "mistake": 0.12, ...}
    
    -- Tácticas
    frequent_tactics JSONB,  -- [{"tactic": "fork", "count": 23}, ...]
    
    -- Fases
    weak_phases TEXT[],
    phase_error_rates JSONB,
    
    -- Tendencias
    improvement_trend FLOAT,
    recent_avg_error_rate FLOAT,
    
    -- Clustering (serializado)
    error_clusters JSONB,
    
    -- Timestamps
    last_updated TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (player_id) REFERENCES users(id)
);
```

---

### 1.5 Explainer (Explicador LLM)

**Responsabilidad:** Generar explicación en lenguaje natural SOLO a partir de evidencia.

#### Interfaz

```python
class ExplanationService:
    """
    Servicio de generación de explicaciones con LLM.
    
    El LLM NO decide, solo EXPLICA evidencia del Executor.
    """
    
    def __init__(
        self,
        llm_client: AsyncOllama,  # O AsyncOpenAI
        model: str = "llama3.1:8b"
    ):
        self.llm = llm_client
        self.model = model
        
    def generate(
        self,
        execution_result: ExecutionResult,
        player_elo: Optional[int] = None
    ) -> str:
        """
        Genera explicación pedagógica basada en evidencia.
        
        Args:
            execution_result: Evidencia del Executor
            player_elo: ELO del jugador para adaptar lenguaje
            
        Returns:
            Explicación en lenguaje natural
        """
        pass
        
    def generate_restricted(
        self,
        execution_result: ExecutionResult,
        restrictions: Dict[str, bool]
    ) -> str:
        """
        Genera explicación restrictiva cuando Critic detecta problemas.
        
        Restrictions:
        - avoid_tactics: No mencionar tácticas
        - cite_engine_only: Solo citar evaluación del engine
        - no_speculation: Evitar especulación
        """
        pass
```

#### Prompt Engineering

```python
def _build_prompt(
    self,
    execution_result: ExecutionResult,
    player_elo: int
) -> str:
    """
    Construye prompt estructurado para LLM.
    
    Estructura:
    1. Contexto de posición (FEN)
    2. Evidencia objetiva (engine + ML + RAG)
    3. Instrucciones pedagógicas (adaptadas a ELO)
    4. Formato de salida esperado
    """
    
    # Adaptación por ELO
    if player_elo < 1600:
        complexity = "básico"
        forbidden_terms = ["zugzwang", "profilaxis", "tempo"]
    elif player_elo < 2000:
        complexity = "intermedio"
        forbidden_terms = []
    else:
        complexity = "avanzado"
        forbidden_terms = []
    
    prompt = f"""
Eres un entrenador de ajedrez pedagógico. Analiza la siguiente jugada y genera una explicación clara.

# EVIDENCIA OBJETIVA (NO INVENTES NADA)

**Posición:**
- FEN antes: {execution_result.fen_before}
- Jugada: {execution_result.move_san}
- FEN después: {execution_result.fen_after}

**Evaluación (Stockfish depth {self.depth}):**
- Evaluación antes: {execution_result.engine_eval_before} cp
- Evaluación después: {execution_result.engine_eval_after} cp
- Cambio: {execution_result.score_diff} cp
- Mejor jugada: {execution_result.best_move}
- Línea principal: {' '.join(execution_result.best_line[:5])}

**Características (ML features):**
{json.dumps(execution_result.features, indent=2)}

**Predicción ML:**
- Clasificación: {execution_result.ml_prediction.predicted_error}
- Confianza: {execution_result.ml_prediction.confidence:.2f}
- Factores clave: {execution_result.ml_prediction.contributing_features[:3]}

**Contexto de libros (RAG):**
{chr(10).join(execution_result.rag_context.book_excerpts[:2]) if execution_result.rag_context else "No disponible"}

# INSTRUCCIONES

1. Nivel de complejidad: {complexity}
2. NO uses estos términos: {', '.join(forbidden_terms)}
3. CITA siempre la evidencia objetiva (evaluación, best_move)
4. NO especules sobre intenciones del jugador
5. NO menciones tácticas si no hay tactical_tags

# FORMATO DE SALIDA

Genera un párrafo de 3-5 oraciones que:
- Describa la jugada jugada
- Explique por qué es buena/mala según evaluación
- Sugiera alternativa si aplica (citando best_move)
- Use lenguaje pedagógico apropiado para ELO {player_elo}

# EXPLICACIÓN:
"""
    
    return prompt
```

---

## 2. Use Case Principal: AnalyzeGameUseCase

### Diagrama de Secuencia

```
Usuario → API → AnalyzeGameUseCase
                      ↓
                 [1] Planner.build_plan()
                      ↓
                 [2] Executor.execute()  (paralelo: engine + ML + RAG)
                      ↓
                 [3] FOR cada resultado:
                      ├─ [3a] Explainer.generate()
                      ├─ [3b] Critic.validate()
                      ├─ [3c] IF not consistent:
                      │       └─ Explainer.generate_restricted()
                      └─ [3d] Memory.store_move_analysis()
                      ↓
                 [4] Memory.update_player_patterns()
                      ↓
                 [5] Return enriched results
```

### Implementación Completa

```python
class AnalyzeGameUseCase:
    """
    Caso de uso principal: análisis completo de partida.
    """
    
    def __init__(
        self,
        planner: PlannerService,
        executor: ExecutorService,
        critic: CriticService,
        memory: MemoryService,
        explainer: ExplanationService
    ):
        self.planner = planner
        self.executor = executor
        self.critic = critic
        self.memory = memory
        self.explainer = explainer
    
    async def execute(
        self,
        game: Game,
        options: AnalysisOptions
    ) -> AnalysisReport:
        """
        Ejecuta análisis completo con arquitectura orquestada.
        
        Returns:
            AnalysisReport con resultados enriquecidos
        """
        
        # FASE 1: PLANIFICACIÓN
        logger.info(f"[Planner] Construyendo plan para game {game.id}")
        plan = self.planner.build_plan(game, options)
        logger.info(f"[Planner] Plan: {len(plan.target_moves)} jugadas críticas")
        
        # FASE 2: EJECUCIÓN (produce evidencia)
        logger.info(f"[Executor] Ejecutando análisis con modos: {plan.analysis_modes}")
        execution_results = await self.executor.execute(game, plan)
        logger.info(f"[Executor] Completado: {len(execution_results)} resultados")
        
        # FASE 3: EXPLICACIÓN + CRÍTICA
        enriched_results = []
        
        for exec_result in execution_results:
            # 3a: Generar explicación inicial
            logger.debug(f"[Explainer] Generando explicación para ply {exec_result.ply}")
            explanation = await self.explainer.generate(
                exec_result,
                player_elo=game.player.elo
            )
            
            # 3b: Validar con Critic
            logger.debug(f"[Critic] Validando ply {exec_result.ply}")
            critique = self.critic.validate(exec_result, explanation)
            
            # 3c: Fallback si hay inconsistencias
            if not critique.is_consistent:
                logger.warning(f"[Critic] Inconsistencias detectadas en ply {exec_result.ply}: {critique.issues}")
                
                # Re-generar con restricciones
                explanation = await self.explainer.generate_restricted(
                    exec_result,
                    restrictions={
                        "avoid_tactics": any(i.rule_name == "TacticalEvidenceRequired" for i in critique.issues),
                        "cite_engine_only": True,
                        "no_speculation": True
                    }
                )
                
                # Re-validar
                critique = self.critic.validate(exec_result, explanation)
                
                if not critique.is_consistent:
                    # Fallback final: template simple
                    logger.error(f"[Critic] Fallback a template para ply {exec_result.ply}")
                    explanation = self._generate_fallback_explanation(exec_result)
            
            # 3d: Crear resultado enriquecido
            enriched = EnrichedResult(
                execution_result=exec_result,
                explanation=explanation,
                critic_result=critique,
                metadata={
                    "plan_priority": plan.priorities.get(exec_result.ply),
                    "version": "v2.0-orchestrated"
                }
            )
            
            enriched_results.append(enriched)
            
            # 3e: Guardar en Memory
            logger.debug(f"[Memory] Almacenando análisis para ply {exec_result.ply}")
            self.memory.store_move_analysis(game.id, enriched)
        
        # FASE 4: ACTUALIZAR PATRONES DEL JUGADOR
        logger.info(f"[Memory] Actualizando patrones del jugador {game.player_id}")
        await self.memory.update_player_patterns(game.player_id, enriched_results)
        
        # FASE 5: CONSTRUIR REPORTE FINAL
        report = AnalysisReport(
            game_id=game.id,
            player_id=game.player_id,
            total_moves_analyzed=len(enriched_results),
            enriched_results=enriched_results,
            player_patterns=await self.memory.get_player_patterns(game.player_id),
            metadata={
                "plan": plan,
                "execution_summary": self._summarize_execution(enriched_results)
            }
        )
        
        logger.info(f"[UseCase] Análisis completado: {report.total_moves_analyzed} jugadas")
        return report
    
    def _generate_fallback_explanation(self, result: ExecutionResult) -> str:
        """Template simple cuando todo falla."""
        return (
            f"Jugada {result.move_san}. "
            f"La evaluación cambió {result.score_diff:+.0f} centipawns. "
            f"Stockfish sugiere {result.best_move} como mejor alternativa."
        )
    
    def _summarize_execution(self, results: List[EnrichedResult]) -> Dict:
        """Resume ejecución para metadata."""
        return {
            "total_consistent": sum(1 for r in results if r.critic_result.is_consistent),
            "avg_confidence": np.mean([r.critic_result.confidence for r in results]),
            "error_distribution": Counter([
                r.execution_result.ml_prediction.predicted_error 
                for r in results 
                if r.execution_result.ml_prediction
            ])
        }
```

---

## 3. Patrones de Diseño Utilizados

### 3.1 Strategy Pattern
- **Aplicado en:** Executor
- **Razón:** Diferentes estrategias de análisis (engine/ml/rag/cv) intercambiables

### 3.2 Chain of Responsibility
- **Aplicado en:** Critic (ValidationRules)
- **Razón:** Cadena de reglas de validación aplicadas secuencialmente

### 3.3 Builder Pattern
- **Aplicado en:** Planner
- **Razón:** Construcción compleja de AnalysisPlan con múltiples opciones

### 3.4 Repository Pattern
- **Aplicado en:** Memory
- **Razón:** Abstracción de persistencia de datos

### 3.5 Facade Pattern
- **Aplicado en:** AnalyzeGameUseCase
- **Razón:** Simplifica interacción con subsistemas complejos (Planner/Executor/Critic/Memory)

---

## 4. Métricas de Calidad

### 4.1 Métricas del Critic

```python
@dataclass
class CriticMetrics:
    """Métricas de validación del Critic."""
    validation_pass_rate: float  # % de resultados que pasan validación
    avg_confidence: float  # Confianza promedio
    false_positive_rate: float  # % de rechazos incorrectos (requiere ground truth)
    rule_trigger_frequency: Dict[str, int]  # {rule_name: count}
```

**Objetivos (Fase 2):**
- `validation_pass_rate` ≥ 95%
- `avg_confidence` ≥ 0.85
- `false_positive_rate` ≤ 2%

### 4.2 Métricas del Executor

```python
@dataclass
class ExecutorMetrics:
    """Métricas de ejecución."""
    avg_execution_time: float  # Segundos por jugada
    parallelization_speedup: float  # Factor de mejora vs secuencial
    ml_availability: float  # % de veces que ML está disponible
    rag_retrieval_rate: float  # % de veces que RAG retorna resultados
```

**Objetivos (Fase 1):**
- `avg_execution_time` ≤ 5s por jugada
- `parallelization_speedup` ≥ 1.5x
- `ml_availability` ≥ 99%
- `rag_retrieval_rate` ≥ 80%

### 4.3 Métricas del Explainer

```python
@dataclass
class ExplainerMetrics:
    """Métricas de generación LLM."""
    avg_generation_time: float  # Segundos
    hallucination_rate: float  # % detectado por Critic
    elo_adaptation_accuracy: float  # Complejidad apropiada para ELO
```

**Objetivos (Fase 3):**
- `avg_generation_time` ≤ 3s
- `hallucination_rate` ≤ 5% (detectado por Critic)
- `elo_adaptation_accuracy` ≥ 90% (evaluación manual)

---

## 5. Testing Strategy

### 5.1 Unit Tests

```python
# test_critic_service.py
def test_blunder_score_threshold_rule():
    """Verifica que regla de blunder detecta inconsistencias."""
    result = ExecutionResult(
        score_diff=-50,  # Demasiado bajo para blunder
        ml_prediction=MLPrediction(
            predicted_error="blunder",
            confidence=0.95
        )
    )
    
    rule = BlunderScoreThresholdRule()
    issue = rule.validate(result)
    
    assert issue is not None
    assert issue.severity == "error"
    assert "score_diff" in issue.message.lower()
```

### 5.2 Integration Tests

```python
# test_analyze_game_usecase.py
@pytest.mark.asyncio
async def test_full_analysis_pipeline():
    """Test completo del flujo Planner → Executor → Critic → Memory."""
    
    # Setup
    game = create_test_game()
    options = AnalysisOptions(focus_mode="critical")
    
    # Execute
    use_case = AnalyzeGameUseCase(
        planner=PlannerService(),
        executor=ExecutorService(...),
        critic=CriticService([...]),
        memory=MemoryService(db),
        explainer=ExplanationService(...)
    )
    
    report = await use_case.execute(game, options)
    
    # Assertions
    assert len(report.enriched_results) > 0
    assert all(r.critic_result.is_consistent for r in report.enriched_results)
    
    # Verify Memory storage
    stored = db.query(MoveAnalysis).filter_by(game_id=game.id).all()
    assert len(stored) == len(report.enriched_results)
```

### 5.3 E2E Tests

```python
# test_api_orchestrated_analysis.py
def test_api_analyze_game_orchestrated(client):
    """Test E2E desde API hasta DB."""
    
    # Upload game
    response = client.post("/api/chess/upload", files={"file": pgn_file})
    game_id = response.json()["game_id"]
    
    # Analyze
    response = client.post(f"/api/analysis/orchestrated/{game_id}", json={
        "depth": 20,
        "enable_ml": True,
        "enable_rag": True
    })
    
    assert response.status_code == 200
    report = response.json()
    
    # Verify structure
    assert "enriched_results" in report
    assert all("critic_result" in r for r in report["enriched_results"])
    assert all("explanation" in r for r in report["enriched_results"])
```

---

## 6. Versionado y Migración

### 6.1 Versionado de Análisis

Todos los análisis incluyen campo `version`:

```python
"version": "v2.0-orchestrated"
```

**Permite:**
- Coexistencia de análisis legacy (v1.x) con nuevos (v2.x)
- Consultas filtradas por versión
- Rollback si es necesario

### 6.2 Compatibilidad con API Legacy

Adapter para mantener compatibilidad con frontend:

```python
class LegacyAPIAdapter:
    """
    Adapta nuevo formato (orchestrated) a formato legacy esperado por frontend.
    """
    
    @staticmethod
    def to_legacy_format(report: AnalysisReport) -> Dict:
        """
        Convierte AnalysisReport (v2.0) a formato v1.0.
        
        Frontend espera:
        {
            "game_id": "...",
            "moves": [
                {
                    "ply": 10,
                    "evaluation": -50,
                    "explanation": "...",
                    "best_move": "Nf3"
                }
            ]
        }
        """
        return {
            "game_id": report.game_id,
            "moves": [
                {
                    "ply": r.execution_result.ply,
                    "evaluation": r.execution_result.score_diff,
                    "explanation": r.explanation,
                    "best_move": r.execution_result.best_move,
                    "is_validated": r.critic_result.is_consistent
                }
                for r in report.enriched_results
            ],
            "metadata": {
                "version": "v2.0",
                "total_analyzed": report.total_moves_analyzed
            }
        }
```

---

## 7. Próximos Pasos (Fase 1)

1. ✅ **Completar esta especificación técnica**
2. ⏭️ **Crear schemas JSON** (siguiente documento)
3. ⏭️ **Definir plan de migración DB** (siguiente documento)
4. ⏭️ **Implementar Planner + Executor básicos**
5. ⏭️ **Implementar Memory básica**
6. ⏭️ **Crear tests unitarios**

---

**Documento creado:** Marzo 25, 2026  
**Autor:** AI Assistant + sergiosal  
**Revisión:** Pendiente  
**Estado:** DRAFT v1.0

