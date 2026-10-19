# CI-SPAR-01 — Sparring con Maia y validación con Stockfish

> **Copia de referencia:** el documento de planificación vigente es [spec_sparring_maia_stockfish_unificado.md](../../../spec_sparring_maia_stockfish_unificado.md) (§4). Arquitectura: [architecture-sparring-maia-module.md](../architecture-sparring-maia-module.md).

Versión: 1.0 · Fecha: 2026-10-16 · Edición: BASE · Estado: especificación para implementación.

## 1. Instrucción para Cursor

Inspeccionar el repositorio, sus instrucciones y los servicios existentes antes de modificar código. Reutilizar autenticación, tablero, importación PGN, análisis servidor, persistencia y colas. No asumir nombres de archivos ni tablas existentes. Las entidades y rutas de esta spec son contratos conceptuales: adaptar sus nombres a las convenciones del proyecto y documentar el mapeo. Implementar incrementalmente, con migraciones compatibles y pruebas de los criterios de aceptación. No implementar los otros módulos completos como dependencia.

Contexto esperado, pendiente de verificar en el repositorio: ChessInsight, backend Python/FastAPI, SQLAlchemy/PostgreSQL, interfaz de ajedrez y análisis Stockfish servidor. No incorporar LLM al MVP.

## 2. Objetivo y límites

Jugar partidas completas o continuar posiciones contra Maia, con nivel configurable. Stockfish analiza la calidad de las decisiones y genera evidencia posterior; no modifica silenciosamente las jugadas del sparring.

Este módulo es independiente del generador de ejercicios. Puede recibir posiciones de ejercicios y publicar sesiones como fuentes de análisis. La evaluación estratégica humana se define en CI-STRAT-02; autoría/asignación docente en CI-INST-03 PRO; métricas longitudinales en CI-PROGRESS-04 PRO.

Incluye: partida normal, continuación desde posición, práctica de conversión, resistencia y ejecución de un plan. Excluye: entrenamiento de modelos, adaptación del nivel durante la partida, corrección automática de planes y afirmación de equivalencia Elo entre plataformas.

## 3. Niveles y proveedor

Implementar `HumanMoveModel` como adaptador intercambiable. Maia-3 es candidato inicial por su interfaz UCI; confirmar capacidades del checkpoint instalado antes de habilitar funciones. Maia-2 puede ser proveedor alternativo. No confundir tamaño del modelo con nivel de juego.

Contrato conceptual:

```text
capabilities() -> model/version, rating_range, history_support,
                  full_policy_support, sampling_support
predict(position_context, self_rating, opponent_rating) -> prediction
choose_move(prediction, sampling_config) -> legal_move
```

Separar:

- Rating declarado: valor, plataforma, ritmo y fecha.
- Nivel solicitado al modelo: parámetro dentro del rango admitido.
- Configuración efectiva: nivel y parámetros realmente usados.
- Fuerza observada: dato experimental; nunca igualarlo automáticamente al parámetro Elo.

Modos iniciales propuestos: consolidación −100, equilibrado 0, desafío +100/+200 respecto de un nivel interno provisional. Son presets ajustables, no calibraciones demostradas. Si no hay conversión validada entre plataforma y modelo, pedir selección manual o marcar el valor inicial como provisional. Fuera de rango: informar y registrar el límite efectivo; no extrapolar silenciosamente.

En cada turno del bot, `self_rating` corresponde al bot y `opponent_rating` al humano. En consultas de una posición del alumno, la asignación se invierte según quién mueve.

## 4. Flujo funcional

1. Elegir partida inicial o posición procedente de PGN/FEN/ejercicio.
2. Configurar color, nivel, modo, ritmo opcional y plan versionado opcional.
3. Validar posición y guardar un snapshot de configuración.
4. Jugar sin mostrar motor, probabilidades ni soluciones. Las ayudas explícitas en modo práctica se registran.
5. Guardar cada jugada y su tiempo de manera transaccional.
6. Al terminar o cerrar la práctica, lanzar análisis Stockfish asíncrono.
7. Mostrar decisiones relevantes, evidencia y vínculo a análisis. Un horizonte de práctica agotado no equivale a victoria o derrota.

La posición conserva FEN inicial y lista de jugadas. Si se dispone del historial previo, conservarlo para repeticiones y modelos que lo usan. Con una FEN aislada no afirmar que se conocen repeticiones anteriores. Implementar mate, ahogado, posición muerta, reclamaciones de tablas aplicables, tablas automáticas, abandono y reloj con una librería de reglas; verificar las reglas de tiempo e insuficiencia de posibilidad de mate.

## 5. Política de juego y fallos

- Muestreo fijo y versionado; conservar distribución original y parámetros de transformación cuando estén disponibles.
- Validar legalidad de toda respuesta del proveedor.
- No usar Stockfish para reparar malas decisiones de Maia. Un rival híbrido sería otro modo explícito, fuera del MVP.
- Ante timeout, jugada ilegal o modelo caído: pausar/informar; no consumir el tiempo del alumno por una falla de infraestructura. No inventar una jugada.
- Reintentos con identificador de turno y revisión de posición: no aplicar dos veces una respuesta ni aplicar una respuesta vieja después de reiniciar.
- Guardar jugada elegida y semilla si se admite. Reconstrucción exacta de la partida mediante jugadas guardadas; la reproducibilidad numérica de inferencia puede depender del hardware.
- Mantener modelos cargados, limitar concurrencia y registrar latencia. El análisis posterior no bloquea el tablero.

## 6. Validación Stockfish

Usar análisis servidor con configuración explícita y versionada: binario, red si aplica, presupuesto por posición, threads, hash, MultiPV y criterio de estabilidad. Reutilizar el servicio existente si existe.

Para una posición s y jugada m, evaluar mejor candidata y jugada elegida desde la misma perspectiva: el bando que mueve en s. Conceptualmente `loss_cp=max(0, V(s,best)-V(s,m))`. Preferir análisis de candidatas desde la misma raíz mediante búsqueda restringida cuando se compare; registrar diferencias de presupuesto. Un resultado negativo por ruido obliga a revisar estabilidad, no a atribuir una mejora imposible frente a la mejor jugada.

Guardar puntuaciones tipadas (`cp`, `mate`, `wdl`), perspectiva y presupuesto. No convertir mates a un número arbitrario de cp. No comparar directamente cp derivados de Maia con cp de Stockfish.

La evaluación es evidencia aproximada con presupuesto finito. Las posiciones inestables quedan `analysis_uncertain`. Los umbrales de error son configurables y no constituyen una evaluación automática de comprensión estratégica.

Conversión/resistencia: analizar decisiones del alumno y errores del rival por separado. Ganar tras un regalo del bot no certifica buena ejecución; perder no invalida la mejor defensa disponible.

## 7. Datos y contratos

| Entidad | Campos mínimos |
|---|---|
| SparringSession | id, owner_id, initial_fen, prior_moves, history_complete, human_color, mode, time_control, model_config_snapshot, plan_version_id?, exercise_version_id?, status, result, termination_reason, timestamps |
| SparringMove | session_id, ply, uci, actor, resulting_fen, elapsed_ms, clock_state, request_id, prediction_ref?, created_at |
| EngineAnalysis | id, position_context_hash, provider, version, config, score_type, perspective, candidates, stability, status |
| ModelPrediction | model/version, rating inputs, policy?, policy_coverage?, sampling config, chosen_move, latency |

Restricciones: único `(session_id, ply)` y request id idempotente. Hash de caché con historial relevante, reglas, versión y parámetros; no solo FEN.

Rutas conceptuales:

```text
POST /sparring/sessions
GET  /sparring/sessions/{id}
POST /sparring/sessions/{id}/moves       # expected_ply + request_id
POST /sparring/sessions/{id}/finish
POST /sparring/sessions/{id}/analysis    # job idempotente
GET  /sparring/sessions/{id}/analysis
```

Estados: `created -> active -> finished`; `active -> paused -> active`; `created/active/paused -> cancelled`. Análisis con estado separado: `pending/running/completed/uncertain/failed`.

Eventos versionados: `sparring.session_started`, `sparring.move_committed`, `sparring.session_finished`, `analysis.completed`. Incluir event_id, schema_version, actor, source_id y timestamps UTC. Usar outbox/patrón equivalente existente para evitar pérdida o duplicación lógica.

## 8. UI y permisos

Pantallas: configuración, tablero de sesión y revisión posterior. Mostrar nivel solicitado/efectivo y procedencia de la posición. La selección de nivel no promete un Elo certificado. Solo propietario y usuarios explícitamente autorizados pueden consultar sesiones. Un instructor necesita relación de acceso activa; ser PRO no concede acceso a otros alumnos.

## 9. Criterios de aceptación y pruebas

1. Partida desde inicio y desde FEN/PGN, ambos colores, todas las jugadas legales.
2. Reanudar reconstruye exactamente tablero y reloj desde datos guardados.
3. Una respuesta tardía o una solicitud duplicada no agrega una jugada extra.
4. Un fallo de Maia pausa sin sustituirlo por Stockfish.
5. El análisis mantiene perspectiva correcta para blancas/negras y distingue mate de cp.
6. La configuración del rival permanece estable durante la sesión.
7. Finales y repeticiones se prueban con historial completo y se identifica historial incompleto.
8. No hay fuga de análisis/soluciones durante el juego normal.
9. Consultar una sesión ajena sin permiso devuelve denegación.
10. Prueba de integración con un proveedor simulado y smoke test del checkpoint real; medir latencia/memoria antes de declarar aptitud del despliegue.

## 10. Entrega incremental y fuentes

Orden: adaptador y validación de capacidades; sesiones persistentes; tablero y fallos; análisis posterior; exportación de eventos. Documentar variables de configuración, instalación/pesos fijados, licencias aplicables y limitaciones observadas. No descargar pesos en cada turno ni introducir dependencia obligatoria de GPU sin medición.

Referencias oficiales consultadas en el diseño, verificar contra versión fijada al implementar:
- https://github.com/CSSLab/maia3
- https://github.com/CSSLab/maia2
