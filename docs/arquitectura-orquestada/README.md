# Arquitectura Orquestada - Documentación Técnica

**Proyecto:** Chess Trainer  
**Versión:** 2.0  
**Fecha:** Marzo 2026  
**Issue Principal:** [#85](https://github.com/cmessoftware/chess_trainer/issues/85)

---

## 📚 Índice de Documentación

### Fase 0: Documentación Técnica (ACTUAL)

| Documento | Descripción | Estado |
|-----------|-------------|--------|
| [00-fase0-especificacion-tecnica.md](./00-fase0-especificacion-tecnica.md) | Especificación completa de componentes (Planner, Executor, Critic, Memory, Explainer), reglas de validación, patrones de diseño | ✅ DRAFT v1.0 |
| [00-fase0-interfaces-json.md](./00-fase0-interfaces-json.md) | Schemas JSON y Pydantic models de todas las interfaces entre módulos | ✅ DRAFT v1.0 |
| [00-fase0-plan-migracion.md](./00-fase0-plan-migracion.md) | Estrategia de migración de base de datos con dual write/read, rollback plan | ✅ DRAFT v1.0 |

### Fases Futuras (Pendientes)

| Fase | Objetivo | Issue | Estado |
|------|----------|-------|--------|
| **Fase 1** | Implementar Planner + Executor + Memory | [#86](https://github.com/cmessoftware/chess_trainer/issues/86) | ⏳ Por iniciar |
| **Fase 2** | Implementar Critic con reglas programáticas | [#87](https://github.com/cmessoftware/chess_trainer/issues/87) | ⏳ Por iniciar |
| **Fase 3** | Integrar Explainer con LLM local | [#88](https://github.com/cmessoftware/chess_trainer/issues/88) | ⏳ Por iniciar |
| **Fase 4** | Fine-tuning con LoRA | [#89](https://github.com/cmessoftware/chess_trainer/issues/89) | ⏳ Por iniciar |
| **Fase 5** | Optimización y monitoreo | [#90](https://github.com/cmessoftware/chess_trainer/issues/90) | ⏳ Por iniciar |

---

## 🎯 Arquitectura Orquestada

### Problema que Resuelve

El sistema legacy (v1.0) tiene un servicio monolítico (`LLMAnalysisService`) que:
- ❌ Mezcla decisiones con generación de texto
- ❌ Usa LLM para análisis táctico (lento, costoso, inestable)
- ❌ No valida coherencia de explicaciones
- ❌ No aprende de errores históricos

### Solución Propuesta

**Patrón Orquestado:** Separación de responsabilidades en 5 componentes:

```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYZE GAME USE CASE                    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐         ┌─────────┐
   │ PLANNER │          │ EXECUTOR │         │  CRITIC │
   │         │──plan──▶ │          │──result▶│         │
   │ Decide  │          │ Evidencia│         │ Valida  │
   │ QUÉ     │          │ objetiva │         │ Coheren │
   └─────────┘          └──────────┘         └─────────┘
                             ▲                     │
                             │                     ▼
                        ┌─────────┐         ┌───────────┐
                        │  MEMORY │         │ EXPLAINER │
                        │         │         │           │
                        │ Patrones│◀────────│ LLM solo  │
                        │ jugador │         │ EXPLICA   │
                        └─────────┘         └───────────┘
```

**Responsabilidades:**

1. **Planner:** Decide QUÉ analizar (jugadas críticas, modos)
2. **Executor:** Produce EVIDENCIA (Stockfish + ML + RAG + CV)
3. **Critic:** Valida COHERENCIA (reglas programáticas)
4. **Explainer:** Genera explicación LLM SOLO con evidencia
5. **Memory:** Persistencia + aprendizaje acumulado

---

## 🔑 Principios de Diseño

### 1. LLM Solo Explica, No Decide

❌ **Monolithic (v1.0):**
```python
# LLM hace TODO
prompt = "Analiza esta posición y determina si hay táctica..."
llm_response = await llm.generate(prompt)
```

✅ **Orchestrated (v2.0):**
```python
# Engine + ML deciden, LLM solo explica
tactical_tags = executor.detect_tactics(position)  # Sin LLM
explanation = explainer.generate(tactical_tags)    # LLM usa evidencia
```

### 2. Validación Programática Antes de LLM

```python
# SIEMPRE validar coherencia ANTES de mostrar al usuario
critic_result = critic.validate(execution_result, explanation)

if not critic_result.is_consistent:
    # Re-generar con restricciones o usar template
    explanation = explainer.generate_restricted(execution_result)
```

### 3. Coexistencia con Legacy

- ✅ Nuevas tablas (`move_analyses`, `player_patterns`)
- ✅ Dual write (escribir en v1.0 y v2.0)
- ✅ Dual read (leer v2.0, fallback a v1.0)
- ✅ Versionado (`version` field)

---

## 📊 Componentes Principales

### Planner Service

**Input:** Game + AnalysisOptions  
**Output:** AnalysisPlan (jugadas objetivo, modos, prioridades)

**Algoritmo de priorización:**
- Eval swing > 100 cp → `high`
- Material loss ≥ 3 → `high`
- Tactical tags → `medium`
- Fase del juego (opening/middlegame/endgame)

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 1.1](./00-fase0-especificacion-tecnica.md#11-planner-planificador)

---

### Executor Service

**Input:** Game + AnalysisPlan  
**Output:** ExecutionResult[] (evidencia de múltiples fuentes)

**Fuentes de evidencia:**
1. **Engine (Stockfish):** Evaluación, best_move, línea principal
2. **Features:** king_safety, material_balance, center_control
3. **ML:** Predicción de error (RandomForest/XGBoost)
4. **RAG:** Posiciones similares, extractos de libros
5. **CV (opcional):** Extracción FEN desde imagen

**Paralelización:**
- Engine + Features: Secuencial (Features dependen de Engine)
- ML + RAG: Paralelo (independientes)

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 1.2](./00-fase0-especificacion-tecnica.md#12-executor-ejecutor)

---

### Critic Service

**Input:** ExecutionResult + Explanation (opcional)  
**Output:** CriticResult (is_consistent, issues, confidence)

**Reglas Implementadas (Fase 2):**

| Regla | Descripción | Severidad |
|-------|-------------|-----------|
| **BlunderScoreThreshold** | Blunder requiere \|score_diff\| ≥ 200 cp | ERROR |
| **TacticalEvidenceRequired** | Mención de táctica requiere tactical_tags | WARNING |
| **EngineSupportRequired** | Sugerencia de alternativa requiere citar best_move | ERROR |
| **MLEngineConsistency** | ML prediction debe alinearse con score_diff | WARNING |
| **PositionLegalityCheck** | FEN debe ser legal (python-chess) | ERROR |

**Estrategia de fallback:**
- Si `is_consistent=False` → Re-generar con restricciones
- Si re-generación falla → Template simple

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 1.3](./00-fase0-especificacion-tecnica.md#13-critic-crítico)

---

### Memory Service

**Responsabilidades:**
1. Guardar análisis por jugada (`move_analyses` table)
2. Actualizar patrones de jugador (`player_patterns` table)
3. Clustering de errores
4. Proveer historial para personalización

**Player Patterns:**
- Distribución de errores (blunders: 5%, mistakes: 12%, etc.)
- Tácticas frecuentes (fork: 23 veces, pin: 15 veces)
- Fases débiles (endgame con 25% error rate)
- Tendencia de mejora (-1: empeorando, +1: mejorando)

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 1.4](./00-fase0-especificacion-tecnica.md#14-memory-memoria)

---

### Explainer Service

**Input:** ExecutionResult + player_elo  
**Output:** Explicación pedagógica (string)

**Adaptación por ELO:**
- < 1600: Básico, evitar términos avanzados (zugzwang, profilaxis)
- 1600-2000: Intermedio
- > 2000: Avanzado

**Prompt Engineering:**
- ✅ CITAR evidencia (evaluación, best_move, ML prediction)
- ✅ NO especular sobre intenciones
- ✅ NO mencionar tácticas sin tactical_tags
- ✅ Formato: 3-5 oraciones pedagógicas

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 1.5](./00-fase0-especificacion-tecnica.md#15-explainer-explicador-llm)

---

## 🔄 Use Case: AnalyzeGameUseCase

**Flujo completo:**

```python
async def execute(game: Game, options: AnalysisOptions) -> AnalysisReport:
    # 1. PLANIFICACIÓN
    plan = planner.build_plan(game, options)
    
    # 2. EJECUCIÓN (paralelo)
    execution_results = await executor.execute(game, plan)
    
    # 3. EXPLICACIÓN + CRÍTICA (por cada jugada)
    enriched_results = []
    for exec_result in execution_results:
        # 3a: Generar explicación
        explanation = await explainer.generate(exec_result, game.player.elo)
        
        # 3b: Validar coherencia
        critique = critic.validate(exec_result, explanation)
        
        # 3c: Fallback si inconsistente
        if not critique.is_consistent:
            explanation = await explainer.generate_restricted(exec_result)
            critique = critic.validate(exec_result, explanation)
        
        # 3d: Enriquecer y guardar
        enriched = EnrichedResult(exec_result, explanation, critique)
        enriched_results.append(enriched)
        memory.store_move_analysis(game.id, enriched)
    
    # 4. ACTUALIZAR PATRONES
    await memory.update_player_patterns(game.player_id, enriched_results)
    
    # 5. CONSTRUIR REPORTE
    return AnalysisReport(...)
```

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 2](./00-fase0-especificacion-tecnica.md#2-use-case-principal-analyzegameusecase)

---

## 📐 Schemas JSON

**Todos los contratos entre módulos están definidos con:**
- JSON Schema (estándar)
- Pydantic Models (validación en runtime)
- OpenAPI (documentación auto-generada)

**Schemas principales:**

| Schema | Input/Output | Descripción |
|--------|--------------|-------------|
| `AnalysisOptions` | Input | Opciones de análisis (depth, enable_ml, focus_mode) |
| `AnalysisPlan` | Planner → Executor | Plan de análisis (jugadas, modos, prioridades) |
| `ExecutionResult` | Executor → Critic/Explainer | Evidencia objetiva (engine + ML + RAG) |
| `CriticResult` | Critic → UseCase | Validación (is_consistent, issues) |
| `EnrichedResult` | UseCase → Memory | Resultado final (execution + explanation + critique) |
| `AnalysisReport` | UseCase → API | Reporte completo para frontend |

**Ver:** [00-fase0-interfaces-json.md](./00-fase0-interfaces-json.md)

---

## 🗄️ Migración de Base de Datos

**Estrategia:** Coexistencia + Dual Write/Read

### Fases de Migración

| Fase | Acción | Duración | Risk |
|------|--------|----------|------|
| 1 | **Agregar tablas nuevas** (move_analyses, player_patterns) | 1 día | Bajo ✅ |
| 2 | **Dual write** (escribir en v1.0 + v2.0) | 1 semana | Bajo ✅ |
| 3 | **Dual read** (leer v2.0, fallback a v1.0) | 1 semana | Medio ⚠️ |
| 4 | **Migración histórica** (opcional) | 2 semanas | Alto ⛔ |
| 5 | **Deprecar legacy** (eliminar tabla `moves`) | 3 meses después | Muy Alto ⛔ |

### Nuevas Tablas

**move_analyses:**
- Todos los campos de ExecutionResult + CriticResult
- JSONB para features, ML prediction, RAG context
- Arrays para tactical_tags, best_line, critic_issues
- Campo `version` para diferenciar v1.0 vs v2.0

**player_patterns:**
- Agregaciones por jugador (error distribution, frequent tactics)
- Clustering de errores
- Tendencias de mejora
- Auto-actualizado por Memory Service

**Ver:** [00-fase0-plan-migracion.md](./00-fase0-plan-migracion.md)

---

## 🧪 Testing Strategy

### Unit Tests
- Cada regla del Critic (BlunderScoreThreshold, TacticalEvidenceRequired, etc.)
- Pydantic validation (schemas válidos e inválidos)
- Planner priorization logic

### Integration Tests
- Flujo completo Planner → Executor → Critic → Memory
- Dual write (verifica inserción en ambas tablas)
- Dual read con fallback

### E2E Tests
- API endpoint → UseCase → DB
- Verificación de versionado
- Frontend legacy con datos v2.0

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 5](./00-fase0-especificacion-tecnica.md#5-testing-strategy)

---

## 📈 Métricas de Éxito

### Fase 0 (Documentación)
- ✅ Especificación técnica completa
- ✅ Schemas JSON definidos y validados
- ✅ Plan de migración con rollback

### Fase 1 (Implementación Básica)
- `avg_execution_time` ≤ 5s por jugada
- `parallelization_speedup` ≥ 1.5x
- `ml_availability` ≥ 99%
- `rag_retrieval_rate` ≥ 80%

### Fase 2 (Critic)
- `validation_pass_rate` ≥ 95%
- `avg_confidence` ≥ 0.85
- `false_positive_rate` ≤ 2%

### Fase 3 (Explainer)
- `avg_generation_time` ≤ 3s
- `hallucination_rate` ≤ 5%
- `elo_adaptation_accuracy` ≥ 90%

**Ver:** [00-fase0-especificacion-tecnica.md - Sección 4](./00-fase0-especificacion-tecnica.md#4-métricas-de-calidad)

---

## 🚀 Próximos Pasos

### Fase 0 (ACTUAL)
1. ✅ Especificación técnica
2. ✅ Schemas JSON
3. ✅ Plan de migración
4. ⏭️ **Revisar documentos con equipo**
5. ⏭️ **Crear diagramas de arquitectura (Mermaid)**
6. ⏭️ **Cerrar Issue #85**

### Fase 1 (Siguiente)
1. Crear migration Alembic
2. Implementar Planner service
3. Implementar Executor service (con paralelización)
4. Implementar Memory service (dual write)
5. Tests unitarios
6. **Merge a `main`**

---

## 📚 Referencias

- **Documento Arquitectura Original:** [docs/ChessTrainer — Arquitectura Orquestada (Planner, Executor, Critic, Memory).md](../ChessTrainer%20—%20Arquitectura%20Orquestada%20(Planner,%20Executor,%20Critic,%20Memory).md)
- **Roadmap:** [docs/0-ai_chess_coach_roadmap.md](../0-ai_chess_coach_roadmap.md)
- **Module Spec:** [docs/2-ai_chess_coach_module_spec.md](../2-ai_chess_coach_module_spec.md)

---

**Última Actualización:** Marzo 25, 2026  
**Mantenido por:** sergiosal + AI Assistant  
**Branch:** `feature/arquitectura-orquestada-fase0-documentacion`
