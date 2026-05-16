---
OBSOLETE: true
OBSOLETE_DATE: 2026-04-24
OBSOLETE_REASON: Consolidado por módulos en docs/ai_chess_coach/2-architecture/modules/
CANONICAL_LOCATION: docs/ai_chess_coach/2-architecture/modules/
---

> [!WARNING]
> Documento obsoleto. No editar. Usar versión consolidada por módulo en docs/ai_chess_coach/2-architecture/modules/.
# Fase 0 - Plan de Migración de Base de Datos

**Fecha:** Marzo 25, 2026  
**Versión:** 1.0  
**Estado:** En Desarrollo  
**Issue:** [#85](https://github.com/cmessoftware/chessinsightai/issues/85)

---

## Objetivo

Definir la estrategia de migración de base de datos para soportar la Arquitectura Orquestada sin romper compatibilidad con el sistema legacy.

**Principios:**
1. **Coexistencia:** Ambas arquitecturas (v1.0 legacy + v2.0 orchestrated) funcionan simultáneamente
2. **Migración gradual:** No big-bang, migración progresiva
3. **Rollback seguro:** Posibilidad de revertir sin pérdida de datos
4. **Zero downtime:** API sigue funcionando durante migración

---

## 1. Schema Actual (Legacy v1.0)

### Tablas Existentes

```sql
-- Tabla de partidas
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER REFERENCES users(id),
    pgn TEXT NOT NULL,
    result VARCHAR(10),  -- "1-0", "0-1", "1/2-1/2"
    player_color VARCHAR(10),  -- "white", "black"
    opponent_name VARCHAR(255),
    date_played DATE,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    analyzed BOOLEAN DEFAULT FALSE,
    INDEX idx_user_analyzed (user_id, analyzed)
);

-- Tabla de jugadas (legacy)
CREATE TABLE moves (
    id SERIAL PRIMARY KEY,
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    ply INTEGER NOT NULL,  -- Índice de jugada (0-based)
    move_san VARCHAR(10) NOT NULL,
    fen_before TEXT,
    fen_after TEXT,
    evaluation FLOAT,  -- Evaluación en centipawns
    best_move VARCHAR(10),
    explanation TEXT,  -- Generado por LLM (legacy)
    tactical_theme VARCHAR(50),
    error_label VARCHAR(20),  -- "good", "inaccuracy", "mistake", "blunder"
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_game_ply (game_id, ply)
);

-- Tabla de usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    elo INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Problemas del Schema Legacy

1. **Falta de versionado:** No hay campo `version` para diferenciar análisis v1.0 vs v2.0
2. **Datos no estructurados:** `explanation` es texto plano sin metadata
3. **Sin crítica:** No hay registro de validación/coherencia
4. **Sin features ML:** No se guardan features extraídos
5. **Sin RAG context:** No se guarda qué documentos se recuperaron
6. **Sin patrones de jugador:** No hay agregación histórica

---

## 2. Schema Nuevo (v2.0 Orchestrated)

### Nuevas Tablas

```sql
-- ========================================
-- TABLA 1: move_analyses (Nueva)
-- Reemplaza moves pero con mucho más detalle
-- ========================================

CREATE TABLE move_analyses (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES users(id),
    ply INTEGER NOT NULL,
    move_san VARCHAR(10) NOT NULL,
    
    -- ===== Execution Result =====
    fen_before TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    engine_eval_before FLOAT,
    engine_eval_after FLOAT,
    score_diff FLOAT,
    best_move VARCHAR(10),
    best_line TEXT[],  -- Array de jugadas
    
    -- Features (JSON)
    features JSONB,  -- {"king_safety": 0.3, "material_balance": 0.0, ...}
    tactical_tags TEXT[],  -- Array: ["fork", "pin", ...]
    phase VARCHAR(20),  -- "opening" | "middlegame" | "endgame"
    
    -- ===== ML Prediction =====
    ml_predicted_error VARCHAR(20),  -- "good" | "inaccuracy" | "mistake" | "blunder"
    ml_confidence FLOAT CHECK (ml_confidence >= 0 AND ml_confidence <= 1),
    ml_risk_score FLOAT CHECK (ml_risk_score >= 0 AND ml_risk_score <= 1),
    ml_contributing_features JSONB,  -- [{"feature_name": "...", "impact": 0.5}, ...]
    
    -- ===== RAG Context =====
    rag_similar_positions JSONB,  -- Array de posiciones similares recuperadas
    rag_book_excerpts TEXT[],  -- Extractos de libros
    rag_total_retrieved INTEGER DEFAULT 0,
    rag_relevance_scores FLOAT[],  -- Scores de relevancia
    
    -- ===== Explanation =====
    explanation TEXT NOT NULL,  -- Generado por LLM
    
    -- ===== Critic Result =====
    is_consistent BOOLEAN NOT NULL,
    critic_confidence FLOAT CHECK (critic_confidence >= 0 AND critic_confidence <= 1),
    critic_issues JSONB,  -- [{"rule_name": "...", "severity": "error", ...}, ...]
    critic_passed_rules TEXT[],
    critic_failed_rules TEXT[],
    
    -- ===== Metadata =====
    created_at TIMESTAMP DEFAULT NOW(),
    execution_time FLOAT,  -- Segundos
    version VARCHAR(20) DEFAULT 'v2.0',  -- Clave para filtrar
    
    -- ===== Indexes =====
    INDEX idx_game_ply (game_id, ply),
    INDEX idx_player_created (player_id, created_at DESC),
    INDEX idx_version (version),
    INDEX idx_ml_prediction (ml_predicted_error),
    INDEX idx_critic_consistent (is_consistent),
    
    -- ===== Constraints =====
    UNIQUE (game_id, ply, version),  -- Evita duplicados
    CHECK (ply >= 0)
);

-- ========================================
-- TABLA 2: player_patterns (Nueva)
-- Patrones agregados por jugador
-- ========================================

CREATE TABLE player_patterns (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- ===== Estadísticas Agregadas =====
    total_games_analyzed INTEGER DEFAULT 0,
    total_moves_analyzed INTEGER DEFAULT 0,
    
    -- Distribución de errores (JSON)
    error_distribution JSONB,  -- {"good": 0.72, "inaccuracy": 0.18, ...}
    
    -- ===== Tácticas =====
    frequent_tactics JSONB,  -- [{"tactic": "fork", "count": 23}, ...]
    
    -- ===== Fases =====
    weak_phases TEXT[],  -- ["opening", "endgame"]
    phase_error_rates JSONB,  -- {"opening": 0.12, "middlegame": 0.08, ...}
    
    -- ===== Tendencias =====
    improvement_trend FLOAT CHECK (improvement_trend >= -1 AND improvement_trend <= 1),
    recent_avg_error_rate FLOAT CHECK (recent_avg_error_rate >= 0 AND recent_avg_error_rate <= 1),
    
    -- ===== Clustering (serializado) =====
    error_clusters JSONB,  -- [{"cluster_id": 1, "description": "...", ...}, ...]
    
    -- ===== Timestamps =====
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- ===== Indexes =====
    INDEX idx_player_updated (player_id, last_updated DESC)
);

-- ========================================
-- TABLA 3: analysis_plans (Nueva - opcional)
-- Historial de planes de análisis
-- ========================================

CREATE TABLE analysis_plans (
    id SERIAL PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES users(id),
    
    target_moves INTEGER[],  -- Array de índices de jugadas
    analysis_modes TEXT[],  -- ["engine", "ml", "rag"]
    priorities JSONB,  -- {"5": "high", "12": "medium", ...}
    
    options JSONB,  -- AnalysisOptions completo
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_game_created (game_id, created_at DESC)
);
```

---

## 3. Estrategia de Migración

### Fase 1: AGREGAR (No modificar legacy)

**Objetivo:** Nuevas tablas coexisten con las antiguas.

```sql
-- Ejecutar migraciones Alembic
alembic revision --autogenerate -m "Add orchestrated architecture tables"
alembic upgrade head
```

**Cambios:**
- ✅ Crear `move_analyses`
- ✅ Crear `player_patterns`
- ✅ Crear `analysis_plans` (opcional)
- ✅ NO tocar tabla `moves` (legacy)
- ✅ NO tocar tabla `games`

**Resultado:**
```
games (legacy)
moves (legacy) ← Sigue funcionando
users (legacy)
---
move_analyses (new) ← v2.0 escribe aquí
player_patterns (new)
analysis_plans (new)
```

---

### Fase 2: DUAL WRITE (Escribir en ambas)

**Objetivo:** Nuevos análisis se guardan en AMBAS tablas para mantener compatibilidad.

#### Código de Dual Write

```python
class MemoryService:
    """
    Memory service con dual write.
    """
    
    async def store_move_analysis(
        self,
        game_id: UUID,
        enriched_result: EnrichedResult,
        enable_dual_write: bool = True  # Feature flag
    ) -> None:
        """
        Guarda análisis en nueva tabla (move_analyses).
        
        Si dual_write=True, también guarda en tabla legacy (moves).
        """
        
        # 1. Guardar en nueva tabla (v2.0)
        await self._store_in_move_analyses(game_id, enriched_result)
        
        # 2. Dual write: también guardar en tabla legacy
        if enable_dual_write:
            await self._store_in_moves_legacy(game_id, enriched_result)
    
    async def _store_in_move_analyses(
        self,
        game_id: UUID,
        result: EnrichedResult
    ) -> None:
        """Inserción en nueva tabla."""
        exec_result = result.execution_result
        ml_pred = exec_result.ml_prediction
        rag_ctx = exec_result.rag_context
        critic = result.critic_result
        
        query = """
        INSERT INTO move_analyses (
            game_id, player_id, ply, move_san,
            fen_before, fen_after,
            engine_eval_before, engine_eval_after, score_diff,
            best_move, best_line,
            features, tactical_tags, phase,
            ml_predicted_error, ml_confidence, ml_risk_score, ml_contributing_features,
            rag_similar_positions, rag_book_excerpts, rag_total_retrieved, rag_relevance_scores,
            explanation,
            is_consistent, critic_confidence, critic_issues, critic_passed_rules, critic_failed_rules,
            execution_time, version
        ) VALUES (
            $1, $2, $3, $4,
            $5, $6,
            $7, $8, $9,
            $10, $11,
            $12, $13, $14,
            $15, $16, $17, $18,
            $19, $20, $21, $22,
            $23,
            $24, $25, $26, $27, $28,
            $29, $30
        )
        """
        
        await self.db.execute(
            query,
            game_id, exec_result.player_id, exec_result.ply, exec_result.move_san,
            exec_result.fen_before, exec_result.fen_after,
            exec_result.engine_eval_before, exec_result.engine_eval_after, exec_result.score_diff,
            exec_result.best_move, exec_result.best_line,
            json.dumps(exec_result.features), exec_result.tactical_tags, exec_result.phase,
            ml_pred.predicted_error if ml_pred else None,
            ml_pred.confidence if ml_pred else None,
            ml_pred.risk_score if ml_pred else None,
            json.dumps(ml_pred.contributing_features) if ml_pred else None,
            json.dumps(rag_ctx.similar_positions) if rag_ctx else None,
            rag_ctx.book_excerpts if rag_ctx else None,
            rag_ctx.total_retrieved if rag_ctx else 0,
            rag_ctx.relevance_scores if rag_ctx else None,
            result.explanation,
            critic.is_consistent, critic.confidence,
            json.dumps([issue.dict() for issue in critic.issues]),
            critic.passed_rules, critic.failed_rules,
            exec_result.execution_time, "v2.0"
        )
    
    async def _store_in_moves_legacy(
        self,
        game_id: UUID,
        result: EnrichedResult
    ) -> None:
        """
        Inserción en tabla legacy (moves).
        
        Mapeo:
        - evaluation: score_diff
        - best_move: best_move
        - explanation: explanation
        - error_label: ml_predicted_error
        - tactical_theme: primer tactical_tag
        """
        exec_result = result.execution_result
        ml_pred = exec_result.ml_prediction
        
        query = """
        INSERT INTO moves (
            game_id, ply, move_san,
            fen_before, fen_after,
            evaluation, best_move,
            explanation,
            tactical_theme, error_label
        ) VALUES (
            $1, $2, $3,
            $4, $5,
            $6, $7,
            $8,
            $9, $10
        )
        """
        
        await self.db.execute(
            query,
            game_id, exec_result.ply, exec_result.move_san,
            exec_result.fen_before, exec_result.fen_after,
            exec_result.score_diff, exec_result.best_move,
            result.explanation,
            exec_result.tactical_tags[0] if exec_result.tactical_tags else None,
            ml_pred.predicted_error if ml_pred else "good"
        )
```

**Ventajas:**
- Frontend legacy sigue funcionando sin cambios
- Datos disponibles en ambos formatos
- Rollback fácil (apagar dual write)

**Desventajas:**
- Duplicación de datos (temporal)
- Overhead de escritura ~2x

---

### Fase 3: DUAL READ (Leer de nueva con fallback a legacy)

**Objetivo:** API lee de nueva tabla, si falla/vacío, lee de legacy.

```python
class AnalysisRepository:
    """
    Repositorio con dual read.
    """
    
    async def get_move_analysis(
        self,
        game_id: UUID,
        ply: int,
        prefer_version: str = "v2.0"  # Feature flag
    ) -> Optional[EnrichedResult]:
        """
        Lee análisis de jugada.
        
        Estrategia:
        1. Intentar leer de move_analyses (v2.0)
        2. Si no existe, leer de moves (legacy) y adaptar
        """
        
        if prefer_version == "v2.0":
            # Intentar nueva tabla
            result = await self._read_from_move_analyses(game_id, ply)
            if result:
                return result
            
            # Fallback: leer de legacy
            logger.info(f"No encontrado en v2.0, fallback a legacy para game {game_id}, ply {ply}")
            return await self._read_from_moves_legacy(game_id, ply)
        
        else:
            # Legacy first
            return await self._read_from_moves_legacy(game_id, ply)
    
    async def _read_from_moves_legacy(
        self,
        game_id: UUID,
        ply: int
    ) -> Optional[EnrichedResult]:
        """
        Lee de tabla legacy y adapta a formato nuevo.
        
        Limitaciones:
        - No hay features
        - No hay RAG context
        - No hay critic result (asumimos is_consistent=True)
        """
        query = """
        SELECT * FROM moves
        WHERE game_id = $1 AND ply = $2
        """
        
        row = await self.db.fetchrow(query, game_id, ply)
        if not row:
            return None
        
        # Adaptar a ExecutionResult (con datos limitados)
        exec_result = ExecutionResult(
            game_id=game_id,
            ply=row["ply"],
            move_san=row["move_san"],
            fen_before=row["fen_before"],
            fen_after=row["fen_after"],
            engine_eval_before=0.0,  # No disponible en legacy
            engine_eval_after=0.0,
            score_diff=row["evaluation"],
            best_move=row["best_move"],
            best_line=[],
            features={},  # Vacío
            tactical_tags=[row["tactical_theme"]] if row["tactical_theme"] else [],
            phase="middlegame",  # Asumido
            ml_prediction=MLPrediction(
                predicted_error=row["error_label"] or "good",
                confidence=0.5,  # Mock
                risk_score=0.5,
                contributing_features=[]
            ),
            rag_context=None,  # No disponible
            timestamp=row["created_at"],
            execution_time=0.0
        )
        
        # Critic result mock (asumimos consistente)
        critic_result = CriticResult(
            is_consistent=True,
            confidence=1.0,
            issues=[],
            passed_rules=["LegacyData"],
            failed_rules=[]
        )
        
        return EnrichedResult(
            execution_result=exec_result,
            explanation=row["explanation"],
            critic_result=critic_result,
            metadata={"source": "legacy", "version": "v1.0"}
        )
```

---

### Fase 4: MIGRACIÓN HISTÓRICA (Opcional)

**Objetivo:** Migrar análisis antiguos de `moves` a `move_analyses`.

#### Script de Migración

```python
# scripts/migrate_legacy_to_v2.py

import asyncio
from src.api.db import get_db
from uuid import UUID

async def migrate_legacy_analyses():
    """
    Migra análisis legacy (tabla moves) a nueva tabla (move_analyses).
    
    ADVERTENCIA:
    - Datos incompletos (sin features, RAG, etc.)
    - Solo migrar si es crítico mantener historial
    """
    
    db = await get_db()
    
    # 1. Contar registros legacy
    count_query = "SELECT COUNT(*) FROM moves WHERE id NOT IN (SELECT legacy_move_id FROM move_analyses WHERE legacy_move_id IS NOT NULL)"
    total = await db.fetchval(count_query)
    
    print(f"Total de análisis legacy a migrar: {total}")
    
    # 2. Migrar en lotes
    batch_size = 1000
    offset = 0
    
    while offset < total:
        print(f"Migrando lote {offset} - {offset + batch_size}...")
        
        query = """
        SELECT * FROM moves
        WHERE id NOT IN (SELECT legacy_move_id FROM move_analyses WHERE legacy_move_id IS NOT NULL)
        ORDER BY id
        LIMIT $1 OFFSET $2
        """
        
        rows = await db.fetch(query, batch_size, offset)
        
        for row in rows:
            # Adaptar y insertar
            await _insert_legacy_as_v2(db, row)
        
        offset += batch_size
        await asyncio.sleep(0.1)  # Rate limiting
    
    print("Migración completada!")

async def _insert_legacy_as_v2(db, legacy_row):
    """Inserta registro legacy en move_analyses."""
    
    query = """
    INSERT INTO move_analyses (
        game_id, player_id, ply, move_san,
        fen_before, fen_after,
        score_diff, best_move,
        explanation,
        ml_predicted_error,
        is_consistent, critic_confidence,
        version,
        legacy_move_id
    ) VALUES (
        $1, (SELECT user_id FROM games WHERE id = $1), $2, $3,
        $4, $5,
        $6, $7,
        $8,
        $9,
        TRUE, 1.0,
        'v1.0-migrated',
        $10
    )
    ON CONFLICT (game_id, ply, version) DO NOTHING
    """
    
    await db.execute(
        query,
        legacy_row["game_id"],
        legacy_row["ply"],
        legacy_row["move_san"],
        legacy_row["fen_before"],
        legacy_row["fen_after"],
        legacy_row["evaluation"],
        legacy_row["best_move"],
        legacy_row["explanation"],
        legacy_row["error_label"] or "good",
        legacy_row["id"]  # Guardar referencia al original
    )

if __name__ == "__main__":
    asyncio.run(migrate_legacy_analyses())
```

**Ejecutar:**
```bash
python scripts/migrate_legacy_to_v2.py
```

---

### Fase 5: DEPRECAR LEGACY (Futuro)

**Objetivo:** Eventualmente eliminar tabla `moves` legacy.

**Criterios para deprecación:**
1. ✅ 100% de nuevos análisis usan v2.0
2. ✅ Frontend migrado a nuevos endpoints
3. ✅ Migración histórica completada (o datos legacy archivados)
4. ✅ 60 días sin lecturas de tabla `moves`

**Script de Deprecación:**

```sql
-- 1. Renombrar tabla legacy (no eliminar aún)
ALTER TABLE moves RENAME TO moves_legacy_deprecated;

-- 2. Eliminar índices
DROP INDEX IF EXISTS idx_game_ply ON moves_legacy_deprecated;

-- 3. Archivar en cold storage (opcional)
-- Exportar a CSV/Parquet para backup
COPY moves_legacy_deprecated TO '/backups/moves_legacy_20260401.csv' CSV HEADER;

-- 4. Eliminar después de período de gracia (90 días)
-- DROP TABLE moves_legacy_deprecated;
```

---

## 4. Alembic Migrations

### Migration 1: Add Orchestrated Tables

```python
# alembic/versions/2026_03_25_add_orchestrated_tables.py

"""Add orchestrated architecture tables

Revision ID: abc123def456
Revises: previous_revision
Create Date: 2026-03-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'abc123def456'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade():
    # Create move_analyses table
    op.create_table(
        'move_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('ply', sa.Integer(), nullable=False),
        sa.Column('move_san', sa.String(length=10), nullable=False),
        sa.Column('fen_before', sa.Text(), nullable=False),
        sa.Column('fen_after', sa.Text(), nullable=False),
        sa.Column('engine_eval_before', sa.Float(), nullable=True),
        sa.Column('engine_eval_after', sa.Float(), nullable=True),
        sa.Column('score_diff', sa.Float(), nullable=True),
        sa.Column('best_move', sa.String(length=10), nullable=True),
        sa.Column('best_line', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('features', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tactical_tags', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('phase', sa.String(length=20), nullable=True),
        sa.Column('ml_predicted_error', sa.String(length=20), nullable=True),
        sa.Column('ml_confidence', sa.Float(), nullable=True),
        sa.Column('ml_risk_score', sa.Float(), nullable=True),
        sa.Column('ml_contributing_features', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('rag_similar_positions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('rag_book_excerpts', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('rag_total_retrieved', sa.Integer(), nullable=True),
        sa.Column('rag_relevance_scores', postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('is_consistent', sa.Boolean(), nullable=False),
        sa.Column('critic_confidence', sa.Float(), nullable=True),
        sa.Column('critic_issues', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('critic_passed_rules', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('critic_failed_rules', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('execution_time', sa.Float(), nullable=True),
        sa.Column('version', sa.String(length=20), server_default='v2.0', nullable=True),
        sa.ForeignKeyConstraint(['game_id'], ['games.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('game_id', 'ply', 'version', name='uq_game_ply_version')
    )
    op.create_index('idx_game_ply', 'move_analyses', ['game_id', 'ply'])
    op.create_index('idx_player_created', 'move_analyses', ['player_id', sa.text('created_at DESC')])
    op.create_index('idx_version', 'move_analyses', ['version'])
    op.create_index('idx_ml_prediction', 'move_analyses', ['ml_predicted_error'])
    op.create_index('idx_critic_consistent', 'move_analyses', ['is_consistent'])
    
    # Create player_patterns table
    op.create_table(
        'player_patterns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('total_games_analyzed', sa.Integer(), server_default='0', nullable=True),
        sa.Column('total_moves_analyzed', sa.Integer(), server_default='0', nullable=True),
        sa.Column('error_distribution', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('frequent_tactics', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('weak_phases', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column('phase_error_rates', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('improvement_trend', sa.Float(), nullable=True),
        sa.Column('recent_avg_error_rate', sa.Float(), nullable=True),
        sa.Column('error_clusters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_updated', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['player_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('player_id', name='uq_player_patterns')
    )
    op.create_index('idx_player_updated', 'player_patterns', ['player_id', sa.text('last_updated DESC')])

def downgrade():
    op.drop_index('idx_player_updated', table_name='player_patterns')
    op.drop_table('player_patterns')
    
    op.drop_index('idx_critic_consistent', table_name='move_analyses')
    op.drop_index('idx_ml_prediction', table_name='move_analyses')
    op.drop_index('idx_version', table_name='move_analyses')
    op.drop_index('idx_player_created', table_name='move_analyses')
    op.drop_index('idx_game_ply', table_name='move_analyses')
    op.drop_table('move_analyses')
```

**Ejecutar:**
```bash
alembic upgrade head
```

---

## 5. Feature Flags para Control

### Configuración

```python
# src/api/config.py

from pydantic import BaseSettings

class Settings(BaseSettings):
    """Configuración de la aplicación."""
    
    # Feature flags para migración
    ENABLE_ORCHESTRATED_ANALYSIS: bool = True
    ENABLE_DUAL_WRITE: bool = True  # Escribir en ambas tablas
    PREFER_VERSION: str = "v2.0"  # "v1.0" | "v2.0"
    ENABLE_LEGACY_MIGRATION: bool = False  # Migración histórica
    
    # Database
    DATABASE_URL: str
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### Uso en Endpoints

```python
from fastapi import APIRouter, Depends
from src.api.config import settings

router = APIRouter()

@router.post("/api/analysis/{game_id}")
async def analyze_game(game_id: UUID):
    """
    Endpoint de análisis con feature flags.
    """
    
    if settings.ENABLE_ORCHESTRATED_ANALYSIS:
        # Usar nueva arquitectura v2.0
        return await analyze_game_orchestrated(game_id)
    else:
        # Usar arquitectura legacy v1.0
        return await analyze_game_legacy(game_id)
```

---

## 6. Rollback Plan

### Escenario: Problemas en v2.0

**Pasos:**

1. **Desactivar orchestrated analysis:**
   ```bash
   export ENABLE_ORCHESTRATED_ANALYSIS=false
   # Restart API
   systemctl restart chess_trainer_api
   ```

2. **Verificar que legacy sigue funcionando:**
   ```bash
   curl http://localhost:8000/api/analysis/legacy/{game_id}
   ```

3. **Revisar logs de errores:**
   ```bash
   tail -f logs/api.log | grep ERROR
   ```

4. **Si es crítico, rollback DB:**
   ```bash
   alembic downgrade -1  # Elimina tablas nuevas
   ```

**Datos NO se pierden:**
- Dual write garantiza que datos están en ambas tablas
- Rollback de Alembic no elimina datos, solo tablas vacías

---

## 7. Testing de Migración

### Test 1: Dual Write

```python
@pytest.mark.asyncio
async def test_dual_write_creates_in_both_tables():
    """Verifica que dual write funciona."""
    
    # Setup
    game = create_test_game()
    enriched = create_test_enriched_result()
    
    memory = MemoryService(db, enable_dual_write=True)
    
    # Execute
    await memory.store_move_analysis(game.id, enriched)
    
    # Assert: existe en move_analyses (v2.0)
    v2_row = await db.fetchrow(
        "SELECT * FROM move_analyses WHERE game_id = $1 AND ply = $2",
        game.id, enriched.execution_result.ply
    )
    assert v2_row is not None
    assert v2_row["version"] == "v2.0"
    
    # Assert: existe en moves (legacy)
    legacy_row = await db.fetchrow(
        "SELECT * FROM moves WHERE game_id = $1 AND ply = $2",
        game.id, enriched.execution_result.ply
    )
    assert legacy_row is not None
    assert legacy_row["explanation"] == enriched.explanation
```

### Test 2: Dual Read con Fallback

```python
@pytest.mark.asyncio
async def test_dual_read_fallback_to_legacy():
    """Verifica que dual read funciona con fallback."""
    
    # Setup: solo existe en legacy
    game = create_test_game()
    await db.execute(
        "INSERT INTO moves (game_id, ply, move_san, evaluation, explanation) VALUES ($1, $2, $3, $4, $5)",
        game.id, 10, "Nf3", -50, "Explicación legacy"
    )
    
    # Execute
    repo = AnalysisRepository(db, prefer_version="v2.0")
    result = await repo.get_move_analysis(game.id, 10)
    
    # Assert: retorna datos adaptados de legacy
    assert result is not None
    assert result.metadata["source"] == "legacy"
    assert result.explanation == "Explicación legacy"
```

---

## 8. Cronograma de Migración

| Fase                            | Duración        | Descripción                          | Rollback Risk |
| ------------------------------- | --------------- | ------------------------------------ | ------------- |
| **Fase 1: Agregar tablas**      | 1 día           | Crear move_analyses, player_patterns | Bajo ✅        |
| **Fase 2: Dual write**          | 1 semana        | Escribir en ambas tablas             | Bajo ✅        |
| **Fase 3: Dual read**           | 1 semana        | Leer de v2.0 con fallback            | Medio ⚠️       |
| **Fase 4: Migración histórica** | 2 semanas       | Migrar datos legacy (opcional)       | Alto ⛔        |
| **Fase 5: Deprecar legacy**     | 3 meses después | Eliminar tabla moves                 | Muy Alto ⛔    |

---

## 9. Monitoring y Alertas

### Métricas Clave

```python
from prometheus_client import Counter, Histogram

# Contadores
dual_write_success = Counter('dual_write_success_total', 'Dual writes exitosos')
dual_write_failure = Counter('dual_write_failure_total', 'Dual writes fallidos', ['table'])

dual_read_v2 = Counter('dual_read_v2_total', 'Lecturas de v2.0')
dual_read_legacy = Counter('dual_read_legacy_fallback_total', 'Fallbacks a legacy')

# Histogramas
migration_duration = Histogram('migration_batch_duration_seconds', 'Duración de lotes de migración')
```

### Alertas

```yaml
# prometheus/alerts.yml

groups:
  - name: migration
    interval: 30s
    rules:
      - alert: HighDualWriteFailureRate
        expr: rate(dual_write_failure_total[5m]) > 0.05
        for: 5m
        annotations:
          summary: "Alta tasa de fallos en dual write (>5%)"
          description: "Revisar logs de base de datos"
      
      - alert: HighLegacyFallbackRate
        expr: rate(dual_read_legacy_fallback_total[5m]) / rate(dual_read_v2_total[5m]) > 0.3
        for: 10m
        annotations:
          summary: "Muchos fallbacks a legacy (>30%)"
          description: "Posible problema con migración o v2.0"
```

---

## Próximos Pasos

1. ✅ **Plan de migración definido**
2. ⏭️ **Crear migration Alembic**
3. ⏭️ **Implementar dual write en MemoryService**
4. ⏭️ **Implementar dual read en AnalysisRepository**
5. ⏭️ **Tests de migración**

---

**Documento creado:** Marzo 25, 2026  
**Autor:** AI Assistant + sergiosal  
**Estado:** DRAFT v1.0

