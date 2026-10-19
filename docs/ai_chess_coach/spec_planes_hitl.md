# ChessInsight — Documentación y revisión de planes por posición

**Identificador propuesto:** CI-PLANS-HITL  
**Versión:** 1.0 — 2026-10-16  
**Destino:** implementación incremental en Cursor  
**Alcance:** MVP determinista, sin LLM ni generación automática de planes.

## 1. Instrucciones para Cursor

Inspeccionar el repositorio antes de implementar. Identificar las entidades existentes de partidas, posiciones, análisis manual, usuarios, sesiones de revisión y trabajos de motores. Reutilizar servicios, convenciones, migraciones, permisos y componentes existentes.

Esta especificación define contratos conceptuales; los nombres de tablas, rutas y archivos se adaptarán al proyecto. No presupone que se haya inspeccionado el código actual. No crear un sistema paralelo de análisis, autenticación o trabajos en segundo plano.

Integrar el módulo con el análisis manual y las posiciones críticas. Si Stockfish server o Lc0 todavía no están disponibles, conservar la funcionalidad manual y mostrar el proveedor como no disponible. No sustituir silenciosamente el análisis server por el motor liviano del navegador.

## 2. Problema y objetivo

Actualmente una evaluación o una variante no conserva por sí sola el razonamiento estratégico del jugador ni el juicio del instructor.

Permitir formular planes para una posición, registrar su fundamento, comparar alternativas, adjuntar evidencia de motores y revisarlos en sesiones HITL (human-in-the-loop). Conservar la propuesta original, las correcciones y los desacuerdos.

Un plan es un objetivo acompañado de acciones y condiciones. Una variante representa una posible ejecución; no equivale al plan completo.

### Resultados esperados

- Documentar qué pretende conseguir cada bando y por qué.
- Separar calidad del objetivo, viabilidad de la ejecución y dificultad práctica.
- Conservar comentarios expertos vinculados a versiones concretas.
- Utilizar Stockfish como análisis base y Lc0 como segunda opinión opcional.
- Producir registros reutilizables para estudio y, eventualmente, investigación de ML, sin convertir opiniones en etiquetas objetivas automáticamente.

## 3. Alcance

### Incluido

- Varios planes propios o rivales por posición.
- Diagnóstico sin motor y registro de exposición posterior a evidencia.
- Objetivos, mecanismos, debilidades, candidatas y respuestas rivales.
- Versionado, sesiones HITL, comentarios y dictámenes por dimensión.
- Variantes legales y evidencia de análisis server.
- Comparación manual de planes y registro de discrepancias entre motores.
- Consulta y exportación de registros en Markdown y JSON.

### Excluido

- Generación automática de planes o explicaciones con LLM.
- Clasificador automático de calidad estratégica.
- Detección automática completa de debilidades.
- Puntuación global de calidad del plan.
- Entrenamiento de ML y evaluación automática de dificultad por Elo.
- Nuevos motores, entrenamiento de redes o implementación de Shootout.
- Colaboración en tiempo real, audio y transcripción de sesiones.
- Aprobación automática por coincidencia con la primera opción de un motor.

## 4. Taxonomía multidimensional

No utilizar una lista única que mezcle fase, objetivo, mecanismo y condición dinámica.

### 4.1 Objetivo principal: exactamente uno por revisión presentada

| Código | Objetivo | Ejemplos |
| --- | --- | --- |
| king_attack | Ataque al rey | Abrir líneas, incorporar atacantes |
| exploit_weakness | Explotar debilidades | Presionar un peón atrasado, ocupar una casilla |
| improve_pieces | Mejorar piezas y coordinación | Activar la peor pieza, controlar una columna |
| transform_structure | Transformar la estructura | Crear un pasado, fijar peones |
| prophylaxis | Prevenir o neutralizar | Impedir una ruptura o una maniobra rival |
| defense_resistance | Defender y resistir | Bloquear, evitar penetraciones, buscar tablas |
| counterplay | Generar contrajuego | Crear amenazas que limiten al rival |
| convert_advantage | Convertir una ventaja | Reducir recursos y alcanzar una ventaja realizable |

Permitir objetivos secundarios de la misma taxonomía, sin repetir el principal.

### 4.2 Otras dimensiones

- Fase: opening, middlegame, endgame, transition, unknown.
- Iniciativa: white, black, contested, unclear. Registrar autor; no inferir desde cp.
- Mecanismos múltiples: simplification, exchange_defender, blockade, pawn_break, open_file, double_rooks, improve_worst_piece, king_activation, restriction, create_passed_pawn, invasion, other.
- Si se elige other, exigir descripción.
- Final es una fase. Activar el rey o crear un pasado son acciones/objetivos concretos dentro de ella.
- Iniciativa puede ser condición y parte del objetivo textual; no implica necesariamente ataque al rey.
- Simplificación exige declarar propósito y qué cambios se buscan o evitan.
- Profilaxis puede ser objetivo principal o acción incluida en otro plan.

## 5. Datos de un plan

Un borrador admite campos incompletos. Para presentar una revisión a HITL exigir:

1. Posición válida y bando del plan.
2. Título y objetivo principal.
3. Objetivo concreto en texto.
4. Fundamento posicional.
5. Acciones previstas, al menos una.
6. Recursos del rival; aceptar «no identificados todavía» de forma explícita.
7. Condiciones de viabilidad.
8. Criterio observable de éxito.
9. Criterio de abandono o revisión.

Campos opcionales: objetivos secundarios, mecanismos, objetivos sobre el tablero, candidatas, variantes, dificultad percibida, tiempo disponible durante la partida y confianza declarada del autor.

Las acciones son una secuencia orientativa de maniobras, no necesariamente jugadas consecutivas. Deben admitir condiciones y prioridades.

No exigir una variante para documentar un plan. Si el bando del plan no tiene el turno, las variantes deben empezar con el movimiento legal del bando que sí lo tiene.

## 6. Debilidades y objetivos sobre el tablero

Cada objetivo sobre el tablero pertenece a una revisión y registra:

| Campo | Valores o contenido |
| --- | --- |
| kind | isolated_pawn, backward_pawn, doubled_pawns, undefended_piece, underdefended_piece, weak_square, weak_color_complex, exposed_king, restricted_piece, other |
| side | white / black |
| squares | Lista de casillas válidas; opcional para objetivos globales |
| description | Hipótesis concreta |
| persistence | temporary / persistent / unknown |
| accessibility | immediate / requires_preparation / inaccessible / unknown |
| defenders | Descripción o referencias a casillas |
| compensation | Actividad, espacio, iniciativa u otra compensación |
| exploitation_method | Cómo se pretende aprovechar |
| source | player / expert |
| confirmation | hypothesis / expert_supported / disputed |

No equiparar peón aislado con debilidad explotable. No determinar automáticamente piezas insuficientemente defendidas contando atacantes y defensores. El valor depende de legalidad, clavadas, intercambios y contexto.

Las casillas se anclan a la posición de origen. No asumir que identifican permanentemente a una pieza a lo largo de una variante.

## 7. Flujo de usuario

1. Abrir una partida y seleccionar una posición.
2. Entrar en «Planes» desde el análisis manual.
3. Registrar diagnóstico y uno o más planes sin motor.
4. Guardar una versión inicial.
5. Revelar o solicitar evidencia de motor de forma explícita.
6. Adjuntar candidatas y variantes a afirmaciones del plan.
7. Abrir una sesión HITL y añadir revisiones de planes.
8. Registrar comentarios, alternativas y dictámenes.
9. Crear una nueva revisión incorporando cambios.
10. Guardar una lección y, opcionalmente, vincular una posición posterior.

La posición posterior debe indicar si pertenece a la partida real o a una variante. El resultado de la partida no valida ni invalida el plan.

### Exposición al motor

Registrar engine_exposure = none_declared / revealed_in_app / prior_exposure_declared / unknown.

Registrar first_engine_revealed_at cuando corresponda. «Sin motor» describe el registro disponible y la declaración del usuario; no garantiza ausencia de exposición fuera de la aplicación.

Al revelar evidencia, preservar primero una revisión inmutable del contenido actual. No bloquear al jugador si ya consultó motor.

## 8. Revisión HITL

Una sesión puede incluir varias posiciones y revisiones. Una revisión puede recibir varias evaluaciones de expertos, sin sobrescribirlas.

### Comentarios

Campos: autor, fecha, sesión, revisión, categoría, texto y anclaje.

Categorías: diagnosis, objective, opponent_resources, prophylaxis, calculation, execution, practical_difficulty, lesson, other.

Anclajes permitidos:

- Revisión completa.
- Campo específico de la revisión.
- Variante y número de ply, donde ply 0 corresponde a su raíz.
- Objetivo sobre el tablero.

No cambiar silenciosamente un comentario de una revisión antigua a una nueva.

Seguimiento del comentario: open / incorporated / disagreement / dismissed. Si se descarta o documenta desacuerdo, guardar motivo y autor. Una corrección de comentario debe conservar historial o reemplazarlo mediante un nuevo comentario enlazado.

### Dimensiones de evaluación

| Dimensión | Pregunta |
| --- | --- |
| positional_coherence | ¿El objetivo se justifica por la posición? |
| tactical_feasibility | ¿La ejecución propuesta supera las comprobaciones realizadas? |
| practical_suitability | ¿Es ejecutable para el jugador y el tiempo disponible? |

Dictamen por dimensión: not_assessed / plausible / supported / conditional / needs_revision / refuted.

Todo dictamen distinto de not_assessed exige justificación. conditional exige condiciones. refuted exige precisar qué se refuta y evidencia o explicación concreta.

Scope de la conclusión: objective / execution / applicability / whole_plan. Si el scope es execution, vincular la variante o candidata correspondiente. Una refutación táctica de una variante no debe marcar automáticamente todo el plan como refutado.

Estado de trabajo separado del dictamen: draft / submitted / in_review / reviewed. El estado reviewed indica revisión finalizada, no aprobación. Archivar es un atributo del plan, no un dictamen.

## 9. Motores: responsabilidades y límites

### 9.1 Stockfish

Proveedor base de análisis server. Reutilizar la infraestructura existente para candidatas, MultiPV, análisis restringido y comprobación de variantes.

### 9.2 Lc0

Proveedor opcional de segunda opinión, solicitado manualmente en una posición o variante seleccionada. No ejecutarlo sobre todas las posiciones por defecto.

Registrar versión, hash de red, backend y parámetros. La falta de Lc0 no bloquea documentación ni revisión humana.

### 9.3 Reglas comunes

- No asignar «estrategia» exclusivamente a Lc0 ni «táctica» exclusivamente a Stockfish.
- No decidir calidad pedagógica por ranking de jugadas.
- No sumar, promediar ni restar directamente cp de motores distintos para emitir un dictamen.
- WDL tampoco representa automáticamente probabilidades reales para el Elo del jugador.
- No comparar profundidad o número de nodos como si fueran equivalentes entre arquitecturas.
- Presentar proveedor, presupuesto, configuración y momento del análisis.
- Una coincidencia entre motores es evidencia, no validación semántica del plan.
- La ausencia de refutación encontrada no demuestra corrección.
- Un plan de resistencia puede ser útil aunque la posición siga objetivamente perdida.

### 9.4 Contrato de evidencia

Guardar, reutilizando modelos existentes cuando sea posible:

- Identidad y versión del motor.
- Hash de red/pesos; en Stockfish registrar la identidad de NNUE si está disponible.
- FEN raíz y contexto de movimientos disponible.
- Parámetros UCI relevantes y presupuesto solicitado.
- Tiempo, profundidad y nodos alcanzados, cuando existan.
- Backend/hardware resumido para interpretar resultados.
- Tipo de búsqueda: unrestricted / restricted_root / continuation.
- Restricciones de búsqueda y candidatas solicitadas.
- Variantes en UCI y representación SAN derivada.
- Score bruto y perspectiva original.
- Score normalizado a blancas: cp o mate como tipos distintos.
- WDL normalizado a blancas, si el proveedor lo expone, con escala y configuración.
- Indicadores lowerbound/upperbound y resultados parciales.
- Fecha, job_id y estado: queued / running / succeeded / failed / cancelled.

Para mostrar evaluación desde el bando del plan, invertir cp/signo de mate e intercambiar W/L si el plan es de negras. No convertir mate en un número arbitrario de cp.

### 9.5 Comprobación de candidatas

Para comparar una candidata con la mejor jugada:

1. Analizar la raíz sin restricciones.
2. Si la candidata no está cubierta, usar búsqueda restringida a esa candidata o analizar la posición hija.
3. Conservar tipo de búsqueda y perspectiva; al analizar la hija cambia el turno.
4. Mostrar diferencias solo dentro del mismo motor y con configuración/presupuesto comparables.
5. Marcar los resultados como estimaciones de búsquedas separadas.
6. No forzar la cooperación del rival ejecutando toda una variante y evaluando únicamente su última posición.

El usuario o experto selecciona puntos intermedios relevantes para buscar recursos del rival.

### 9.6 Discrepancias entre motores

Mostrar listas de candidatas y evidencias lado a lado. Para el MVP, permitir registrar manualmente una discrepancia:

- different_execution
- different_objective_interpretation
- different_evaluation
- viable_alternatives
- unresolved

La interpretación de objetivos es humana: un motor no devuelve esta etiqueta.

Que las primeras jugadas sean distintas solo permite mostrar «primera candidata diferente». No genera automáticamente alerta estratégica ni arbitraje.

## 10. Modelo conceptual de datos

Usar UUID o las claves existentes del proyecto, fechas UTC y claves foráneas consistentes.

| Entidad | Campos principales |
| --- | --- |
| PositionSnapshot | game_id opcional, node_id/ply opcional, fen, start_fen, move_history_uci, history_complete, context_hash |
| Plan | position_id, owner_id, side, current_revision_id, archived_at |
| PlanRevision | plan_id, revision_number, parent_revision_id, author_id, contenido del plan, engine_exposure, created_at |
| PlanTarget | revision_id y campos de sección 6 |
| PlanLine | revision_id, root_position_id, candidate_uci opcional, moves_uci, purpose, claim_text |
| PlanEvidenceLink | revision_id, line_id opcional, analysis_id, claim_text, relation |
| ReviewSession | owner_id, reviewer_id opcional, started_at, ended_at, status |
| ReviewSessionItem | session_id, revision_id |
| ReviewComment | session_item_id, author_id, anchor, category, text, resolution, supersedes_id |
| PlanAssessment | session_item_id, reviewer_id, dimension, verdict, scope, rationale, conditions, evidence_refs |
| EngineDiscrepancy | revision_id, evidence_a_id, evidence_b_id, category, author_id, explanation |
| PlanLesson | revision_id, text, followup_position_id opcional |

relation en PlanEvidenceLink: supports / challenges / contextual / unresolved. Es una interpretación humana registrada con autor; no la calcula el motor.

### Integridad

- UNIQUE(plan_id, revision_number).
- current_revision_id debe pertenecer al mismo plan.
- Sesión, comentario y assessment deben referirse a la misma revisión.
- Evidencia reutilizada debe corresponder a la posición y contexto indicados.
- Las revisiones guardadas son inmutables; editar crea otra.
- Cambios concurrentes con versión esperada: rechazar conflicto, no sobrescribir.
- Archivar preserva revisiones y comentarios.
- Un estado reviewed de una revisión no se hereda a la siguiente.

### Identidad de posición y caché

FEN no sustituye el historial para repeticiones ni para entradas de Lc0 que utilizan posiciones previas. Conservar secuencia desde start_fen cuando exista. Para posiciones aisladas, history_complete=false y mostrar limitación.

La clave de caché incluye contexto de posición, motor, versión, red, parámetros relevantes, restricciones y presupuesto. Reutilizar el sistema existente; no mezclar resultados de configuraciones distintas.

## 11. Contratos de aplicación/API propuestos

Adaptar rutas y nombres al backend actual. Aplicar permisos existentes en cada operación.

| Operación | Contrato orientativo |
| --- | --- |
| Listar planes | GET /positions/{id}/plans |
| Crear plan y revisión inicial | POST /positions/{id}/plans |
| Guardar revisión | POST /plans/{id}/revisions con expected_revision |
| Leer historial | GET /plans/{id}/revisions |
| Archivar | PATCH /plans/{id} |
| Solicitar análisis | POST /plan-revisions/{id}/analysis-jobs |
| Vincular evidencia existente | POST /plan-revisions/{id}/evidence |
| Crear sesión | POST /plan-review-sessions |
| Añadir revisión a sesión | POST /plan-review-sessions/{id}/items |
| Añadir comentario | POST /plan-review-items/{id}/comments |
| Registrar assessment | POST /plan-review-items/{id}/assessments |
| Exportar | GET /plans/{id}/export?format=markdown o json |

Los análisis responden con job_id y se consultan mediante el mecanismo existente. Admitir cancelación, límite de tiempo y error visible. No ejecutar búsquedas largas dentro de una petición HTTP síncrona.

Errores: 422 para contenido inválido; 409 para conflicto de revisión; códigos de autorización según convención existente. Una solicitud de proveedor no disponible debe devolver estado explícito y no cambiar de proveedor.

Reintentos de creación de trabajos deben ser idempotentes mediante el mecanismo existente o una request_key.

## 12. Interfaz mínima

Agregar pestaña «Planes» al análisis de posición.

### Lista

Título, bando, objetivo, revisión actual, estado de trabajo, resumen de dictámenes y existencia de evidencia. Evitar un semáforo global de «correcto/incorrecto».

### Editor

- Diagnóstico.
- Objetivo y fundamento.
- Acciones y condiciones.
- Recursos del rival.
- Debilidades/objetivos.
- Candidatas y variantes.
- Criterios de éxito y abandono.
- Evidencia y comentarios.

Campos avanzados colapsados. Permitir guardar borrador incompleto.

### Revisión

Tablero compartido con la variante seleccionada, revisión inmutable visible, comentarios anclados y evaluación por dimensión. Botón para crear revisión corregida.

Comparación de dos planes de la misma posición: objetivo, acciones, respuesta rival, riesgos, evidencia y dictámenes. No ordenar automáticamente por una puntuación estratégica.

### Filtros

Bando, fase, objetivo, mecanismo, tipo de debilidad, estado, dictamen por dimensión, experto y presencia de evidencia Lc0. Paginación según convenciones existentes.

## 13. Permisos y procedencia

Reutilizar propietarios y permisos existentes. Un usuario solo accede a partidas y revisiones autorizadas. El rol de experto no concede acceso global.

Si el MVP no tiene cuentas de instructores, el propietario puede registrar notas atribuidas a una sesión, pero deben identificarse como notas transcritas: entered_by y attributed_reviewer_name separados. No presentarlas como firma autenticada del instructor.

Compartir un plan no debe cambiar automáticamente la visibilidad de la partida. Aplicar la política actual de acceso.

Los textos y exportaciones se escapan al renderizar para evitar inyección HTML. Validar FEN y jugadas en servidor, además de la validación del cliente.

## 14. Exportación

Markdown legible: posición, bando, plan original, revisiones, variantes, comentarios, dictámenes, lección y metadatos resumidos de motores.

JSON: schema_version, entidades exportadas, identificadores, autoría, fechas, taxonomía, evidencia y estado de revisión. No exportar credenciales, rutas internas sensibles ni datos de usuarios ajenos.

Preservar hipótesis, desacuerdos y falta de evaluación. No transformar supported en una etiqueta de verdad universal.

## 15. Casos de aceptación y pruebas

| ID | Escenario | Resultado esperado |
| --- | --- | --- |
| AC01 | Dos planes para una posición | Persisten y se comparan sin sobrescribirse |
| AC02 | Borrador incompleto | Se guarda; presentación HITL informa campos faltantes |
| AC03 | Revelar motor | Se conserva revisión previa y fecha de exposición |
| AC04 | Plan de negras | cp/WDL se muestran en perspectiva correcta |
| AC05 | Variante ilegal | Rechazo con primer ply inválido |
| AC06 | Plan del bando que no mueve | Variante comienza con el turno real; no se altera FEN |
| AC07 | Ejecución refutada | Objetivo no queda refutado automáticamente |
| AC08 | Comentario y nueva revisión | Comentario permanece en la versión original |
| AC09 | Dictámenes contradictorios | Ambos se conservan con autores y razones |
| AC10 | Lc0 no disponible o falla | Plan e HITL siguen funcionando; error explícito |
| AC11 | Motores eligen distintas primeras jugadas | No se declara superioridad ni refutación |
| AC12 | FEN igual con historial distinto | Caché no mezcla contextos |
| AC13 | Score mate | Se conserva tipado, sin conversión artificial a cp |
| AC14 | Peón aislado registrado | No se marca automáticamente explotable |
| AC15 | Plan de resistencia en posición perdida | Puede recibir valoración práctica favorable |
| AC16 | Ediciones concurrentes | Conflicto explícito; no hay pérdida silenciosa |
| AC17 | Acceso a plan ajeno no autorizado | Denegado en lectura, escritura y exportación |
| AC18 | Exportación | Mantiene revisiones, comentarios y procedencia |
| AC19 | Selección de posición hija | Perspectiva de evaluación normalizada correctamente |
| AC20 | Revisión reviewed y nueva versión | La nueva versión comienza sin dictamen heredado |

Pruebas de dominio para versionado, integridad y normalización de scores. Pruebas de integración para persistencia, permisos y trabajos de análisis con adaptadores simulados. Una prueba de humo opcional con motor instalado, fuera de las pruebas deterministas habituales.

No fijar como expectativa de prueba la primera jugada exacta de un motor: depende de versión, configuración y presupuesto.

## 16. Implementación incremental

### Entrega 1 — Planes manuales

Modelo, migración, servicios, editor, posiciones, variantes legales y versionado. Funciona sin motores.

### Entrega 2 — HITL

Sesiones, comentarios anclados, dictámenes por dimensión, historial y exportación.

### Entrega 3 — Stockfish server

Vinculación a análisis existentes, trabajos bajo demanda, normalización y procedencia.

### Entrega 4 — Lc0 opcional

Adaptador/capacidad existente, segunda opinión, comparación de evidencia y discrepancias manuales.

### Entrega 5 — Integración y cierre

Filtros, navegación desde posiciones críticas, pruebas de aceptación, documentación operativa y verificación de regresiones del análisis manual.

Cada entrega debe ser usable y migrable por separado. No añadir LLM, generación de ejercicios ni ML como dependencia.

## 17. Definición de terminado

- Flujo completo: posición → plan original → evidencia → sesión HITL → revisión → lección → exportación.
- Historial conservado y comentarios anclados correctamente.
- Perspectiva de evaluación consistente.
- Errores de motor y falta de Lc0 manejados sin pérdida de trabajo.
- Migraciones y pruebas relevantes ejecutadas.
- Documentación de configuración y límites.
- Resumen final de implementación: cambios, pruebas y pendientes reales.
- Sin afirmar que un motor valida semánticamente un plan.

## 18. Referencias técnicas

Referencias de capacidades, no benchmarks comparativos ni prueba de superioridad estratégica:

- Lc0: arquitectura, búsqueda y salidas de la red: https://lczero.org/dev/overview/
- Lc0: parámetros, red y configuración: https://lczero.org/play/configuration/flags/
- Stockfish: introducción a NNUE, referencia histórica: https://stockfishchess.org/blog/2020/introducing-nnue-evaluation/

Usar la documentación de la versión efectivamente instalada al implementar los adaptadores.

