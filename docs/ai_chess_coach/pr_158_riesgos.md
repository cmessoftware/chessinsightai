# PR #158 — riesgos y propuesta de separación

## Resumen

La PR #158 incorpora avances necesarios para el MVP de ChessInsight:

- Persistencia de las clasificaciones calculadas con Stockfish WASM.
- Unificación del catálogo de partidas.
- Migración de `module07_games` hacia `games` + `coach_games`.
- Nuevos endpoints de integridad y reparación.
- Refactor del workspace de análisis.
- Navegación Coach reorganizada.
- Análisis directo desde FEN.
- Documentación futura para Stockfish, Lc0 y Maia.

El problema no es la dirección técnica, sino el alcance: **71 archivos modificados, 5.279 líneas agregadas y 1.740 eliminadas**. La PR mezcla persistencia, migración destructiva, API, lógica de catálogo, refactor del frontend, nuevas pantallas y documentación arquitectónica.

Esto dificulta:

- Revisar correctamente cada cambio.
- Detectar regresiones.
- Aislar fallos.
- Revertir una funcionalidad sin afectar las demás.
- Determinar qué parte fue realmente probada.
- Validar la migración de datos independientemente de la UI.



## Riesgos detectados


| Prioridad | Riesgo                                                             | Consecuencia                                                               | Estado |
| --------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------ |
| P0        | Migración GC-2 elimina `module07_games`                            | Una falla durante la migración puede dificultar la recuperación            | ⬜ **Abierto** — solo en monolito #158; PR **B** no split ni merge |
| P0        | La migración importa código mutable de aplicación                  | Cambios futuros en `master_games.py` pueden romper una migración histórica | ⬜ **Abierto** — endurecer Alembic GC-2 antes de merge **B** |
| P0        | Frontend fuera del CI                                              | `npm test` y `npm run build` pueden fallar sin bloquear el merge           | 🟡 **Parcial** — job **Coach MVP (P0-1)** en #159 verde (pytest + npm); legacy sigue informativo |
| P0        | Refactor del workspace mezclado con persistencia                   | Una regresión visual puede ocultar un problema de backend o viceversa      | 🟡 **Mitigado en A** — #159 sin workspace; ⬜ persiste hasta **PR C** aislado |
| P0        | Mental 1600 todavía no está reconectado completamente al workspace | Puede perderse una función recién integrada                                | ⬜ **Abierto** — hoy en `CoachGameAnalysisPage`; **PR C** debe reconectar en workspace |
| P1        | El payload persistido acepta un diccionario genérico               | Pueden almacenarse datos incompletos o incompatibles                       | ⬜ **Abierto** en **PR A** (#159) — sin schema estricto en PUT |
| P1        | PUT reemplaza el snapshot completo de anotaciones                  | Dos sesiones pueden sobrescribir resultados                                | ⬜ **Abierto** — diseño actual SV-2; documentar o versionar en fase 2 |
| P1        | Los errores de hidratación se silencian                            | La UI puede continuar sin informar que falló la recuperación               | ⬜ **Abierto** — revisar UX en **PR A** o follow-up |
| P1        | El hash incluye encabezados PGN                                    | La misma partida importada desde fuentes diferentes puede no deduplicarse  | ⬜ **Abierto** — sin cambio en split actual |
| P1        | Endpoint de reparación elimina filas                               | Falta `dry_run`, auditoría y confirmación explícita                        | ⬜ **Abierto** — entra con catálogo **PR B** |
| P1        | CI verde solamente para Python                                     | No valida WASM, React, migraciones reales ni recorrido end-to-end          | 🟡 **Parcial** — P0-1 cubre frontend en PR funcionales; sin HITL automatizado ni GC-2 en CI |
| P2        | Documentación de Lc0/Maia mezclada con el MVP                      | Aumenta el ruido de revisión sin aportar implementación ejecutable         | 🟡 **Mitigado** — mini-plans en **PR E** (`feature/11_133_coach_engine_docs`) |




## Propuesta de separación



### PR A — Persistencia de clasificación por ply

**Objetivo:** conservar las clasificaciones generadas por Stockfish WASM.

**Incluir:**

- Migraciones:
  - `module07_ply_annotations`.
  - Resumen de análisis cliente.
- Modelos SQLAlchemy.prueba
- Repositorio de anotaciones.
- Endpoints:
  - `GET /games/{game_id}/annotations`.
  - `PUT /games/{game_id}/annotations`.
- Hook `useSyncPlyClassificationPersistence`.
- Tests Python y Vitest correspondientes.

**No incluir:**

- Migración `coach_games`.
- Refactor del workspace.
- Nuevas páginas.
- Documentación Lc0/Maia.

**Criterios de aceptación:**

- La clasificación se guarda y recupera después de recargar la página.
- Se validan explícitamente los campos del payload.
- Se persisten versión de reglas, profundidad, MultiPV y versión del motor.
- Una firma de línea diferente invalida las anotaciones anteriores.
- Se prueba aislamiento entre dos usuarios.
- `pytest`, `npm test` y `npm run build` quedan verdes.

---



### PR B — Catálogo maestro y migración `coach_games`

**Objetivo:** establecer una única identidad de partida y separar los datos del Coach.

**Incluir:**

- `master_games.py`.
- `coach_catalog.py`.
- Tabla `coach_games`.
- FK hacia `games`.
- Migración de datos desde `module07_games`.
- Tests GC-1, GC-2 y GC-3.
- Endpoint de salud del catálogo.

**Cambios requeridos antes del merge:**

- Copiar la lógica imprescindible dentro del archivo Alembic.
- No importar módulos mutables de la aplicación desde la migración.
- Evitar commits internos que puedan romper la atomicidad.
- Agregar modo `dry_run` a la reparación.
- Registrar los IDs afectados antes de eliminar datos.
- Mantener backup previo a eliminar `module07_games`.

**Criterios de aceptación:**

- Upgrade desde una base vacía.
- Upgrade desde una base con datos reales.
- Downgrade y nuevo upgrade.
- Cero partidas perdidas.
- Cero decisiones o anotaciones huérfanas.
- Reimportación idempotente.
- Aislamiento correcto por usuario.

---



### PR C — Workspace compartido de análisis

**Objetivo:** reducir duplicación entre análisis de partidas y posiciones.

**Incluir:**

- `CoachStudyWorkspace`.
- Adaptación de `CoachGameAnalysisPage`.
- Adaptación de páginas que consumen el workspace.
- Componentes compartidos del tablero y PGN.
- Tests de componentes y navegación.

**No incluir:**

- Migraciones.
- Persistencia nueva.
- Catálogo maestro.
- Entrada FEN si requiere lógica adicional.

**Criterios de aceptación:**

- Navegación por todo el PGN.
- Stockfish WASM sigue funcionando.
- Panel avanzado sigue funcionando.
- Mental 1600 sigue conectado.
- No se pierde la selección del ply.
- Build React limpio.
- Pruebas visuales sobre al menos una partida completa.

---



### PR D — Navegación Coach y entrada FEN

**Objetivo:** mejorar la experiencia de uso sin modificar el dominio.

**Incluir:**

- `CoachHomePage`.
- `CoachSubNav`.
- `CoachPartidasPage`.
- `CoachImportarPage`.
- `CoachPositionPage`.
- Parseo y validación de FEN.
- Recuperación de la última partida.

**Criterios de aceptación:**

- Inicio sin partidas muestra posición inicial.
- Inicio con historial recupera la última partida.
- FEN válido abre el workspace.
- FEN inválido muestra un error claro.
- Navegación atrás no pierde el estado inesperadamente.
- El filtro `ANALYSIS` muestra solo la biblioteca Coach del usuario.

---



### PR E — Documentación de motores y arquitectura futura

**Objetivo:** registrar decisiones sin mezclarlas con código operativo.

**Incluir:**

- Arquitectura de servicios de análisis.
- Mini-plan Stockfish servidor.
- Mini-plan Lc0.
- Mini-plan Maia.
- Política de análisis liviano y profundo.
- Roadmap de análisis asíncrono.

**Criterios de aceptación:**

- Responsabilidad de cada motor explícita.
- Stockfish servidor definido como evaluación autoritativa.
- Stockfish WASM definido como evaluación provisional.
- Lc0 limitado a casos estratégicos ambiguos.
- Maia limitado a plausibilidad humana por banda Elo.
- Sin dependencia de esta documentación para cerrar las PR anteriores.



## Orden de integración recomendado


| Orden | PR                          | Dependencia                              | Estado | PR / rama | Pendiente para cerrar esta fase |
| ----- | --------------------------- | ---------------------------------------- | ------ | --------- | -------------------------------- |
| 1     | PR A — Persistencia por ply | Estado actual de `main`                  | ✅ **Mergeado** | [#159](https://github.com/cmessoftware/chessinsightai/pull/159) · `feature/11_120_sv2_ply_persist` | `alembic upgrade 20261009_000002` en entornos que aún no migraron |
| 2     | PR B — Catálogo y migración | PR A integrada o migraciones coordinadas | ✅ **Mergeado** | [#161](https://github.com/cmessoftware/chessinsightai/pull/161) · `feature/11_130_coach_games_catalog` | `alembic upgrade 20261010_000001` en staging/prod (backup); migración aún importa `master_games` (P0 doc) |
| 3     | PR C — Workspace compartido | B en `main`                                | ✅ **Mergeado** | [#162](https://github.com/cmessoftware/chessinsightai/pull/162) · `feature/11_131_coach_study_workspace` | — |
| 4     | PR D — Navegación y FEN     | C en `main`                                | ✅ **Mergeado** | [#163](https://github.com/cmessoftware/chessinsightai/pull/163) · `feature/11_132_coach_nav_fen` | — |
| 5     | PR E — Documentación        | Independiente                            | ✅ **Mergeado** | [#164](https://github.com/cmessoftware/chessinsightai/pull/164) · `feature/11_133_coach_engine_docs` | — |

### Integración split #158 — **cerrada** (2026-10-15)

Todas las hijas **A–E** están en `main` (#159–#164). El monolito [#158](https://github.com/cmessoftware/chessinsightai/pull/158) queda **cerrado sin merge** (referencia histórica).

1. ~~PR A → E en `main`.~~ **Hecho.**
2. Entornos: `alembic upgrade head` (`20261009_*` + `20261010_000001`) con backup donde aplique.
3. Opcional: tag `backup/pr-158-20261015` en el tip de `feature/11_120_ply_classification_persist`.
4. Diff residual monolito vs `main` en `src/`: sobre todo `CoachJobsPage` legacy (reemplazado por Partidas + `CoachGamesPanel`); no requiere cherry-pick.

**Fuera del split pero ya en rama A:** FEAT-014 (girar tablero) y BUG-015 (numeración PGN en nav) en `feature/11_120_sv2_ply_persist` — van con el merge de #159, no requieren PR aparte.




## Cambios obligatorios para la rama original

Antes de dividir la PR:

1. Crear una etiqueta o tag de respaldo para el estado actual de la rama.
2. Identificar los commits correspondientes a cada responsabilidad.
3. Crear nuevas ramas desde `main`, no desde la PR completa.
4. Aplicar los commits mediante `cherry-pick` selectivo.
5. Resolver dependencias entre migraciones explícitamente.
6. Cerrar la PR #158 cuando las PR separadas estén creadas.
7. Referenciar la PR #158 desde cada nueva PR para mantener trazabilidad.



## Política de CI requerida

Cada PR funcional debe ejecutar:

```text
pytest tests/mvp tests/docs_courses tests/chess_statistics
npm ci
npm test
npm run build
```

---

## Prueba local por PR (un solo stack)

No hace falta otro “ambiente” (máquina, deploy, dominio). Usás **Postgres + API + Vite** una vez; por cada PR cambiás **rama Git**, **revisión Alembic** y corrés **pytest / npm** acotados + checklist manual (HITL).

### Stack base (Windows / PowerShell)

```powershell
# Repo root
docker compose up -d postgres
# .env: CHESS_TRAINER_DB_URL=postgresql://chess:chess_pass@localhost:5432/chess_trainer_db
pip install -r requirements-ci.txt

# Migraciones: siempre desde la raíz del repo
alembic current
alembic upgrade <revision>   # ver tabla por PR abajo

cd src\api
$env:PYTHONPATH="..\..\src;..\..\src\api"
python -m uvicorn main:app --reload --port 8000

# Otra terminal
cd src\frontend
npm ci
npm run dev
```

Referencia Coach MVP: [README.md](../../README.md) (sección “Coach MVP”).

### Cadena Alembic relevante

| Revision ID | Archivo | PR |
|---|---|---|
| `20261005_000001` | merge heads module07 | **Baseline `main`** (antes de SV-2 / GC-2 en split) |
| `20261009_000001` | `module07_ply_annotations` | **A** |
| `20261009_000002` | `module07_client_analyzed_summary` | **A** (head de A) |
| `20261010_000001` | `gc2_coach_games` | **B** (head de B) |

PR **C** y **D** no agregan migraciones; usan el head de **B** (`20261010_000001` o `alembic upgrade head` en esa rama).

```powershell
alembic history -r-5:
alembic upgrade 20261009_000002    # solo hasta fin de PR A
alembic upgrade 20261010_000001    # incluye PR B
alembic upgrade head               # último revision de la rama actual
```

### Dos Postgres locales (convención post-split)

| Puerto host | Uso | Cómo levantarlo | Volumen |
|-------------|-----|-----------------|---------|
| **5434** | **Dev diario** (API, Vite, `.env`) | `src/start_db.ps1` → contenedor `chessinsight-postgres` | `chessinsightai_chess_pgdata` |
| **5433** | **Pruebas / migraciones arriesgadas** (pytest GC, HITL de ramas) | contenedor desechable abajo | ninguno (o borrar contenedor al terminar) |

`.env` apunta siempre a **5434**. Para probar una revisión Alembic sin tocar dev:

```powershell
$env:CHESS_TRAINER_DB_URL="postgresql://chess:chess_pass@127.0.0.1:5433/chess_trainer_db"
alembic upgrade head   # o una revision concreta
pytest tests/mvp/... -q
```

Los datos **no se comparten** entre 5433 y 5434: mismo esquema tras `upgrade head`, pero filas distintas (reimportar en dev si hiciste pruebas solo en 5433).

`docker compose up -d postgres` publica **5432** (otro volumen `chess_pgdata`); no es el stack Coach MVP documentado en Phase 1 (5434).

### Postgres desechable (patrón PR B — migración GC-2)

Para no arriesgar el volumen de dev en **5434**:

```powershell
docker rm -f chess_pg_test 2>$null
docker run -d --name chess_pg_test `
  -e POSTGRES_USER=chess -e POSTGRES_PASSWORD=chess_pass `
  -e POSTGRES_DB=chess_trainer_db -p 5433:5432 postgres:13
# Esperar a Postgres (no correr alembic en el mismo breath que docker run)
docker exec chess_pg_test pg_isready -U chess -d chess_trainer_db
$env:CHESS_TRAINER_DB_URL="postgresql://chess:chess_pass@127.0.0.1:5433/chess_trainer_db"
$env:PYTHONIOENCODING="utf-8"
alembic upgrade 20261010_000001
pytest tests/mvp/test_gc1_master_games.py tests/mvp/test_gc2_coach_games.py tests/mvp/test_gc3_coach_slim.py -q
```

Opcional: `pg_dump` de 5432 antes de probar GC-2 en la DB principal; restore si algo falla.

### Paralelo de ramas (opcional)

```powershell
git worktree add ..\chessinsightai-pr-a main
# en el worktree: checkout rama PR A; Vite en otro puerto: npm run dev -- --port 5174
```

### Tabla: qué probar en cada fase

| PR | Rama (sugerida) | `alembic upgrade` | Automatizado | HITL (navegador) |
|---|---|---|---|---|
| **A** | `feature/11_120_ply_classification_persist` (recortada) | `20261009_000002` | `pytest tests/mvp/test_module07_schema.py` (+ tests anotaciones); `cd src/frontend && npm test && npm run build` | Import PGN → análisis → WASM → **F5** → mismas etiquetas |
| **B** | `feature/11_130_coach_games_catalog` | `20261010_000001` (DB **5433** recomendada) | `pytest tests/mvp/test_gc1_master_games.py test_gc2_coach_games.py test_gc3_coach_slim.py test_module07_ingest.py -q` | Partidas Coach; filtro **ANALYSIS**; `GET .../coach-catalog/health`; reimport idempotente |
| **C** | `feature/11_131_coach_study_workspace` | `head` (post B) | CI Python + `npm test` / `npm run build` | PGN completo; WASM; panel avanzado; **Mental 1600**; ply estable |
| **D** | `feature/11_132_coach_nav_fen` | `head` | `npm test` (FEN, PGN replay) + build | Inicio; FEN válido/inválido; multi-PGN → primera partida + aviso |
| **E** | docs only | — | — | Revisión en GitHub |

### Checklist antes de merge a `main`

1. `pytest tests/mvp tests/docs_courses tests/chess_statistics -q`
2. `cd src/frontend && npm ci && npm test && npm run build`
3. HITL de la fila de la PR
4. Tras merge **B** en staging/prod: backup DB + `alembic upgrade head` desde **raíz del repo**

### Trazabilidad con #158

- **#158:** descripción con tabla PR A–E; #159 enlazado como mergeado; placeholders `#XXX` para B–E.
- **PRs hijas:** primera línea **`Extraído de #158`**; plantilla: [templates/pr-split-from-158-body.md](templates/pr-split-from-158-body.md).
- **#159:** descripción actualizada con «Extraído de #158» (mergeado).
- Tag de respaldo (opcional): `backup/pr-158-<fecha>` en el tip de `feature/11_120_ply_classification_persist`.

### Estado split (implementación)

| PR | Rama | Estado | Notas |
|---|---|---|---|
| **A** | `feature/11_120_sv2_ply_persist` | ✅ **#159 MERGED** | SV-2: `20261009_*`, GET/PUT annotations, hook en `CoachGameAnalysisPage`; + FEAT-014 / BUG-015 UI |
| **B** | `feature/11_130_coach_games_catalog` | ✅ **#161 MERGED** | GC-1–GC-3; HITL local; `alembic upgrade 20261010_000001` en cada entorno |
| **C** | `feature/11_131_coach_study_workspace` | ✅ **#162 MERGED** | CoachStudyWorkspace + CoachGameAnalysisPage |
| **D** | `feature/11_132_coach_nav_fen` | ✅ **#163 MERGED** | SubNav, Inicio, Partidas, FEN, PgnImportPanel compartido |
| **E** | `feature/11_133_coach_engine_docs` | ✅ **#164 MERGED** | Arquitectura + AS/LZ/MA mini-plans; roadmap Phase 2 |
| **Monolito** | `feature/11_120_ply_classification_persist` | 🔒 **#158 CLOSED** (sin merge) | Split completo; usar `main` como fuente |

