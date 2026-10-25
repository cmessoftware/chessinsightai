# ChessInsight — Sparring, ejercicios, instructor y progreso (Maia + Stockfish)

**Documento unificado** · Fecha: 2026-10-18  
Reemplaza las fuentes Sparring (copias en [roadmap/deep_analysis/sources/](./roadmap/deep_analysis/sources/)) y los borradores 03/04 no restaurados.

| ID | Edición | Contenido |
|---|---|---|
| **CI-SPAR-01** | BASE | Sparring con Maia; validación posterior con Stockfish |
| **CI-STRAT-02** | BASE | Análisis estratégico y generación de ejercicios (táctico + posicional) |
| **CI-INST-03** | PRO | Instructor: autoría, asignación, revisión |
| **CI-PROGRESS-04** | PRO | Métricas longitudinales de progreso |

Relacionado (fuera de este documento): evaluación estratégica humana por planes/HITL → `spec_planes_hitl.md`; análisis profundo servidor → `spec_analisis_profundo_unificado.md`; **arquitectura técnica** (motores compartidos, sparring) → [roadmap/deep_analysis/index.md](./roadmap/deep_analysis/index.md).

---

## 1. Instrucciones para Cursor (comunes)

Inspeccionar repositorio, autenticación, tablero, PGN, planes, revisión manual, jobs de análisis, roles y suscripciones **antes** de codificar. Reutilizar servicios existentes; no duplicar colas, tablas de alumnos ni motores de corrección. Entidades y rutas son **contratos conceptuales** — adaptar nombres y documentar mapeo. Implementación incremental, migraciones compatibles, pruebas de criterios de aceptación. **Sin LLM** en MVP. No implementar un módulo completo como dependencia obligatoria de otro.

Contexto esperado (verificar): FastAPI, SQLAlchemy/PostgreSQL, interfaz ajedrez, Stockfish servidor. Maia vía adaptador UCI (Maia-3 candidato; Maia-2 alternativo).

---

## 2. Principios compartidos

### 2.1 Motores y evaluación

- **Stockfish:** evidencia objetiva aproximada; presupuesto, versión y configuración explícitos; reutilizar un contrato común `EngineAnalysis` (ver §3.2).
- **Maia (`HumanMoveModel`):** plausibilidad humana y sparring; **nunca** árbitro estratégico ni mezcla de scores con Stockfish.
- Puntuaciones tipadas: `cp`, `mate`, `wdl`; perspectiva estable; **no** convertir mate a cp arbitrario.
- Comparar jugadas con evaluaciones homogéneas desde la **misma raíz**; `searchmoves` cuando corresponda; registrar presupuestos distintos.
- `loss_cp = max(0, V(s,best) - V(s,m))` desde perspectiva del bando que mueve en `s`; resultado negativo por ruido → revisar estabilidad, no “mejora imposible”.
- Posiciones inestables → `analysis_uncertain`. Umbrales de error configurables ≠ comprensión estratégica automática.
- No usar Stockfish para reparar jugadas de Maia en sparring (modo híbrido = otro producto explícito).

### 2.2 Niveles y ratings

Separar siempre: rating **declarado** (plataforma, ritmo, fecha); nivel **solicitado** al modelo; configuración **efectiva**; fuerza **observada** (experimental). No igualar automáticamente parámetro Elo del modelo con Elo de plataforma. Fuera de rango: informar límite efectivo.

Presets iniciales (ajustables, no calibrados): consolidación −100, equilibrado 0, desafío +100/+200 respecto de nivel interno provisional.

En turno del bot: `self_rating` = bot, `opponent_rating` = humano; invertir en consultas de posición del alumno según quién mueve.

### 2.3 Posición e historial

Conservar `initial_fen` + movimientos UCI; `history_complete` cuando falte historial (repeticiones, Lc0/Maia). Hash de caché incluye contexto, no solo FEN.

### 2.4 Eventos e idempotencia

Eventos versionados: `event_id`, `schema_version`, `source_id`, timestamps UTC. Outbox o patrón equivalente existente. Backend idempotente ante reintentos (`request_id`, `expected_ply`, etc.).

Eventos relevantes entre módulos: `sparring.session_*`, `analysis.completed`, `exercise.published`, `assignment.*`, `attempt.submitted`, `assessment.finalized` / `superseded`.

### 2.5 Permisos

Solo propietario y usuarios autorizados. Instructor requiere **vínculo activo** + entitlement; PRO ≠ acceso global a alumnos. DTO alumno excluye soluciones, criterios ocultos y notas privadas.

### 2.6 Planes y revisión humana

Reutilizar `PlanVersion` / módulo de planes (`spec_planes_hitl.md`) cuando exista; snapshot mínimo si no. Rúbrica estratégica 0–3 + `null` (no evaluado). Texto libre y planes **no** se califican por palabras clave ni cp. Sin revisión humana → `pending_human_review` explícito.

---

## 3. Contratos técnicos compartidos

### 3.1 HumanMoveModel (Maia)

```text
capabilities() -> model/version, rating_range, history_support,
                  full_policy_support, sampling_support
predict(position_context, self_rating, opponent_rating) -> prediction
choose_move(prediction, sampling_config) -> legal_move
```

Validar legalidad; muestreo fijo y versionado; guardar semilla si aplica. Reconstrucción de partida por jugadas guardadas; reproducibilidad numérica puede depender del hardware. Timeout/modelo caído: pausar, no inventar jugada ni consumir tiempo del alumno por fallo de infra.

Masa de política aceptable (solo si hay distribución completa):

```text
acceptable_policy_mass(s,r) = sum(P_maia(m | s,r), m in A)
```

Con top-k parcial: guardar cobertura; **no** normalizar como probabilidad completa del alumno.

Referencias: [Maia-3](https://github.com/CSSLab/maia3), [Maia-2](https://github.com/CSSLab/maia2) — verificar versión instalada.

### 3.2 EngineAnalysis (Stockfish)

Campos mínimos: `id`, `position_context_hash`, `provider`, `version`, `config`, `score_type`, `perspective`, `candidates`, `stability`, `status` (`pending` / `running` / `completed` / `uncertain` / `failed`).

---

## 4. CI-SPAR-01 — Sparring (BASE)

### 4.1 Objetivo

Partidas completas o continuación desde posición contra Maia (nivel configurable). Stockfish analiza **después** del juego; no altera jugadas del sparring. Modos: partida normal, conversión, resistencia, ejecución de plan (plan versionado opcional). Independiente del generador de ejercicios; puede recibir posiciones de ejercicios y exportar sesiones como fuente de análisis.

Excluye: entrenar modelos, adaptación de nivel en vivo, corrección automática de planes, equivalencia Elo entre plataformas.

### 4.2 Flujo

1. Origen: inicio, PGN/FEN, ejercicio.  
2. Color, nivel, modo, ritmo, plan opcional → snapshot de config.  
3. Jugar sin motor/probabilidades/soluciones; ayudas explícitas registradas.  
4. Jugadas + tiempo transaccionales.  
5. Al terminar/cerrar → análisis Stockfish **asíncrono**.  
6. Revisión: decisiones relevantes, evidencia, enlace a análisis. Horizonte de práctica agotado ≠ resultado de partida.

Reglas: mate, ahogado, tablas, abandono, reloj vía librería de reglas; verificar insuficiencia de material según tiempo.

### 4.3 Datos y API

| Entidad | Campos mínimos |
|---|---|
| SparringSession | id, owner_id, initial_fen, prior_moves, history_complete, human_color, mode, time_control, model_config_snapshot, plan_version_id?, exercise_version_id?, status, result, termination_reason, timestamps |
| SparringMove | session_id, ply, uci, actor, resulting_fen, elapsed_ms, clock_state, request_id, prediction_ref?, created_at |
| ModelPrediction | model/version, rating inputs, policy?, policy_coverage?, sampling, chosen_move, latency |

Único `(session_id, ply)`; request idempotente.

```text
POST /sparring/sessions
GET  /sparring/sessions/{id}
POST /sparring/sessions/{id}/moves       # expected_ply + request_id
POST /sparring/sessions/{id}/finish
POST /sparring/sessions/{id}/analysis
GET  /sparring/sessions/{id}/analysis
```

Estados sesión: `created → active → finished`; `active ↔ paused`; cancelación desde estados no terminales. Conversión/resistencia: analizar alumno y errores del rival por separado.

Eventos: `sparring.session_started`, `sparring.move_committed`, `sparring.session_finished`, `analysis.completed`.

### 4.4 UI

Configuración, tablero, revisión posterior. Nivel solicitado/efectivo; no prometer Elo certificado.

### 4.5 Aceptación (SPAR)

1. Inicio y FEN/PGN, ambos colores, jugadas legales.  
2. Reanudar tablero y reloj exactos.  
3. Duplicado/tardío no añade jugada.  
4. Fallo Maia pausa sin sustituto Stockfish.  
5. Perspectiva y mate/cp correctos.  
6. Config rival estable en sesión.  
7. Finales/repeticiones con historial; marcar incompleto.  
8. Sin fuga de análisis durante juego.  
9. Acceso ajeno denegado.  
10. Proveedor simulado + smoke checkpoint real; medir latencia/memoria.

### 4.6 Entrega

Adaptador Maia → sesiones → tablero/fallos → análisis posterior → eventos. Documentar config, pesos, licencias; no descargar pesos por turno; GPU opcional medida.

---

## 5. CI-STRAT-02 — Análisis y ejercicios (BASE)

### 5.1 Objetivo

Posiciones (partidas, colecciones, sparring) → análisis documentado y ejercicios. Tres evidencias: Stockfish, Maia, experto. Unidad: **posición + consigna + criterio de evaluación**. Varios ejercicios por posición. Funciona sin instructor; interpretación no revisada explícita.

### 5.2 Familias y modalidades

| Familia | Objetivos |
|---|---|
| Táctica | Mate, material, ventaja decisiva, defensa, evitar amenaza |
| Evaluación/planes | Diagnóstico, iniciativa, profilaxis, actividad, debilidades, conversión, resistencia, contrajuego, revisión de plan |

Final = fase/contexto. Dimensiones: contenido; presentación (tema visible/oculto); respuesta (jugada, variante, eval, candidatas, combo, texto); plan versionado opcional; ayudas escalonadas; dificultad declarada vs observada separadas.

### 5.3 Flujo generación

1. Importar posición (fuente, permisos, historial).  
2. Diagnóstico/plan alumno antes de motor (modalidad sin ayudas).  
3. Stockfish; candidatas comparadas explícitamente.  
4. Maia en nivel de referencia (+ cercanos si hay proveedor).  
5. Propuesta determinista: objetivo, candidatas, variantes, etiquetas, evidencia.  
6. Táctico auto-validado; posicional → borrador / `pending_human_review`.  
7. Publicar solo si cumple política de validación.  
8. Intento + evaluaciones automáticas/humanas separadas.  
9. Continuar en sparring (actividad distinta, registrada).

Sin Maia: señales humanas no disponibles, no inventadas. Stockfish caído: no publicar soluciones nuevas.

### 5.4 Candidatas y corrección táctica

MultiPV ≠ prueba de que solo existen N soluciones. Tres candidatas posicionales: cada una verificada; si solo hay dos, cambiar formato o descartar. Correcta depende de **consigna** (elegir 2.ª del motor entre tres buenas no es error). Jugada sólida + explicación errónea → resultados separados.

Filtrar posicionales dominados por mate/material forzado en horizonte analizado (con límites declarados).

Corrección táctica: árbol/grafo de respuestas; transposiciones por estado; alternativa legal fuera del árbol → verificación motor → `needs_review` si ambiguo. Publicación auto exige objetivo verificable, solución estable, defensas relevantes.

### 5.5 Datos y API

| Entidad | Campos mínimos |
|---|---|
| PositionContext | source, initial_fen, moves, history_complete, scope |
| AnalysisCase | position_id, plan_version_id?, student_diagnosis?, engine_evidence_ids, status |
| ExerciseVersion | exercise_id/version, family, objective, visibility, response_schema, accepted_moves/tree, rubric_version, difficulty_source, validation_status, origin |
| CandidateEvidence | move, engine_analysis_id, maia_prediction_id?, policy_mass?, plan_relationship?, reviewer_id? |
| Attempt | student_id, exercise_version_id, responses, hints, timestamps |
| Assessment | attempt_id, kind automatic/human, dimension, value?, evidence, supersedes_id? |

**ExerciseVersion** y **Attempt**: implementación única compartida con CI-INST-03.

```text
POST /analysis-cases
POST /analysis-cases/{id}/run
POST /exercise-generation/jobs
GET  /exercise-generation/jobs/{id}
GET  /exercises/{id}/versions/{version}
POST /exercise-attempts
POST /exercise-attempts/{id}/submit
```

Generación: `queued/running/completed/partial/failed/cancelled`. Validación: `draft/auto_validated/pending_human_review/human_validated/rejected/retired`.

### 5.6 Aceptación (STRAT)

1. Misma posición → táctico y posicional independientes.  
2. Tema oculto no en payload alumno.  
3. Alternativa táctica válida tras verificación; motor caído no falla alumno.  
4. Tres buenas jugadas: ranking no penaliza.  
5. Texto/plan pendientes hasta humano.  
6. Sin Maia no bloquea Stockfish; cobertura parcial honesta.  
7. Mate/cp y perspectiva.  
8. Nueva versión no altera corrección histórica.  
9. Ambiguos no publicados como ciertos.  
10. Eventos idempotentes para métricas (sin PRO para datos propios).

### 5.7 Entrega

Análisis/contratos → generador táctico → propuestas posicionales + Maia opcional.


### 5.8 CI-STRAT-PLAY-05 — Ejercicios estratégicos con continuación (DRAFT)

**Estado:** borrador de producto · 2026-10-25 · **Entrega posterior a la implementación del sparring CI-SPAR-01**. Extensión de CI-STRAT-02, no sustitución del generador táctico. Público inicial orientativo: jugadores de aproximadamente 1600+ Lichess, registrando plataforma y ritmo; no equivalencia con FIDE ni requisito rígido. Este apartado no autoriza implementar todo el módulo junto al sparring.

#### 5.8.1 Problema y objetivo

Una posición puede admitir varias continuaciones sólidas con evaluaciones cercanas. Acertar la primera del motor o reproducir la jugada de una partida no prueba que el alumno comprenda un plan. Entrenar una secuencia de decisiones: **contexto → diagnóstico/objetivo → candidatas → ejecución contra Maia → adaptación → revisión**.

Distinguir contexto de la posición (estructura, actividad, recursos) del contexto del jugador (intención previa y expectativas). El historial permite reconstruir el primero y la evolución de la partida, pero no demuestra por sí solo qué pensaba su autor. Intenciones desconocidas permanecen desconocidas.

No afirmar que posiciones aisladas, sintéticas o ejercicios tácticos carecen de utilidad. Esta modalidad aporta práctica de continuidad estratégica y transferencia, sin intentar duplicar una biblioteca masiva de tácticas. Antecedentes funcionales: cursos estratégicos con continuación contra computadora (Chess King), cursos de planes (ChessBase) y partidas recorridas por decisiones (ChessTempo). No se afirma novedad exclusiva ni evaluación semántica automática resuelta.

#### 5.8.2 Modalidades y consignas

| Modalidad | Consigna | Dimensiones de revisión |
|---|---|---|
| Ejecución de plan dado | El autor proporciona objetivo y restricciones; el alumno prepara y ejecuta | Coherencia de acciones, recursos rivales y adaptación; no atribuirle la elección inicial del objetivo |
| Elección de plan | Diagnosticar y proponer objetivo antes de jugar | Diagnóstico, prioridades y justificación, además de ejecución |
| Comparación de planes | Proponer dos caminos viables y justificar una elección | Concesiones, riesgos, posiciones resultantes y adecuación práctica |
| Generación de candidatas | Aplicar un método indicado o elegido, comparar y descartar | Pertinencia, variedad útil, cálculo y razones de selección |
| Revisión de plan | Tras una respuesta rival, mantener, modificar o abandonar la idea | Reconocimiento del cambio y justificación de la adaptación |

Familias: ataque, simplificación, resistencia, profilaxis, mejora de piezas y conversión. Ejemplos: preparar líneas y piezas para atacar; elegir qué cambiar y qué conservar para un final favorable; buscar defensa activa en inferioridad; limitar un plan rival; mejorar una pieza sin conceder contrajuego. Condiciones y objetivos específicos por ejercicio, no reglas universales.

Métodos de candidatas: acciones dirigidas al objetivo, mejora de la peor pieza, prevención del plan rival y exploración de jugadas forzantes. Registrar método declarado por candidata; no inferirlo por su notación. No exigir un número fijo si la posición no lo justifica. Solidez táctica y pertinencia al plan se evalúan por separado.

#### 5.8.3 Contexto y autoría inicial

Primera entrega con **selección y curación manual**; el sistema ayuda a conservar, ejecutar y revisar la actividad. Un autor define:
- Fuente autorizada (partida propia, colección o sparring), posición raíz, bando y tramo previo visible.
- Historial UCI/PGN desde FEN inicial y `history_complete`; marcar límites si falta historia.
- Consigna, modalidad, objetivos/intermedios, restricciones, rúbrica y criterios de cierre.
- Contexto público y comentarios privados/soluciones separados. Ocultar continuación histórica y análisis antes de la exposición permitida.
- Horizonte breve configurable en jugadas propias (propuesta inicial 5–10, no umbral pedagógico validado), ritmo y configuración Maia.

Permitir reproducir el tramo anterior y volver a la raíz sin ver el futuro. La continuación original es material de contraste posterior, nunca respuesta obligatoria. Desde una posición fija pueden existir varios planes aceptables. Seleccionar inicialmente casos sin remate táctico dominante en el horizonte analizado, con comprobación de motor y revisión humana; esto no garantiza ausencia absoluta de táctica.

Reutilizar `PlanRevision` de la spec de planes/HITL; mapear la referencia conceptual `PlanVersion` de este documento, sin crear otro sistema de planes. Si falta ese módulo, guardar un snapshot mínimo compatible según §2.6.

#### 5.8.4 Flujo de práctica

1. Presentar contexto, consigna y ayudas disponibles; registrar exposición previa al ejercicio.
2. Alumno registra objetivo (si no viene dado), candidatas, método y una justificación breve, antes del motor. Campos mínimos, sin obligar a redactar un ensayo por turno.
3. Crear una sesión de sparring vinculada al intento y a la versión inmutable del ejercicio.
4. Jugar contra Maia sin imponer la continuación histórica ni reemplazar sus respuestas con Stockfish. Configuración del rival estable y registrada.
5. En checkpoints definidos por el autor (o solicitados por el alumno), registrar qué esperaba del rival y si mantiene/modifica/abandona el plan; crear revisión, no sobrescribir la intención inicial. Recordar una intención después de ver la respuesta se etiqueta como retrospectivo.
6. Cerrar por horizonte, fin real de partida o interrupción. Fin de actividad por horizonte no equivale a victoria ni éxito estratégico; si sigue jugando, conservar el punto de cierre para la evaluación.
7. Analizar decisiones y respuestas rivales; mostrar evidencia y solicitar autoevaluación. Revisión humana valora plan y adaptación, con estado pendiente si no se realiza.
8. Permitir reintento como actividad vinculada con nueva exposición, no como primer intento autónomo.

Política de reloj/checkpoints elegida antes de empezar y registrada; separar reflexión, pausa pedagógica y espera técnica. Tutor y antiimpulsividad, si están disponibles, siguen siendo independientes y opcionales; guardar su configuración y cada ayuda. No son dependencia de esta modalidad y no mezclar intentos asistidos con autónomos. Sus especificaciones se desarrollan por separado en PR #199.

#### 5.8.5 Evaluación: evidencia automática y criterio humano

| Aspecto | Responsable y límite |
|---|---|
| Legalidad, historial, tiempos y ayudas | Sistema |
| Errores tácticos, candidatas y estabilidad de evaluación | Stockfish; presupuesto/perspectiva explícitos |
| Segunda opinión de variantes | Lc0 opcional; no mezclar scores ni atribuirle comprensión del plan |
| Plausibilidad de respuestas y rival de práctica | Maia; no árbitro de corrección |
| Adecuación del plan, concesiones, adaptación y calidad de justificación | Revisión humana con rúbrica contextual |

Rúbrica humana reutilizable 0–3 + null: diagnóstico, elección del objetivo, candidatas, recursos rivales, ejecución, adaptación y justificación; activar solo dimensiones pertinentes. Anclas: 0 incorrecto/ausente cuando era exigido; 1 parcial; 2 adecuado; 3 sólido según criterios del ejercicio. No evaluado = null; no mezclar con cero. Sin nota estratégica global automática.

Aceptar varias candidatas sólidas; no marcar error solo por ranking o por no coincidir con el profesor. Una alternativa nueva puede requerir análisis/revisión, no rechazo inmediato. El autor no necesita enumerar todas las continuaciones posibles.

Cambiar de plan justificadamente puede ser éxito. Una refutación de una ejecución no refuta automáticamente el objetivo completo. Ganar contra un error de Maia no valida el plan; perder una posición inferior no demuestra mala resistencia. Separar resultado, mérito del alumno, regalos del rival y dificultad observada.

Presentación: plan original → decisiones ancladas al tablero → respuesta rival → revisiones → evidencia automática → dictamen humano. Evaluación de texto libre pendiente, sin LLM calificador, coincidencia por palabras clave ni equivalencia entre cp y comprensión.

#### 5.8.6 Contratos conceptuales y trazabilidad

Extender las entidades de §5.5; no crear un generador ni registro de alumnos paralelo:
- `ExerciseVersion`: modalidad `strategic_playout`, contexto visible, referencia raíz/historial, plan dado opcional, métodos de candidatas, rúbrica, horizonte, checkpoints, política de reloj y política de ayudas.
- `Attempt`: diagnóstico previo, candidatas/razones/métodos, revisión inicial del plan, sparring_session_id, exposición/ayudas y motivo/punto de cierre.
- `DecisionCheckpoint`: attempt_id, session_id, ply/context_hash, expected_response?, plan_revision_before/after, decisión mantener/modificar/abandonar, razón, timestamps y marca de registro previo/retrospectivo.
- `Assessment`: automático/humano, dimensión, rúbrica, evidencia, autor y estado; revisiones auditables según §§5–7.

Reutilizar API de ejercicios, intentos y sesiones. Inicio de continuación idempotente: un reintento de la misma solicitud no crea otra sesión; nuevo reintento pedagógico crea nuevo Attempt enlazado. Validar que sesión, ejercicio, plan y posición correspondan al mismo intento/contexto. DTO alumno excluye respuestas futuras, rúbricas privadas y notas del autor. Permisos y vínculo instructor-alumno según §2.5 y §6.

Práctica y registro propios BASE; autoría/asignación/revisión docente gestionada conserva política PRO de §6. Permitir notas propias identificadas como autoevaluación; no presentarlas como revisión experta. La ausencia de Instructor PRO no bloquea jugar un ejercicio disponible, pero tampoco fabrica un dictamen.

#### 5.8.7 Generación y aprendizaje progresivos

Sparring aporta dos roles: fuente de casos contextualizados (historial, decisiones, tiempos y planes registrados) y entorno de continuación. Tras validar la primera entrega manual, un selector determinista puede proponer momentos de cambio de plan o errores recurrentes **para curación**; señales de motor no generan automáticamente una interpretación estratégica cierta.

Métricas iniciales: intentos completados/interrumpidos, ayudas, errores tácticos y evaluaciones humanas por dimensión con cobertura. Ganancias de cp, acierto de primera jugada y resultado de partida no sustituyen comprensión. Panel longitudinal PRO, si existe, añade retención/transferencia.

Comparar progresivamente práctica desde la misma raíz, otras posiciones de la estructura y partidas completas. Marcar familiaridad/exposición; éxito repetido en una posición no prueba generalización. Sin obligación de A/B formal para probar utilidad en casos concretos.

#### 5.8.8 Aceptación, dependencias y roadmap

Precondiciones: sparring implementado con inicio por FEN/PGN, historial, persistencia/reanudación, cierre y análisis posterior; contratos de ejercicios/intentos y referencia compatible de planes. Lc0, tutor, antiimpulsividad, generación automática y panel PRO no son precondiciones.

| Entrega | Alcance | Estado |
|---|---|---|
| STRAT-PLAY-01 | Curación manual, contexto y consignas; acordar rúbrica/ejemplos con experto | Draft post-sparring |
| STRAT-PLAY-02 | Intento previo, candidatas y continuación Maia vinculada | Draft |
| STRAT-PLAY-03 | Checkpoints y revisiones del plan, cierre y revisión con evidencia | Draft |
| STRAT-PLAY-04 | Validación pedagógica en casos concretos; selector de casos y transferencia posteriores | Futuro condicionado |

Criterios antes de considerar implementada la primera modalidad:
1. Dos jugadas sólidas con planes distintos no se penalizan por ranking ni por diferir de la partida fuente.
2. Contexto previo visible y continuación original oculta hasta revisión; historia incompleta explícita.
3. Plan dado y elegido activan dimensiones diferentes; método/candidatas originales se conservan.
4. Continuación Maia legal y reconstruible; reintento de API no duplica sesiones.
5. Adaptación justificada es admisible; una revisión no borra el plan inicial.
6. Horizonte agotado no produce victoria; error del rival no acredita comprensión.
7. Texto/plan sin revisión permanece pendiente; fallo de motor no falla al alumno.
8. Exposiciones, tutor/pausas y anotaciones retrospectivas quedan identificadas.
9. Notas privadas y datos ajenos no se filtran; revisiones quedan ligadas al contexto correcto.
10. Reintentos pedagógicos se distinguen de primera exposición.

**Fuera de alcance inicial:** interpretación automática completa de planes, puntuación estratégica por motor, generación masiva sin curación, equivalencia Elo y promesas de mejora. El software modela primero una actividad observable y revisable; su utilidad debe comprobarse con alumnos y un instructor.


---

## 6. CI-INST-03 — Instructor (PRO)

### 6.1 Alcance

Entitlements: `instructor_authoring`, `instructor_assignments` (backend). Supuesto inicial: instructor PRO; alumno con asignación puede responder sin PRO individual — aislar política comercial del modelo de datos.

Incluye: autoría, import PGN/FEN, curación automática, personalización, rúbricas, asignaciones, revisión. Excluye: marketplace, pagos, videollamadas, calificación auto de texto, entrenamiento de modelos.

### 6.2 Roles

| Contexto | Permisos |
|---|---|
| Alumno | Asignaciones propias; devoluciones publicadas |
| Instructor PRO + vínculo | Crear, asignar, revisar en ámbito |
| Sin vínculo | Sin acceso a datos del alumno |
| Admin técnico | Según política existente |

Vínculo: consentimiento, alcance, revocación, auditoría, retención histórica.

### 6.3 Creación y asignación

Fuentes: FEN, PGN/ply, sparring, generador. Editor → validación Stockfish → vista alumno → versión inmutable publicada. Borrador incompleto OK; publicar exige consistencia. Curación preserva origen automático.

Asignación fija **versión**; lista de destinatarios congelada al asignar. Intentos inmutables tras entrega; reformulación → nuevo intento vinculado. Estados: `assigned/in_progress/submitted/awaiting_review/revision_requested/completed/cancelled`.

Respuestas adaptadas: combos, texto (revisión humana), jugada/variante, eval, plan — catálogo de razones reutilizable; `recognition_score` ≠ comprensión estratégica global. Variante derivada: `parent_version_id`.

### 6.4 Revisión

Bandeja filtrable; evidencia motor identificada. Dimensiones 0–3 + null; jugada vs razonamiento separados. Acciones: devolver, aprobar, reformular, nueva versión, marcar ambiguo. `supersedes_id` con auditoría; desacuerdo entre instructores admisible.

### 6.5 Datos y API

| Entidad | Campos |
|---|---|
| InstructorStudentAccess | instructor_id, student_id, scope, status, consent_at, revoked_at |
| ResponseSchema / RubricVersion | fields, dimensions, anchors |
| Assignment | instructor_id, student_id, exercise_version_id, conditions_snapshot, status |
| InstructorReview | reviewer_id, attempt_id, rubric_version_id, feedback, supersedes_id? |

```text
POST /instructor/exercises
POST /instructor/exercises/import
PATCH /instructor/exercises/{id}/draft
POST /instructor/exercises/{id}/publish
POST /instructor/assignments
GET  /instructor/review-queue
POST /instructor/attempts/{id}/reviews
GET  /students/me/assignments
```

Eventos: `exercise.published`, `assignment.created`, `attempt.submitted`, `assessment.finalized`, `assessment.superseded`.

### 6.6 Aceptación (INST)

1. Crear desde PGN/FEN, preview, publicar.  
2. Curar automático con procedencia.  
3. Combo+texto+variante por política.  
4. Combo correcto no corrige texto estratégico.  
5. Asignación fija versión.  
6. Sin vínculo/entitlement → denegado.  
7. Entrega duplicada / conflicto concurrente.  
8. Historial revisión/reformulación.  
9. Datos ocultos no filtran.  
10. Rectificación evaluación → métricas sin duplicar intento.

### 6.7 Entrega

Permisos → editor/import → publicación → asignaciones → revisión → eventos.

---

## 7. CI-PROGRESS-04 — Progreso (PRO)

### 7.1 Objetivo

Medir resultado, autonomía, comprensión, retención, transferencia. Unidad: alumno × tema × dificultad × modalidad × período. **No** inferir estrategia desde cp, Elo, keywords ni probabilidad Maia. Entitlement: `student_progress_analytics`. Almacenamiento base de intentos/eventos desde BASE; panel longitudinal PRO.

### 7.2 Definiciones

- **Intento:** entrega inmutable; reintentos vinculados.  
- **Primera exposición:** sin actividad previa registrada en posición/familia de equivalencia (no garantiza ausencia externa).  
- **Ayuda:** pista, objetivo revelado, motor, feedback previo — tipo y momento.  
- **Evaluación efectiva:** revisión publicada vigente (`supersedes`); pending = null.  
- **Tiempo activo:** intervalos instrumentados; incompleto ≠ cero.

### 7.3 Métricas tácticas (automáticas)

| Métrica | Idea |
|---|---|
| Acierto autónomo inicial | Primeras correctas sin ayuda / primeras evaluadas en posiciones nuevas |
| Acierto sin ayudas (condicionado) | Correctas sin ayuda / evaluadas sin ayuda |
| Dependencia de ayudas | Con ayuda / con registro completo |
| Secuencia completa | Secuencia exigida correcta / evaluadas que exigían secuencia |
| Retención / transferencia | Por intervalo (p. ej. 7 días, ventana 5–10) y posiciones nuevas comparables |

Etiquetar métricas; pendientes aparte; abandonos aparte. Primera jugada ≠ secuencia completa. Solución revelada antes → no autónomo. Usar resultado del validador, no solo coincidencia textual.

### 7.4 Métricas estratégicas (humanas)

Rúbrica versionada: distribución, mediana, n evaluado, n pendiente; **no** nota global sumando dimensiones. Combo = reconocimiento; texto = formulación (categoría aparte). Solo rúbricas/condiciones comparables.

### 7.5 Partidas y sparring

Oportunidades aprovechadas, recurrencia de errores (solo con denominador fiable), ejecución/adaptación de plan (valoración humana), conversión/resistencia separada de resultado y regalos del bot. Separar humano vs Maia, ritmo, nivel rival. CP auxiliar, no estrategia.

### 7.6 Temporal y UI

Períodos configurables (default 28 vs 28 días anteriores). Mostrar `numerador/denominador`, pendientes, cobertura. n&lt;10 → `evidencia insuficiente` (umbral versionado). Panel: seis bloques (acierto autónomo, ayudas, retención, transferencia, perfil estratégico, partidas). Sin rankings entre alumnos. Export con fórmulas y versiones.

### 7.7 Datos y API

`MetricDefinitionVersion`, `MetricObservation`, `MetricSnapshot`. Replay idempotente; revisión tardía recalcula período de actividad.

```text
GET /students/{id}/progress?from=&to=&filters=
GET /students/{id}/progress/{metric}/observations
POST /students/{id}/progress/exports
```

### 7.8 Aceptación (PROGRESS)

Casos 1–12 del documento original (6/10 autónomo, pendientes no alteran numerador, equivalencias, null estratégico, eventos duplicados, entitlement, zona horaria alumno, etc.).

### 7.9 Entrega

Diccionario métricas → normalización → agregaciones → permisos → panel → export. Sin puntaje global ni Elo estratégico sintético.

---

## 8. Roadmap integrado sugerido

| Fase | Módulo | Notas |
|---|---|---|
| 1 | CI-SPAR-01 adaptador + sesiones | Sin análisis pesado |
| 2 | CI-STRAT-02 contratos + generación táctica | EngineAnalysis compartido |
| 3 | CI-SPAR-01 análisis post-partida | Jobs async existentes |
| 4 | CI-STRAT-02 posicional + Maia señales | pending_human_review |
| Post-sparring (draft) | CI-STRAT-PLAY-05, §5.8 | Ejercicios estratégicos con continuación; STRAT-PLAY-01…04; primero curación y revisión humana |
| 5 | CI-INST-03 PRO | Puede adelantarse a métricas |
| 6 | CI-PROGRESS-04 PRO | Consume eventos de 2–5 |

Paralelo posible: INST antes de PROGRESS; STRAT base no requiere PRO.

---

## 9. Referencias

- [Maia-3](https://github.com/CSSLab/maia3)  
- [Maia-2](https://github.com/CSSLab/maia2)  
- Stockfish UCI: documentación de la versión instalada en despliegue.
