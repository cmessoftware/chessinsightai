# ChessInsight — Sparring, ejercicios, instructor y progreso (Maia + Stockfish)

**Documento unificado** · Fecha: 2026-10-18 · Actualizado: 2026-10-25  
Reemplaza las fuentes Sparring (copias en [roadmap/deep_analysis/sources/](./roadmap/deep_analysis/sources/)) y los borradores 03/04 no restaurados.

| ID | Edición | Contenido |
|---|---|---|
| **CI-SPAR-01** | BASE | Sparring con Maia; validación posterior con Stockfish; tutor opcional durante la partida (§4.7) |
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

### 3.2 EngineAnalysis (Stockfish / Lc0)

Campos mínimos: `id`, `position_context_hash`, `provider`, `version`, `config`, `score_type`, `perspective`, `candidates`, `stability`, `status` (`pending` / `running` / `completed` / `uncertain` / `failed`).

---

## 4. CI-SPAR-01 — Sparring (BASE)

### 4.1 Objetivo

Partidas completas o continuación desde posición contra Maia (nivel configurable). En modalidad sin tutor, Stockfish analiza **después** del juego. Con tutor opcional (§4.7), el proveedor seleccionado (Stockfish/Lc0) revisa propuestas del alumno durante la partida; nunca altera las jugadas de Maia. Modos: partida normal, conversión, resistencia, ejecución de plan (plan versionado opcional). Independiente del generador de ejercicios; puede recibir posiciones de ejercicios y exportar sesiones como fuente de análisis.

Excluye: entrenar modelos, adaptación de nivel en vivo, corrección automática de planes, equivalencia Elo entre plataformas.

### 4.2 Flujo

1. Origen: inicio, PGN/FEN, ejercicio.  
2. Color, nivel, modo, ritmo, plan opcional → snapshot de config.  
3. Sin tutor: jugar sin motor/probabilidades/soluciones. Con tutor: revisar propuestas antes de confirmarlas según §4.7; ayudas explícitas registradas.  
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

Configuración, tablero, revisión posterior. Nivel solicitado/efectivo; no prometer Elo certificado. Selector «Tutor» desactivado por defecto; configuración e interacción según §4.7.

### 4.5 Aceptación (SPAR)

1. Inicio y FEN/PGN, ambos colores, jugadas legales.  
2. Reanudar tablero y reloj exactos.  
3. Duplicado/tardío no añade jugada.  
4. Fallo Maia pausa sin sustituto Stockfish.  
5. Perspectiva y mate/cp correctos.  
6. Config rival estable en sesión.  
7. Finales/repeticiones con historial; marcar incompleto.  
8. Sin tutor: sin fuga de análisis durante juego. Con tutor: solo ayudas autorizadas por §4.7, registradas y sin revelar información adicional en los DTO.  
9. Acceso ajeno denegado.  
10. Proveedor simulado + smoke checkpoint real; medir latencia/memoria.

### 4.6 Entrega

Adaptador Maia → sesiones → tablero/fallos → análisis posterior → eventos. Documentar config, pesos, licencias; no descargar pesos por turno; GPU opcional medida.


### 4.7 Tutor opcional durante la partida (BASE, ampliación posterior al MVP core)

**Objetivo:** ofrecer asistencia durante el sparring: detectar una propuesta problemática del alumno, avisarle y permitirle reconsiderarla antes de que Maia responda. No requiere LLM ni el módulo Instructor PRO. Maia sigue siendo el rival; Stockfish o Lc0 es el tutor del alumno según la configuración (§4.7.6). Esta es una excepción explícita y acotada al análisis exclusivamente posterior de la modalidad sin tutor.

#### 4.7.1 Configuración

Configuración versionada, elegida al crear sesión y conservada en `tutor_config_snapshot`; no cambiarla silenciosamente durante la partida.

| Opción | Comportamiento |
|---|---|
| Tutor activado | Desactivado por defecto; independiente del modo normal/conversión/resistencia/plan |
| Proveedor | `stockfish` (default), `lc0` o `auto_context`; configuración y fallback explícitos según §4.7.6 |
| Umbral de aviso | `loss_cp_threshold`, entero positivo configurable; propuesta inicial 150 cp, ajustable y no calibrada por Elo |
| Eventos de mate | Política separada: avisar si la propuesta permite mate evitable o pierde un mate forzado detectado; no convertir mate a cp ni avisar solo por variar la distancia al mate |
| Ayuda máxima | Solo aviso; aviso + evidencia; aviso + evidencia + alternativa. Por defecto solo aviso |
| Reconsideraciones | `max_retries_per_turn`, entero ≥ 0; propuesta inicial 1. Agotado: confirmar o abandonar; nunca sustitución automática |
| Presupuesto motor | Perfil versionado con timeout y comprobación de estabilidad; reutiliza `EngineAnalysis` |
| Reloj | Pausa por análisis/diálogo del tutor; durante la elección inicial y reconsideración corre el reloj del alumno. Sesión etiquetada como entrenamiento asistido |

Los valores iniciales son decisiones de producto ajustables, no evidencia de fuerza de juego. No penalizar por no elegir la primera del motor si la pérdida queda por debajo del umbral. Un sacrificio no activa un aviso por material entregado: se compara la evaluación de las candidatas bajo §2.1. Evidencia inestable → «análisis no concluyente», sin declarar error.

#### 4.7.2 Flujo y ayudas

1. Alumno propone una jugada legal. Queda **pendiente**, sin incorporarse al historial oficial ni activar Maia.
2. El proveedor efectivo compara mejor candidata y propuesta desde la misma raíz, perspectiva y presupuesto, usando sus propias unidades y umbrales (§4.7.6). El backend conserva toda la evidencia; el cliente recibe solo lo autorizado.
3. Sin disparador estable: confirmar automáticamente la propuesta una vez satisfecho el control antiimpulsividad, si está habilitado (§4.8). Con disparador: aviso neutral («Esta jugada puede perder ventaja. Revisá tu decisión»), inicialmente sin mostrar mejor jugada, evaluación ni variante.
4. Acciones: **mantener jugada**, **reconsiderar** si quedan intentos, o **pedir ayuda** hasta el nivel configurado. Mantener siempre es válido aunque el motor discrepe.
5. Ayuda escalonada y a pedido: evidencia concreta mediante variante verificada y evaluación; luego alternativa del motor con continuación corta. Sin explicaciones estratégicas inventadas. Registrar cada nivel revelado.
6. Reconsiderar vuelve a la posición anterior a la propuesta; guardar propuesta original y nuevas propuestas, aun si el alumno repite la misma jugada. No es un retroceso de una jugada ya confirmada.
7. Confirmación única y transaccional: incorporar únicamente la jugada elegida, aplicar incremento una sola vez y activar el turno de Maia. El tutor nunca modifica su selección.
8. Al finalizar, análisis completo habitual y revisión que diferencia primera intención, correcciones y ayudas.

Sin análisis disponible (timeout/fallo/inestabilidad): informar estado y permitir confirmar sin validación o cancelar la propuesta y reconsiderar dentro del límite. No marcarla como buena, no bloquear indefinidamente ni descontar espera de infraestructura. Preservar estado pendiente y reloj al reconectar; una sesión terminada invalida propuestas y respuestas tardías. Si se agota el reloj antes de una propuesta válida, prevalece la terminación por tiempo.

#### 4.7.3 Datos y contrato

Extender `SparringSession` con `tutor_config_snapshot` y `assistance_used`. Tutor habilitado y ayuda efectivamente recibida son indicadores diferentes; el modo asistido se distingue siempre en comparaciones.

Añadir `TutorDecision`: id, session_id, expected_ply, position_context_hash, proposal_version, proposed_uci, attempt_index, analysis_ref, secondary_analysis_refs?, requested_provider, effective_provider, routing_reason, fallback_reason?, status, trigger_reason?, revealed_help_level, selected_action?, committed_move_ref?, request_id, timestamps y tiempos separados de reflexión/espera/diálogo. Preservar intentos inmutables; enlazar reemplazos, no sobrescribir la primera intención.

Contrato conceptual, adaptable al router existente:

```text
POST /sparring/sessions/{id}/move-proposals
GET  /sparring/sessions/{id}/move-proposals/{proposal_id}
POST /sparring/sessions/{id}/move-proposals/{proposal_id}/resolve
# resolve: keep | reconsider | request_help
# writes: expected_ply + proposal_version + request_id
```

Una propuesta activa por turno; comprobar propietario, estado, versión y legalidad en backend. Reintentos idempotentes; conflictos obsoletos rechazados. `/moves` no puede saltarse el flujo cuando el tutor está habilitado: debe delegar o rechazar la escritura directa. El caso sin aviso confirma por el mismo mecanismo transaccional que `keep`.

Eventos versionados: `sparring.tutor_warning_shown`, `sparring.tutor_help_revealed`, `sparring.tutor_decision_resolved`; reutilizar outbox. `sparring.move_committed` se emite una sola vez por jugada oficial.

#### 4.7.4 Revisión y métricas

Mostrar primera propuesta, jugada final, avisos recibidos, reconsideraciones y nivel de ayuda. Un aviso ya es ayuda aunque no revele solución. La corrección posterior no cuenta como acierto autónomo inicial. Separar sesiones con/sin tutor y, dentro de las asistidas, decisiones con/sin aviso. Conservar disponibilidad/cobertura del análisis: ausencia de aviso no prueba corrección si hubo fallo o incertidumbre. PGN principal contiene solo jugadas confirmadas; intentos y ayudas permanecen en el registro de sesión.

#### 4.7.5 Criterios de aceptación y entrega

1. Tutor apagado mantiene el flujo sin análisis en vivo ni filtración de soluciones.
2. Pérdida estable por encima del umbral y eventos de mate activan el aviso correcto para ambos colores; debajo del umbral no hay aviso por mero ranking.
3. Mantener confirma la propuesta original; reconsiderar conserva ambas intenciones y respeta el límite de intentos.
4. Ayudas se revelan solo a pedido y dentro del límite; payload inicial no incluye soluciones ocultas.
5. Maia responde solo después de confirmar; Stockfish nunca repara sus jugadas.
6. Timeout/incertidumbre no se interpreta como corrección ni consume tiempo por espera; reconexión restaura propuesta y reloj.
7. Doble clic, respuestas tardías, finalización concurrente y acceso ajeno no duplican jugadas/incrementos/eventos ni alteran la sesión.
8. Métricas distinguen primera intención, decisión asistida y jugada final; fallo del tutor queda identificado.
9. Presupuesto y estabilidad se prueban con posiciones tácticas, sacrificios y scores de mate; sin afirmar certeza fuera del horizonte analizado.

Entrega posterior al núcleo SPAR-01…12: contrato/configuración → evaluación de propuesta → diálogo y reloj → persistencia/eventos → revisión y pruebas. El plan de implementación distingue el MVP core sin tutor de las ampliaciones SPAR-16…20. No implica funcionalidad ya implementada.


#### 4.7.6 Selección de Stockfish o Lc0 como tutor

| Selección | Uso y alcance |
|---|---|
| `stockfish` | Tutor general con comparación de candidatas y avisos tácticos; predeterminado |
| `lc0` | Tutor elegido explícitamente para explorar decisiones posicionales/estratégicas; también compara jugadas y variantes, sin calificar automáticamente un plan |
| `auto_context` | Stockfish por defecto; Lc0 cuando la sesión/ejercicio está etiquetada explícitamente como estratégica o ejecución de plan. Una alerta táctica estable de un chequeo Stockfish, si está disponible, tiene prioridad. Sin etiqueta, usar Stockfish |

Enrutamiento determinista y versionado, sin inferir que una posición es estratégica solo porque no se detectó táctica. Seleccionar Lc0 no implica que sea superior en toda posición estratégica. Sus variantes son evidencia de motor, no una explicación ni validación del razonamiento del alumno; planes/texto conservan revisión humana según §2.6.

- Guardar proveedor solicitado/efectivo, motivo de selección, versión de motor, hash de red/pesos, backend, presupuesto y contexto histórico. Reutilizar adaptador, cola y contratos Lc0 de la plataforma de análisis existente.
- No promediar ni restar scores de motores distintos. Comparar propuesta y mejor candidata **dentro de cada proveedor** con igual perfil. `loss_cp_threshold` aplica al perfil Stockfish; Lc0 usa `loss_expected_score_threshold` configurable (propuesta inicial 0.10 en escala 0–1), con `E = P(win) + 0.5 * P(draw)` y `loss = max(0, E(best) - E(propuesta))`, desde el bando que mueve. Las probabilidades deben proceder de salidas WDL documentadas del adaptador y misma configuración. No derivarlas arbitrariamente de cp. Sin WDL comparable, no emitir aviso cuantitativo Lc0; informar análisis no disponible o aplicar fallback.
- Preservar la política de mate tipada. Si el proveedor no informa mate, registrar esa capacidad como no disponible; no inferir mate de una probabilidad alta.
- `tactical_guard_enabled` opcional añade chequeo Stockfish cuando el tutor efectivo es Lc0. Guardar evidencia separada. Alertas tácticas requieren evidencia estable; discrepancia entre motores sin refutación verificada → «motores discrepan», no condenar automáticamente el plan. El guard nunca modifica jugadas de Maia.
- `fallback_provider = none | stockfish`, elegido antes de iniciar (default `none`). Lc0 sin red, recursos o timeout: informar indisponibilidad y aplicar solo el fallback autorizado, con proveedor efectivo visible. Sin fallback rige §4.7.2. No sustituir silenciosamente.
- Perfiles de presupuesto por ritmo, con límites de latencia configurables y pausas de infraestructura separadas del tiempo de reflexión. Una consulta tardía no modifica una jugada confirmada. API rechaza configuraciones inválidas y muestra capacidades antes de iniciar.

Aceptación adicional: selección manual Lc0, enrutamiento por etiqueta, prioridad táctica, fallback autorizado/no autorizado, perspectiva WDL para ambos colores, capacidades ausentes y desacuerdo sin mezcla de scores. Verificar con proveedor simulado y smoke Lc0 real; medir latencia y recursos antes de habilitarlo.

### 4.8 Control antiimpulsividad configurable por ritmo (BASE)

**Objetivo:** ayudar al alumno a realizar un chequeo antes de confirmar jugadas demasiado rápidas. Funciona con o sin tutor y sin motor: rapidez no equivale a error ni demuestra impulsividad. Desactivado por defecto; configuración independiente de §4.7.

La búsqueda documental encontró antecedentes de clasificación temporal en `src/scripts/extract_move_times.py` y chequeos anti-blunder en `docs/ai_chess_coach_course/analysis/mental_model/anti_blunder.py` y `src/frontend/src/utils/coachMental1600.js`, pero no una especificación vigente del control preventivo por ritmo en sparring. Revisar su reutilización antes de implementar; no trasladar umbrales históricos sin validación.

#### 4.8.0 Tutor opcional e independiente

Activar antiimpulsividad **no activa ni exige el tutor**. La UI muestra dos controles independientes: «Control antiimpulsividad» y «Tutor». Ambos se guardan por separado en la configuración de sesión.

| Antiimpulsividad | Tutor | Comportamiento |
|---|---|---|
| Desactivada | Desactivado | Sparring normal; análisis posterior |
| Activada | Desactivado | Solo control temporal y autochequeo genérico; sin consultas a motores durante el juego |
| Desactivada | Activado | Revisión de propuestas por Stockfish/Lc0 según §4.7; sin pausa antiimpulsividad |
| Activada | Activado | Primero control temporal; luego tutor Stockfish/Lc0 según §4.7.6 |

El selector de proveedor aparece únicamente al habilitar el tutor. Deshabilitarlo no cambia los parámetros antiimpulsividad; habilitar antiimpulsividad no cambia el valor del control Tutor. El backend admite las cuatro combinaciones y no exige disponibilidad/configuración de Stockfish o Lc0 para iniciar o jugar con antiimpulsividad sin tutor. El análisis posterior conserva su ciclo independiente.

Aceptación específica: crear y reanudar las cuatro combinaciones; con antiimpulsividad activa y tutor apagado, verificar cero llamadas de análisis a motores durante el juego, ausencia de pistas posicionales en respuestas y funcionamiento aunque ambos proveedores de tutor estén indisponibles. Con ambos activos, aplicar el orden y las reglas de reloj de §4.8.2.

#### 4.8.1 Configuración y presets

`anti_impulse_config_snapshot`: enabled, profile_version, mode (`reminder | enforced_pause`), min_think_ms, low_clock_ms, cooldown_plies, max_prompts_per_game, forced_move_exemption, checklist_enabled, time_control_snapshot y regla de selección del perfil. Campos temporales no negativos; límites enteros; rechazar valores inválidos.

Presets iniciales de producto, editables y **no validados empíricamente**. Regla interna de selección: `T = base_seconds + 40 * increment_seconds`; no representa una clasificación oficial. Configuración exacta por ritmo (p. ej. 900+10) tiene prioridad sobre la banda; luego overrides explícitos del usuario.

| Presupuesto T | Ejemplo | Tiempo mínimo de reflexión | Desactivar bloqueo/avisos si reloj ≤ | Modo inicial al habilitar |
|---|---|---:|---:|---|
| T < 180 s | 1+0 | 0 s | 15 s | Solo registro |
| 180 ≤ T < 600 s | 5+0 | 2 s | 20 s | Recordatorio |
| 600 ≤ T < 1800 s | 10+0; 15+10 | 5 s | 45 s | Recordatorio |
| T ≥ 1800 s | 30+0 | 8 s | 60 s | Recordatorio |
| Sin reloj | Práctica libre | 5 s | No aplica | Recordatorio |

Default adicional en `reminder`: cooldown de 4 plies desde el último aviso y máximo 6 avisos por sesión. En `enforced_pause`, estos límites solo reducen recordatorios visuales: el mínimo sigue aplicándose a cada turno elegible. Exención configurable cuando solo existe una jugada legal. Cero segundos desactiva la intervención temporal. Ritmos con demoras, múltiples períodos o formato desconocido requieren perfil explícito; no interpretarlos como incremento Fischer.

#### 4.8.2 Flujo, reloj e integración

1. Medir tiempo activo de reflexión desde que el turno/tablero está disponible al alumno hasta la propuesta, sin tiempo del bot ni esperas de infraestructura. Backend controla reloj, presupuesto y unicidad; timestamp del cliente solo es telemetría auxiliar.
2. Si el tiempo es menor al mínimo y no aplica exención, mostrar recordatorio genérico: «Revisá la amenaza rival, tus piezas expuestas y la respuesta a tu jugada». No señalar una amenaza concreta ni revelar evaluación.
3. `reminder`: permitir confirmar inmediatamente o volver al tablero. `enforced_pause`: conservar una propuesta pendiente editable/cancelable y ejecutarla automáticamente al completar N segundos totales de tiempo activo desde el inicio del turno, no N segundos adicionales desde cada intento. Si no hay propuesta al vencer el mínimo, ejecutar la siguiente propuesta legal sin demora adicional. Con tutor habilitado, al vencer el mínimo se envía primero al tutor y la ejecución queda sujeta a §4.7. El tablero mantiene la posición oficial y muestra por separado candidata y cuenta regresiva; Maia no responde a propuestas pendientes.
4. El reloj sigue corriendo durante este control: es reflexión, no espera de motor. Si alcanza `low_clock_ms`, liberar inmediatamente cualquier bloqueo y suprimir nuevos avisos. Terminación por tiempo siempre prevalece.
5. Solo una jugada legal con exención habilitada: omitir pausa y guardar motivo. Cooldown/límite de avisos solo omiten intervención en `reminder`; no eliminan la pausa obligatoria. Jaque o recaptura no son exenciones automáticas. Premoves, si existen, cuentan como propuesta rápida y pasan por la misma política.
6. Orden obligatorio: propuesta legal → control antiimpulsividad → evaluación tutor si está habilitado → confirmación única → Maia. No lanzar motor ni pausar reloj del tutor antes de resolver el control temporal. Un reintento del tutor no reinicia el control antiimpulsividad del mismo turno.
7. Checklist opcional de autodeclaración («amenaza rival», «piezas expuestas», «respuesta rival»); completarla no demuestra comprensión ni autoriza una calificación estratégica. No usar los detectores anti-blunder para filtrar avisos de este modo sin motor; eso constituiría ayuda posicional y pertenecería al tutor.
8. Reconexión no reinicia contadores ni regala tiempo; conservar deadline/estado del reloj de servidor. Tiempo activo no instrumentado se marca desconocido, no cero. Sin telemetría fiable, no bloquear; registrar cobertura incompleta.

#### 4.8.3 Persistencia, métricas y aceptación

Reutilizar el pipeline de propuestas de §4.7.3 aun con tutor apagado; `/moves` tampoco puede eludir el control antiimpulsividad. Añadir estado `awaiting_self_check` y resolución `acknowledge_self_check` para recordatorio. En pausa obligatoria, el servidor avanza automáticamente al vencer el mínimo y valida exenciones; un ack no permite eludirlo. Admitir actualización/cancelación versionada de propuesta. El timer de servidor usa la última propuesta vigente; carrera entre vencimiento y edición se resuelve transaccionalmente, rechazando cambios posteriores al commit. Desconexión explícita pausa ejecución automática hasta reanudar, sin congelar gratuitamente el reloj de partida; no ejecutar tras terminación. Mantener una propuesta activa, versión e idempotencia. No crear un segundo historial de jugadas.

Registrar `SelfCheckEvent`: session_id, ply, proposal_ref, config_version, active_think_ms?, clock_remaining_ms, prompt_shown, action, exemption_reason?, clock_policy, timestamps. Evento outbox `sparring.self_check_resolved`. Pausas/avisos se distinguen de ayudas de motor mediante `self_check_used`; etiquetar práctica con apoyo de proceso aunque no haya pistas ajedrecísticas.

Métricas descriptivas: propuestas rápidas / turnos elegibles medidos; avisos aceptados/omitidos; cambios de candidata; error posterior de primera propuesta y de jugada final cuando haya análisis comparable. Separar por ritmo, perfil, apuro de tiempo y tutor. No contar esperar como éxito ni inferir mejora causal de la mera reducción de jugadas rápidas.

Criterios de aceptación:
1. Apagado no altera flujo; presets seleccionados correctamente en límites T=180/600/1800 y overrides 5+0, 10+0, 15+10.
2. Recordatorio no obliga a esperar; pausa obligatoria respeta tiempo activo y se libera en apuro sin regalar tiempo.
3. Única legal y límites visuales se respetan; cooldown/máximo no eliminan el mínimo en `enforced_pause`. Recaptura/jaque no omiten chequeo por sí solos.
4. Tutor apagado funciona sin motores ni soluciones en payload; tutor encendido no duplica pausa, confirmación, incremento ni respuesta de Maia.
5. Reconexión, doble clic, sustitución de candidata, reloj agotado y respuestas obsoletas mantienen consistencia.
6. Cobertura desconocida no se trata como impulsividad; métricas separan apoyo de proceso y evidencia de motor.

Entrega posterior al núcleo de sparring: presets/configuración → pipeline de propuestas y reloj → UI de autochequeo → eventos/métricas → pruebas. Puede entregarse antes del tutor y de Lc0.


#### 4.8.4 MVP de utilidad individual desde posiciones de apertura

**Pregunta:** para este jugador, esta posición inicial y este ritmo, ¿exigir un mínimo de reflexión ayuda a reducir errores? Alcance descriptivo por casos concretos; no requiere experimento A/B formal, asignación aleatoria, significación estadística ni el módulo longitudinal PRO.

Permitir crear un bloque de práctica reutilizable y lanzar varias sesiones contra Maia desde la misma posición de una variante a estudiar. Guardar `PracticeSetupVersion`: id/version, nombre de apertura/variante opcional, FEN de origen, secuencia UCI/PGN previa cuando exista, FEN resultante validada, history_complete, bando del alumno, ritmo, configuración Maia y perfil de análisis posterior. Cada sesión referencia esa versión y guarda sus snapshots de tutor y antiimpulsividad, incluido N efectivo y excepciones. Si solo se aporta FEN, explicitar historia incompleta. Las continuaciones de Maia pueden variar; no prometer partidas idénticas.

Tutor y antiimpulsividad siguen siendo independientes en ambos sentidos (§4.8.0). Para observar específicamente la pausa, comparar sesiones del mismo alumno sin tutor; si lo usa, agruparlas por separado y mostrar ayudas. No mezclar alumno de 700 con otro nivel como si fueran un único caso.

**Registro de propuestas:** conservar cada intento legal inmutable, timestamp, tiempo activo acumulado, reloj restante, orden/versión, sustitución/cancelación y motivo de resolución, incluso con tutor apagado. Una propuesta vigente por turno; referenciar la ejecutada. Registrar tiempo a primera propuesta y tiempo a ejecución por separado. Guardar eventos fuera del PGN principal: este incluye solo jugadas efectivamente ejecutadas. Análisis posterior puede evaluar primera y última propuesta desde la misma raíz; propuestas alternativas no se incorporan como jugadas reales.

**Comparación mínima BASE:** tabla por sesión y agrupación por configuración, no un panel estadístico general:

| Indicador | Definición |
|---|---|
| Blunders, errores e inexactitudes | Conteos separados, mutuamente excluyentes, y tasa = 100 × conteo / jugadas propias efectivamente evaluadas |
| Precisión | Fórmula existente identificada y versionada; mismo motor/perfil. Si no está definida o no es comparable, mostrar no disponible |
| Decisiones rápidas con tiempo disponible | Primera propuesta con tiempo activo < N de referencia y reloj > umbral de apuro; usar el mismo N de referencia para comparar pausa activada/desactivada |
| Cambios de intención | Primera propuesta vs jugada final; comparar calidad solo si ambas tienen análisis estable comparable |
| Coste temporal | Tiempo de reflexión/espera, apuros y terminaciones por tiempo |
| Cobertura | Partidas, jugadas elegibles/evaluadas y casos inciertos/fallidos; nunca tratarlos como aciertos |

Excluir del denominador las jugadas precargadas de apertura y las de Maia. Versionar umbrales de clasificación y análisis, mantenerlos iguales entre grupos; cambios de configuración generan grupos distintos. Agregar tasas a partir de conteos/denominadores, no promediar porcentajes de partidas con tamaños diferentes. Priorizar blunders/errores en niveles iniciales; inexactitudes como medida más sensible cuando disminuyan errores graves, sin cambiar silenciosamente la clasificación por Elo.

Mostrar por separado posiciones/colores/ritmos/configuraciones Maia y tutor; ordenar sesiones por fecha para observar familiarización. Repetir posición reduce variabilidad pero también entrena esa variante: la comparación no demuestra causalidad ni generalización. No etiquetar toda jugada rápida como impulsiva. Éxito práctico = menos errores evitables sin coste excesivo de reloj, no solo esperar N segundos.

Aceptación adicional:
1. N=5 s, propuestas en segundos 1 y 3: solo se ejecuta la última al segundo 5; una cancelación deja el tablero sin jugada. Propuesta inicial después de N se ejecuta sin espera añadida.
2. Ambos controles activos: vencimiento inicia tutor, nunca salta su revisión. Tutor apagado: ejecución sin consulta de motores.
3. Conflicto timer/edición, reconexión, terminación por tiempo y reintentos no duplican commit, incremento ni turno Maia.
4. Bloque PGN/FEN se reconstruye; prefijo no cuenta en métricas. Primera propuesta y ejecución quedan distinguibles aun sin tutor.
5. Tasas usan solo decisiones propias evaluadas, datos incompletos se muestran aparte y grupos incompatibles no se mezclan.

### 4.9 Evaluación de conceptos de apertura — futura, fuera del MVP

Extensión de roadmap para evaluar aplicación contextual de principios, no memorización exacta de variantes ni coincidencia con la primera jugada del motor.

Conceptos iniciales: desarrollo de piezas, control central, seguridad del rey, movimientos repetidos sin necesidad y exposición prematura de dama a ganancias de tiempo. Son señales que requieren contexto: maniobras necesarias, respuestas a amenazas, recapturas y retrasos justificados del enroque no son infracciones automáticas.

Diseño futuro: catálogo/rúbrica versionados, oportunidades evaluables y evidencia por posición; separar observaciones automáticas de valoración humana. Usar estados `observed / needs_review / justified / not_applicable`; un conteo de movimientos de pieza no equivale a un error ni a comprensión conceptual. Sin evidencia suficiente o revisión requerida, mostrar pendiente. Reutilizar planes/HITL e Instructor donde aplique; no añadir un motor de calificación estratégica por cp o palabras clave.

Progresión de validación: posición fija → otras posiciones de la misma apertura → partidas completas/otras estructuras. Registrar etapa para distinguir familiaridad local y transferencia. Delimitar la ventana de apertura de cada ejercicio o sesión explícitamente; no imponer un número universal de jugada.

Entrega futura: definir rúbrica con experto → curar ejemplos y contraejemplos → prototipo de indicadores → revisión humana y prueba de transferencia. Criterios antes de activar: excepciones justificadas no penalizadas, no exigir libro, evidencia trazable y estados no evaluados distintos de cero. Sin fecha ni eficacia prometida.

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
6. Cerrar por horizonte, fin real de partida o interrupción definitiva; un aplazamiento temporal no cierra el intento (§5.8.9). Fin de actividad por horizonte no equivale a victoria ni éxito estratégico; si sigue jugando, conservar el punto de cierre para la evaluación.
7. Analizar decisiones y respuestas rivales; mostrar evidencia y solicitar autoevaluación. Revisión humana valora plan y adaptación, con estado pendiente si no se realiza.
8. Permitir reintento como actividad vinculada con nueva exposición, no como primer intento autónomo.

Política de reloj/checkpoints elegida antes de empezar y registrada; separar reflexión, pausa pedagógica y espera técnica. Tutor y antiimpulsividad, si están disponibles, siguen siendo independientes y opcionales; guardar su configuración y cada ayuda. No son dependencia de esta modalidad y no mezclar intentos asistidos con autónomos. Sus especificaciones fueron integradas en main mediante el [PR #199](https://github.com/cmessoftware/chessinsightai/pull/199), fusionado el 26 de octubre de 2026: §4.7 (tutor) y §4.8 (antiimpulsividad). La integración documental no implica implementación; al integrar esta rama conservar esas secciones.

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



#### 5.8.9 Consideraciones de ampliación: aplazamiento, daily y análisis manual

**Estado:** diseño pendiente de implementación · 2026-10-27. Considerar estas capacidades en los contratos de sesión e intento para evitar que la continuidad estratégica exija completar una partida en una sola conexión. Alcance: sparring propio y ejercicios con continuación; no implica integrar partidas activas de plataformas externas ni un servidor de correspondencia entre humanos. Son ampliaciones independientes, no requisitos para entregar la primera modalidad presencial/en vivo.

**Aplazamiento (adjourn).** Guardar una partida para continuarla más tarde, como modalidad de uso solicitada tomando LucasChess como referencia, sin asumir equivalencia técnica con ese producto. Distinguir aplazamiento explícito, desconexión, pausa pedagógica, fallo de infraestructura, abandono y fin de actividad. No llamar a `finish`, adjudicar resultado ni iniciar/revelar análisis posterior al aplazar.

- Reanudar la misma sesión y Attempt, no crear otro intento ni otra exposición. Preservar posición oficial e historial completo disponible, turno, horizonte consumido, configuración Maia/ayudas, planes/revisiones, notas manuales, propuestas y versiones.
- Política de aplazamiento elegida y versionada antes del inicio. Para práctica en vivo que lo permita: congelar el reloj restante al aceptar el aplazamiento y restaurarlo sin incremento ni reinicio; registrar duración y condición de partida aplazada. Cerrar la aplicación o perder conexión no equivale a solicitarlo.
- Suspender ejecución automática de propuestas y respuestas del rival mientras está aplazada. Si hay motor/job en curso, invalidar su capacidad de escribir mediante versión/estado; una respuesta Maia ya seleccionada y persistida se conserva para evitar remuestreos por aplazamiento. Una selección todavía no persistida puede reintentarse al reanudar, sin duplicar una jugada oficial.
- Aplazar/reanudar son operaciones autorizadas, versionadas e idempotentes. En carrera con commit, timeout o cierre, prevalece la transición aceptada atómicamente; una sesión terminal no se reanuda. Recuperar el estado del servidor tras conflicto.
- Si se permite analizar manualmente durante el aplazamiento, registrarlo como condición de práctica: congelar el reloj no significa que no haya reflexión fuera del tablero. No comparar sus tiempos con una sesión continua como si fueran equivalentes.

**Daily / correspondencia contra Maia.** Modalidad asíncrona con presupuesto explícito por jugada propia (por ejemplo, 1 o 3 días), independiente del reloj Fischer y del aplazamiento.

- Guardar `time_mode=daily`, duración por turno y `turn_deadline_at` autoritativo en UTC; presentar vencimiento en zona horaria del alumno. Definir inicio del plazo cuando la jugada de Maia queda confirmada y disponible en servidor, aunque el alumno no abra la aplicación; para una raíz con turno humano, al activar explícitamente la sesión.
- Cerrar la aplicación, desconectarse o marcar la partida como aplazada para retomarla **no detiene el plazo daily**. La primera versión propuesta no incluye vacaciones ni prórrogas; cualquier incorporación futura requiere política previa, límites y auditoría, nunca una pausa implícita.
- Al confirmar una jugada, validar plazo y estado en la misma transacción. Solicitud recibida con plazo vencido no salva la partida; no confiar en timestamps del cliente. La terminación por tiempo conserva las reglas aplicables de §4.2. Reinicios de worker o reconexiones no reinician el plazo.
- Mientras Maia calcula su respuesta no corre el siguiente plazo humano. Fallos técnicos y recuperación siguen la política del sparring; no inventar respuestas ni convertir indisponibilidad del bot en tiempo consumido del alumno.
- No aplicar automáticamente presets de segundos de §4.8 a días por jugada. El control antiimpulsividad requiere perfil daily explícito o queda desactivado. Tiempo calendario, tiempo activo instrumentado y tiempo desconocido se registran por separado: días transcurridos no equivalen a horas de cálculo.

**Cuaderno de análisis manual sin motor.** Habilitar en daily y, según política previa, en partidas aplazadas: notas, objetivos, candidatas, variantes introducidas por el alumno, respuestas esperadas y valoraciones personales. El tablero auxiliar permite explorar jugadas legales y volver a la posición raíz; no consulta motores ni recomienda jugadas.

- Variantes y notas pertenecen a un espacio de análisis separado del historial oficial. Mover en ese tablero no envía una propuesta, consume una reconsideración ni activa Maia. Jugar una candidata exige confirmación explícita en la posición oficial vigente.
- Guardar revisiones con autor, timestamps de servidor, sesión/intento, ply, contexto histórico, variante raíz y origen `manual`. Una variante sin anotación no demuestra cálculo completo; una valoración humana no se presenta como score de motor.
- Preservar la versión de notas existente al confirmar la jugada. Ediciones posteriores se añaden como revisiones retrospectivas; no reescriben la evidencia de decisión previa. La marca “previa” acredita registro previo a la respuesta dentro de la aplicación, no ausencia comprobada de información externa.
- Perfil explícito `manual_no_engine`: tutor y guard táctico deshabilitados; sin Stockfish/Lc0, evaluaciones, sugerencias, políticas Maia, tablebases ni análisis precalculado expuesto al alumno durante la sesión. Maia solo se consulta como rival para la posición oficial de su turno, nunca para explorar variantes del cuaderno. Validación de legalidad por librería de reglas sí está permitida.
- Aplicar esa restricción en backend, DTO y accesos a análisis, no solo ocultando botones. Notas manuales propias disponibles sin Instructor PRO. Autoevaluación y revisión experta mantienen identidad separada.
- Motor posterior disponible al terminar definitivamente la sesión. Si el horizonte del ejercicio se cierra pero se continúa la misma partida, diferir la revelación de análisis hasta terminarla para conservar la condición sin motor. No revelar soluciones al aplazar ni al cerrar la aplicación.
- El PGN principal conserva solo la partida efectiva; una exportación anotada opcional distingue variantes/comentarios manuales y evidencia posterior de motor.

**Contratos y métricas a precisar antes de implementar.** Extender la sesión con modo temporal, política de aplazamiento/análisis, estado o motivo de suspensión, reloj/deadline y versión; reutilizar propuestas, planes y eventos existentes. Vincular revisiones del cuaderno y snapshot de notas por decisión, sin crear otro historial oficial. Registrar eventos de aplazamiento/reanudación y revisiones de análisis con idempotencia. Separar sesiones continuas, aplazadas y daily; identificar uso del tablero auxiliar y cobertura temporal. Análisis manual no cuenta como ayuda de motor ni prueba por sí mismo comprensión o autonomía sin tablero.

Casos de aceptación para estas ampliaciones:
1. Aplazar/reanudar conserva posición, historial, reloj, plan, notas e intento; no incrementa exposición ni genera análisis posterior.
2. Aplazar compite con timer, jugada o respuesta Maia: una sola resolución oficial; ninguna escritura automática mientras está aplazada.
3. Daily vence con aplicación cerrada; reabrir o aplazar no extiende plazo. Confirmación en el límite y expiración se resuelven según tiempo de servidor.
4. Explorar y guardar variantes no cambia PGN oficial, turno, horizonte ni reloj/deadline configurado.
5. En `manual_no_engine`, intentar acceder a tutor, análisis cacheado o motores desde API no revela evidencia; Maia sigue funcionando únicamente como rival.
6. Edición de notas posterior al commit queda retrospectiva; dos dispositivos no sobrescriben silenciosamente revisiones.
7. Motor posterior no se revela por aplazamiento ni por cierre de horizonte si la misma partida continúa.
8. Métricas no convierten tiempo daily/aplazado en reflexión activa ni mezclan sus condiciones con partidas continuas.

Roadmap: considerar persistencia compatible en STRAT-PLAY-02/03; entregar aplazamiento, daily y cuaderno como incrementos explícitos posteriores, sin ampliar silenciosamente el MVP core. Antes de implementar, cerrar mapeo a estados existentes, política de disponibilidad del turno y recuperación ante jobs/relojes concurrentes.



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

Oportunidades aprovechadas, recurrencia de errores (solo con denominador fiable), ejecución/adaptación de plan (valoración humana), conversión/resistencia separada de resultado y regalos del bot. Separar humano vs Maia, ritmo, nivel rival. CP auxiliar, no estrategia. Para tutor opcional, aplicar §4.7.4: separar primera intención, ayudas y jugada final; no mezclar resultados asistidos con autónomos.

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
| Extensión BASE | Utilidad individual de pausa (§4.8.4) | Bloques desde apertura fija, intentos y comparación descriptiva; no depende de PRO |
| Futuro | Conceptos de apertura (§4.9) | Rúbricas contextuales y transferencia; fuera del MVP |

Paralelo posible: INST antes de PROGRESS; STRAT base no requiere PRO. Tutor opcional (§4.7): ampliación BASE posterior al núcleo de sparring, con evaluación Stockfish/Lc0 de propuestas y control antiimpulsividad (§4.8); independiente de INST/PROGRESS.

---

## 9. Referencias

- [Maia-3](https://github.com/CSSLab/maia3)  
- [Maia-2](https://github.com/CSSLab/maia2)  
- Stockfish UCI: documentación de la versión instalada en despliegue.
