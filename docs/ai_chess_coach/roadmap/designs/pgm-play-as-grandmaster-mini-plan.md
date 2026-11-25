# PGM · Play as Grandmaster (jugar como el GM)

**Prefijo tracker:** `PGM-FEAT-*` · **Estado:** ⬜ Todo (solo documentación, 2026-11-25)  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) (sección PGM)  
**Inspiración:** modo «Jugar como gran maestro» de [Lucas Chess](https://lucaschess.blogspot.com/) — el alumno **solo mueve por el bando del GM**; el rival juega la jugada histórica del PGN.

**Relacionado:** categoría **Elite** en Partidas (`corpus_type` / chip Elite), `CoachStudyWorkspace`, FEAT-066 (PGN y comentarios), Sparring (SPAR-*), **LOG-FEAT-06…08** (grupos e instructor), candidata **FEAT-102** (ejercicios y asignaciones). Ver [§ Instructor vs PGM](#instructor-grupos-estudios-y-pgm).

## Objetivo pedagógico

Reproducir decisiones de grandes maestros sobre partidas ya cargadas en el sistema, con feedback inmediato, pistas opcionales y seguimiento de mejora entre intentos — sin inventar variantes: la «verdad» de referencia es la partida guardada (más evaluación cp cuando haga falta).

## Flujo de usuario (resumen)

1. Entrar al módulo → lista de GM (derivada de partidas Elite).
2. Elegir GM → listar partidas elegibles donde ese jugador es el GM (vista por color GM).
3. Iniciar intento → tablero con POV del color del GM; rival avanza solo según PGN.
4. Por cada jugada del GM: validar → pista opcional → revelar comentarios del PGN si los hay.
5. Fin de partida: resultado histórico + puntaje del intento + histórico y gráfico de intentos.

## Ítems del tracker (mapeo)

| Id | Requisito |
|----|-----------|
| PGM-FEAT-01 | Lista de GM y partidas desde catálogo Elite |
| PGM-FEAT-02 | Tablero orientado al color del GM |
| PGM-FEAT-03 | Marcar jugada correcta / incorrecta vs PGN |
| PGM-FEAT-04 | Pistas y comentarios tras acierto |
| PGM-FEAT-05 | Puntuación por pérdida de cp respecto a la jugada de la partida |
| PGM-FEAT-06 | Mostrar resultado al final |
| PGM-FEAT-07 | Reintentos y puntaje acumulado |
| PGM-FEAT-08 | Gráfico de variación entre intentos |
| PGM-FEAT-09 | Carcasa del módulo (ruta, subnav, modelo de datos de intentos) |

## Diseño técnico (borrador)

### Catálogo Elite y lista de GM (PGM-FEAT-01)

- **Fuente:** partidas visibles para el usuario con categoría/corpus **Elite** (misma regla que el filtro «Corpus elite» / `corpus_type: elite`; alinear con FEAT-101 si el chip manual difiere del corpus).
- **Lista GM:** conjunto dinámico de nombres normalizados (`White` / `Black` en PGN) que aparecen en ≥1 partida Elite; ordenar por recuento de partidas o alfabético; mostrar miniatura (foto opcional futura).
- **Al elegir GM:** partidas donde **ese jugador es el bando a imitar** (no confundir con «partida entre dos GMs» sin elegir bando).
- **Filtros sugeridos:** apertura (ECO), resultado, fecha, solo partidas con comentarios en PGN.

### Tablero y turnos (PGM-FEAT-02, base de PGM-FEAT-03)

- Reutilizar `ChessinsightBoard` / chess.js; **POV fijo** al color del GM (opción «girar tablero» desactivada o con aviso).
- **Turno rival:** aplicar automáticamente la siguiente jugada del PGN (animación opcional); usuario no puede mover por el rival.
- **Turno GM:** solo entonces aceptar input; congelar reloj pedagógico (sin tiempo unless fase 2).

### Validación (PGM-FEAT-03)

- **Exacta (MVP):** UCI/SAN de la jugada del usuario === jugada del ply en el PGN.
- **Mejora (fase 2):** aceptar **jugadas equivalentes** si `|cp_loss(usuario) - cp_loss(ref)| ≤ umbral` o si la jugada está dentro de ±N cp de la mejor del motor (configurable; Lucas Chess suele ser estricto en SAN).
- **Incorrecta:** mostrar la jugada correcta del GM antes de continuar (configurable: obligatorio vs opcional).

### Pistas y comentarios (PGM-FEAT-04)

- **Pistas escalonadas (sugerido):** (1) pieza/casilla origen → (2) casilla destino → (3) SAN completo; penalización opcional en puntaje.
- Tras **acierto** (o tras revelar jugada correcta): mostrar **comentarios PGN** del ply si existen (`%` o texto entre movimientos); no mostrar comentarios de plies futuros.
- Si no hay comentario en PGN, no inventar texto del motor en MVP (opcional: enlace a análisis Coach).

### Puntuación cp (PGM-FEAT-05)

- Referencia: evaluación **después** de la jugada del GM en la partida original (eval embebida en PGN si hay `[%eval]` / `%clk` Lichess, o **Stockfish WASM** en cliente con profundidad fija).
- Por jugada del GM: `cp_loss = max(0, eval(mejor alternativa motor) - eval(jugada_usuario))` en POV del GM, o distancia a la línea del PGN si el usuario no acertó SAN.
- **Agregado intento:** suma o media de cp_loss por jugada del GM; normalizar a «puntos» 0–100 para UI (fórmula documentada en implementación).
- Partidas sin eval en PGN: calcular bajo demanda y cachear por `gameId` + ply (no bloquear UX).

### Cierre y persistencia (PGM-FEAT-06, 07, 08, 09)

- **Final:** mostrar resultado del PGN (`1-0`, `½-½`, etc.) y texto «usted jugó como [GM]».
- **Reintentos:** mismo `gameId` + mismo color GM; guardar intento con timestamp, puntaje, desglose por ply.
- **Acumulado:** suma o mejor puntaje histórico por usuario/partida (definir en implementación; Lucas muestra progreso por partida).
- **Gráfico:** eje X = nº de intento o fecha; eje Y = puntaje o cp_loss medio; inspiración RPT-FEAT-03 pero por intentos PGM.
- **Persistencia:** tabla `pgm_attempts` (usuario, game_id, color, score, payload JSON por ply); API bajo `/api/v1/pgm/…`.
- **Ruta UI propuesta:** `/coach/pgm` (subnav Coach; tarjeta home opcional).

## Mejoras sugeridas (Lucas Chess y Coach)

| Mejora | Motivo |
|--------|--------|
| Modo «solo momentos críticos» (FEAT-115 / jugadas con score alto) | Acortar sesión en partidas largas |
| Omitir apertura memorizada (empezar en ply N) | Entrenar medio/final |
| Rival automático sin pausa configurable | Ritmo fluido vs reflexión |
| Ranking interno por GM (top puntajes del grupo) | Motivación; requiere LOG-FEAT-06 grupos |
| No mezclar con Sparring Maia | PGM es línea fija del PGN; Maia improvisa |
| FEAT-119 tap en móvil | Misma UX tablero en PGM |
| Sincronía con instructor (FEAT-102) | Asignar partida PGM a alumno/grupo |

## Inventario PGN Mentor (2026-11-25)

| Ubicación | Qué hay |
|-----------|---------|
| `data/games/fide_processed/` | **249** ZIP de jugadores (catálogo PGN Mentor / `chess_mentor.html`) |
| Conteo local | **~505 892** partidas (`[Event` en PGN dentro de los ZIP) |
| Catálogo HTML (referencia) | ~496 421 partidas listadas en la página de jugadores |
| Enlaces descarga | **498** filas en `src/scripts/pgn_links.txt` (duplicados menores vs HTML) |
| **Neon / `coach_games` hoy** | **488** filas `corpus_type = elite`, **357** `personal` (**979** filas en `games`) |

Conclusión: el material PGN Mentor **cubre de sobra** PGM; casi todo sigue **en disco**, no en Postgres. Las 488 elite actuales son una muestra previa (p. ej. importación parcial), no el corpus Mentor completo.

**Otros datos locales:** `data/games/elite_processed/` (p. ej. Lichess elite masivo) es **otra fuente**; PGM Mentor conviene marcarlo con proveniencia explícita (`pgn_mentor`, nombre del ZIP).

## Roster PGM inicial (curado, 2026-11-25)

**Política:** solo estos GM para el MVP de migración; **máximo 100 partidas por jugador** (salvo excepción). Catálogo canónico: [`pgm-mentor-curated-roster.json`](./pgm-mentor-curated-roster.json).

| # | Slug ZIP (PGN Mentor) | Nombre | Límite |
|---|------------------------|--------|--------|
| 1 | Alekhine | Alexander Alekhine | 100 |
| 2 | Anand | Viswanathan Anand | 100 |
| 3 | Capablanca | José Raúl Capablanca | 100 |
| 4 | Carlsen | Magnus Carlsen | 100 |
| 5 | Caruana | Fabiano Caruana | 100 |
| 6 | Euwe | Max Euwe | 100 |
| 7 | Fischer | Robert James Fischer | 100 |
| 8 | Karpov | Anatoly Karpov | 100 |
| 9 | Kasparov | Garry Kasparov | 100 |
| 10 | Larsen | Bent Larsen | 100 |
| 11 | Lasker | Emanuel Lasker | 100 |
| 12 | Morphy | Paul Morphy | 100 |
| 13 | Nimzowitsch | Aron Nimzowitsch | 100 |
| 14 | Panno | Oscar Panno | 100 |
| 15 | Petrosian | Tigran Petrosian | 100 |
| 16 | Philidor | François Philidor | **6** (todo el archivo) |
| 17 | PolgarJ | Judit Polgar | 100 |
| 18 | Najdorf | Miguel Najdorf | 100 |
| 19 | Quinteros | Miguel Quinteros | 100 |
| 20 | Reti | Richard Reti | 100 |
| 21 | Shirov | Alexei Shirov | 100 |
| 22 | Short | Nigel Short | 100 |
| 23 | Stein | Leonid Stein | 100 |
| 24 | Tal | Mikhail Tal | 100 |
| 25 | Tarrasch | Siegbert Tarrasch | 100 |
| 26 | Topalov | Veselin Topalov | 100 |

**Total teórico:** 26×100 + 6 = **≈2 606 partidas** (todos los ZIP verificados en `data/games/fide_processed/`).

**Correcciones de nombre respecto del listado oral:** Shor → **Short**, Tarrach → **Tarrasch**, Nardof → **Najdorf**. **PolgarJ** = Judit en PGN Mentor (no confundir con PolgarS/Z).

**Cómo elegir las 100 partidas por GM (import):**

1. Parsear el PGN del ZIP en orden de aparición.
2. Saltar partidas que incumplan FEAT-033 (≤10 plies sin FEN de estudio).
3. Priorizar partidas con **comentarios** en el PGN (mejor PGM-FEAT-04).
4. Desempate: diversidad de resultado (victorias / tablas / derrotas del GM) y fechas más recientes si hay `Date`.
5. Parar al llegar a `max_games_per_player` (u override por jugador, p. ej. Philidor).

La lista es **arbitraria y ampliable**; ampliar editando el JSON sin reimportar todo si el script es idempotente.

## Plan de migración a Postgres (borrador)

### Decisión de modelo

Hoy `coach_games` es **por `owner_user_id`**. PGM necesita un **catálogo compartido** (todos los usuarios ven las mismas partidas GM), no una copia por alumno.

| Opción | Pros | Contras |
|--------|------|---------|
| **A (recomendada MVP)** | Cuenta **servicio/admin** (`pgm_library`) dueña de todas las filas `corpus_type = elite`, `import_provenance.pgn_mentor = true` | Listados PGM filtran por proveniencia, no por todo Elite del usuario |
| **B** | Tabla `pgm_gm_profiles` + vista `pgm_games` | Más SQL; migración Alembic |
| **C** | Duplicar import por cada usuario | Inviable con ~500k partidas |

**Corpus:** `corpus_type = elite` (alinea con PGM-FEAT-01) + JSON `import_provenance`: `{ "provider": "pgn_mentor", "player_slug": "Anand", "archive": "Anand.zip" }`.  
**PGM GM pegado al ZIP:** `player_slug` = nombre del archivo sin extensión; `White`/`Black` en headers confirman el bando a imitar.

### Instructor, grupos, estudios y PGM {#instructor-grupos-estudios-y-pgm}

La doc prevé **dos formas de “compartir” material** que conviven pero no se sustituyen:

| Mecanismo | Ítems | Audiencia | Qué se comparte | Rol en PGM |
|-----------|-------|-----------|-----------------|------------|
| **Biblioteca PGM (catálogo)** | PGM-FEAT-01, PGM-FEAT-10 | Usuarios autenticados (lectura global del corpus Mentor) | ~2,6k partidas bajo cuenta `PGM_LIBRARY_OWNER_USER_ID`, filtro `import_provenance.provider = pgn_mentor` | **Publicar** el corpus una vez; alumnos leen sin clonar PGN |
| **Instructor → alumno/grupo** | LOG-FEAT-07/08, FEAT-109/110 | Solo grupos o alumnos autorizados | Clonar **estudios** o partidas del instructor a la biblioteca **privada** del alumno (`owner_user_id` del alumno) | **No** usar para cargar el roster Mentor (~2,5k × N alumnos). Sirve para material propio del entrenador |
| **Asignación pedagógica** | FEAT-102 (EX-FEAT-04), opcional ranking por grupo (LOG-FEAT-06) | Alumnos con vínculo/alcance explícito | Tarea del tipo «intentar partida X como Fischer» apuntando al `game_id` del catálogo compartido | **Puente** entre clase e PGM sin duplicar filas `coach_games` |

**Plataforma reutilizable:** grupos (**LOG-FEAT-06** ✅), rol instructor (**LOG-FEAT-07/08** ⬜), patrón de permisos «solo participantes autorizados» (alineado con [spec candidata FEAT-102](./analysis-user-instructor-exercises-candidate-spec.md) y MENT-FEAT-17: el rol instructor **no** implica lectura global de partidas privadas).

**Secuencia recomendada**

1. PGM-FEAT-10 + PGM-FEAT-01: lectura compartida del corpus `pgn_mentor`.
2. LOG-FEAT-08: estudios y partidas **del instructor** hacia sus grupos (copia en biblioteca del alumno).
3. FEAT-102: asignaciones que referencian `game_id` PGM + seguimiento de intentos (`pgm_attempts` por `user_id`).

**Fuera del MVP PGM documentado aquí:** restringir el corpus Mentor solo a ciertos grupos (requeriría grants por grupo sobre el catálogo, no contemplado en la opción A).

### Fases

| Fase | Entrega | Detalle |
|------|---------|---------|
| **0 — Piloto** | **Fischer** o **Tal**, **20** partidas del roster | Validar ingest, comentarios, listado PGM |
| **1 — Pipeline** | Script/job `import_pgn_mentor_bulk` | Reutilizar `parse_games_from_pgn_text` + `create_games_from_ingest` / `upsert_master_game`; leer ZIP en streaming; commits cada **500–2000** partidas; archivo checkpoint por ZIP |
| **2 — Dedupe** | Idempotente | `content_game_id` (SHA del PGN) ya evita duplicados; re-ejecutar un ZIP debe ser no-op |
| **3 — Carga MVP** | **Roster curado** → **~2,6k** filas | Solo slugs en `pgm-mentor-curated-roster.json`; máx. 100/jugador. Minutos en Neon, no horas. Fase posterior: ampliar roster sin tocar los ~500k completos |
| **4 — Índice GM** | PGM-FEAT-01 | Vista o query: `SELECT player_slug, COUNT(*) … GROUP BY` desde `import_provenance` + nombres PGN |
| **5 — Prod** | Solo lectura compartida | Usuarios autenticados leen catálogo PGM; intentos (`pgm_attempts`) siguen por `user_id` |

### Reglas de ingest (alineadas al producto)

- **Conservar comentarios y variantes** en PGN (`StringExporter(..., comments=True)` ya en ingest) → PGM-FEAT-04.
- **Sin POV de alumno** en import: `player_username` / `player_color` en `coach_games` pueden quedar `NULL` en biblioteca compartida; PGM elige color al iniciar sesión.
- **FEAT-033:** omitir partidas ≤10 plies salvo posición FEN/estudio (poco habitual en Mentor).
- **Tamaño Neon (roster):** orden de **decenas de MB** PGN; carga completa ~500k queda fuera del MVP.

### Script de migración (PGM-FEAT-10)

Desde la raíz del repo (`.env` con `DATABASE_URL`):

```bash
# Contar selección sin escribir en BD
python src/scripts/import_pgm_mentor_curated.py --dry-run

# Importar los 26 del enum PgnMentorPlayerSlug (máx. 100 c/u, prioriza comentarios)
python src/scripts/import_pgm_mentor_curated.py --owner-user-id <admin_user_id>

# Subconjunto / piloto
python src/scripts/import_pgm_mentor_curated.py --players Fischer,Tal --max-games 20 --owner-user-id 1
```

Variables: `PGM_MENTOR_DATA_DIR` (default `data/games/fide_processed`), `PGM_LIBRARY_OWNER_USER_ID`, `PGM_MENTOR_CORPUS_TYPE` (default `elite`).  
Código: `src/modules/pgm/mentor_roster.py` (`PgnMentorPlayerSlug`), `mentor_import.py`, `src/scripts/import_pgm_mentor_curated.py`.

### Orden de implementación sugerido

1. `PGM-FEAT-09` + cuenta/library owner documentada en `.env` (`PGM_LIBRARY_OWNER_USER_ID`).
2. Ejecutar script piloto (`--dry-run` luego import con un GM).
3. `PGM-FEAT-01` API listando solo proveniencia `pgn_mentor`.
4. Job nocturno fase 3 con monitor de progreso (partidas/seg, errores por archivo).
5. UI PGM (FEAT-02…08).

### Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Nombres PGN inconsistentes («Carlsen, Magnus» vs «Magnus Carlsen») | Normalizar en índice GM; slug desde ZIP como clave canónica |
| Mezclar elite Lichess con Mentor | Filtrar `import_provenance.provider` |
| Tiempo de carga | Piloto + lotes; no bloquear PR de UI |

**Ítem tracker propuesto:** `PGM-FEAT-10` — importación masiva PGN Mentor → Postgres (biblioteca compartida).

## Fuera de alcance (MVP)

- Crear partidas nuevas contra el motor «haciendo de GM».
- Cambiar la línea del rival si el usuario erra (queda en la jugada correcta del PGN y sigue).
- Importar binarios de Lucas Chess (solo PGN ya en repo/disco).

## Rama sugerida (primer ítem)

`feature/11_pgm_01_elite_gm_catalog` — PGM-FEAT-01 + PGM-FEAT-09 (listado + ruta vacía).

## Criterios de aceptación globales (MVP)

1. Al menos un GM con ≥1 partida Elite visible aparece en la lista sin configuración manual.
2. Completar un intento de principio a fin con validación SAN y rival automático.
3. Puntaje y segundo intento persisten tras recargar sesión.
4. Gráfico con ≥2 intentos en la misma partida.