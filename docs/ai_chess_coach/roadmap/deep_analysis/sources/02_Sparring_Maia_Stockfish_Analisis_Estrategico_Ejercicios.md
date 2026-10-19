# CI-STRAT-02 — Análisis estratégico y generación de ejercicios

> **Copia de referencia:** el documento de planificación vigente es [spec_sparring_maia_stockfish_unificado.md](../../../spec_sparring_maia_stockfish_unificado.md) (§5). Arquitectura: [architecture-sparring-maia-module.md](../architecture-sparring-maia-module.md).

Versión: 1.0 · Fecha: 2026-10-16 · Edición: BASE · Estado: especificación para implementación.

## 1. Instrucción para Cursor

Inspeccionar el repositorio e integrar los componentes existentes de posiciones, planes, análisis servidor, PGN y revisión manual. No crear un segundo sistema de planes o ejercicios si ya existe uno. Los contratos siguientes son conceptuales; documentar su correspondencia con el esquema real. No usar LLM ni calificar automáticamente texto libre. No implementar como dependencia el módulo Instructor completo.

Este documento conserva el generador de ejercicios de las conversaciones previas: incluye ejercicios tácticos y posicionales. El análisis estratégico constituye su núcleo posicional. CI-SPAR-01 proporciona práctica opcional; CI-INST-03 PRO gestiona autoría, curación y alumnos; CI-PROGRESS-04 PRO agrega métricas. El análisis base funciona sin instructor asignado, dejando la interpretación no revisada explícita.

## 2. Objetivo

Convertir posiciones de partidas propias, colecciones o sparring en análisis documentados y ejercicios adaptados. Separar tres evidencias: solidez objetiva aproximada por Stockfish, plausibilidad humana por Maia y interpretación pedagógica por experto.

La unidad es `posición + consigna + criterio de evaluación`. Una misma posición puede originar varios ejercicios. No confundir una jugada frecuente con buena, ni iniciativa con ganar algunas decenas de cp. Igualar una posición inferior es una aspiración condicionada por la posición y la defensa rival, no una garantía.

## 3. Familias y modalidades

| Familia | Objetivos |
|---|---|
| Táctica | Mate, material, ventaja decisiva, combinación defensiva, evitar una amenaza |
| Evaluación/planes | Diagnóstico, iniciativa, profilaxis, actividad, debilidades, cambios, conversión, resistencia, contrajuego, revisión de plan |

Final es una fase/contexto, no un plan único. Permitir varias etiquetas sin categorías excluyentes. Ataque e iniciativa pueden coexistir, pero no son sinónimos.

Dimensiones independientes:
- Contenido y objetivo interno.
- Presentación: objetivo+tema visibles, solo objetivo, ninguno revelado.
- Respuesta: jugada, variante, evaluación, selección de candidatas, combo de razones, texto libre o combinación.
- Plan de referencia opcional, siempre versionado.
- Ayudas escalonadas y dificultad provisional/observada separadas.

Ejercicios posicionales: defender activamente, neutralizar ventaja rival, mejorar una pieza, crear amenaza sostenible, elegir cambios, comparar tres buenas candidatas, decidir si continuar o modificar un plan.

## 4. Flujo de análisis/generación

1. Importar posición con fuente, permisos, FEN e historial disponible.
2. Registrar diagnóstico/plan del alumno antes de mostrar motor si se usa modalidad sin ayudas.
3. Ejecutar análisis Stockfish servidor; analizar explícitamente cada candidata a comparar.
4. Consultar Maia al nivel de referencia y niveles cercanos si el proveedor está disponible.
5. Generar propuesta determinista: objetivo, candidatas, variantes, etiquetas y evidencia.
6. Validar automáticamente lo táctico. El contenido posicional queda como borrador o propuesta no revisada hasta revisión humana.
7. Publicar solo ejercicios que satisfagan su política de validación. La autoría/asignación docente requiere CI-INST-03.
8. Registrar intento y evaluaciones automáticas/humanas por separado.
9. Permitir continuar en sparring, registrando que es otra actividad relacionada.

El generador debe funcionar sin Maia; marcar señales humanas como no disponibles, no inventarlas. Si Stockfish falla, no publicar automáticamente soluciones nuevas.

## 5. Stockfish y selección de candidatas

Usar un presupuesto configurable y versionado, puntuaciones tipadas, perspectiva estable y comprobación de estabilidad entre presupuestos. Reutilizar el contrato EngineAnalysis de CI-SPAR-01. La comparación de jugadas debe usar evaluaciones homogéneas de raíz. No tratar MultiPV=3 como prueba de que tres candidatas son buenas ni de que no existen más soluciones.

La tolerancia cp es un filtro configurable, no una definición universal de corrección. Guardar tolerancia efectiva, contexto y criterio utilizado. En escenarios de mate, tablas demostrables o tablebases utilizar criterios correspondientes, sin cp sintéticos.

Para comparación posicional:
- Se requieren tres candidatas verificadas individualmente y con alternativas estratégicas significativas.
- Si solo hay dos candidatas adecuadas, no fabricar una tercera: cambiar formato o descartar.
- La correcta depende de la consigna: si las tres son buenas, no marcar como error elegir la segunda del motor.
- Una jugada puede ser sólida y tener una explicación equivocada; guardar resultados separados.
- El experto valida relaciones con el plan y posibles cambios de plan.

Filtrar ejercicios posicionales dominados por mate o ganancia material forzada en el horizonte analizado. Ese filtro no garantiza ausencia total de táctica; registrar horizonte y revisión pedagógica. Diferencias pequeñas e inestables no justifican una clasificación tajante.

## 6. Papel de Maia

Usar el adaptador HumanMoveModel. Proponer candidatas humanas y señales auxiliares de selección; nunca usar su evaluación como árbitro estratégico ni mezclar sus puntuaciones con Stockfish.

Si A es el conjunto validado de jugadas aceptables y existe distribución completa:

```text
acceptable_policy_mass(s,r) = sum(P_maia(m | s,r), m in A)
```

Es masa de probabilidad del modelo, no probabilidad calibrada de resolución del alumno. Si solo hay top-k, guardar cobertura y masa parcial; no normalizarla y presentarla como completa. Con cobertura desconocida, omitir el indicador completo.

Comparar masa aceptable y errores plausibles entre niveles puede ayudar a priorizar posiciones, pero no determina automáticamente dificultad ni garantiza monotonicidad. Registrar rating de ambos jugadores, checkpoint, versión, historial y configuración.

## 7. Planes y revisión humana

Reutilizar un PlanVersion con: diagnóstico, objetivo, objetivos intermedios, acciones candidatas, recursos rivales, concesiones, condiciones de revisión y autor/procedencia. Si el módulo de planes no existe, implementar solo una interfaz/referencia y snapshot mínimo compatibles; no sustituir su spec previa.

Cada candidata puede avanzar, preparar, proteger, transformar o contradecir el plan. Estas relaciones requieren definición por experto en el MVP. No son inferencias garantizadas del motor.

Rúbrica humana: diagnóstico, priorización, formulación de plan, consideración del rival, comparación, adaptación y justificación. Escala 0 ausente/incorrecto, 1 parcial, 2 adecuado, 3 sólido; null = no evaluado. Activar solo dimensiones pertinentes.

El esquema base admite revisión humana y trazabilidad. La interfaz de instructor, asignaciones y seguimiento pertenecen a PRO. Sin revisión, mostrar `pending_human_review`; no convertirlo en cero ni generar una nota estratégica automática.

## 8. Corrección automática táctica

Representar la solución como árbol/grafo de respuestas aceptadas con defensas y criterios terminales. Distinguir primera jugada correcta de secuencia completa. Evaluar transposiciones por estado/contexto cuando corresponda, no solo por coincidencia textual.

Si el alumno juega una alternativa legal fuera del árbol, iniciar verificación con motor; no declararla errónea solo por no coincidir. Durante verificación queda pendiente. Si no se puede resolver la ambigüedad, marcar `needs_review` y excluir del cálculo de acierto hasta resolverla.

Un ejercicio publicado automáticamente debe tener objetivo verificable, solución estable y defensas relevantes verificadas. Objetivos amplios como ventaja decisiva deben indicar umbral/criterio y horizonte; si no son robustos, requieren revisión. La explicación táctica en texto libre no se considera corregida por validar la variante.

## 9. Datos, API y estados

| Entidad | Campos mínimos |
|---|---|
| PositionContext | source_id/type, initial_fen, moves, history_complete, owner/access scope |
| AnalysisCase | position_id, plan_version_id?, student_diagnosis?, engine_evidence_ids, status |
| ExerciseVersion | exercise_id/version, position_id, family, objective, visibility, response_schema, accepted_moves/tree, rubric_version, difficulty_source, plan_version_id?, origin, validation_status |
| CandidateEvidence | move, engine_analysis_id, maia_prediction_id?, policy_mass?, plan_relationship?, reviewer_id? |
| Attempt | student_id, exercise_version_id, responses, variations, hints, timestamps, submitted_at |
| Assessment | attempt_id, kind=automatic/human, dimension, value?, evidence, version, supersedes_id? |

ExerciseVersion y Attempt son contratos compartidos con CI-INST-03: una sola implementación. Las revisiones no sobrescriben intentos ni evidencia.

Rutas conceptuales:
```text
POST /analysis-cases
POST /analysis-cases/{id}/run
POST /exercise-generation/jobs
GET  /exercise-generation/jobs/{id}
GET  /exercises/{id}/versions/{version}
POST /exercise-attempts
POST /exercise-attempts/{id}/submit
```

Generación: `queued/running/completed/partial/failed/cancelled`. Validación: `draft/auto_validated/pending_human_review/human_validated/rejected/retired`. Separar publicación de validación. Nunca enviar soluciones, objetivos ocultos o criterios privados en el DTO del alumno antes de la entrega permitida.

## 10. Aceptación y entrega

1. La misma posición admite ejercicio táctico y evaluación posicional con consignas independientes.
2. Tema/objetivo ocultos no aparecen en el payload del alumno.
3. Alternativa táctica válida puede aceptarse tras verificación; motor caído no produce fallo del alumno.
4. Elegir una de tres buenas jugadas no se penaliza por su ranking.
5. Texto libre y valoración de plan quedan pendientes hasta revisión humana.
6. Ausencia de Maia no bloquea generación basada en Stockfish; cobertura parcial no produce falsa probabilidad completa.
7. Mate y cp se mantienen separados, y se comprueba perspectiva para ambos colores.
8. Cambiar un plan o ejercicio crea versión nueva y no cambia la corrección histórica.
9. Casos ambiguos/inestables no se publican como soluciones ciertas.
10. Intentos emiten eventos versionados e idempotentes para CI-PROGRESS-04 sin requerir PRO para registrar datos propios.

Implementar primero análisis y contratos, luego generador táctico verificable, después propuestas posicionales/revisión manual y señales Maia. Evaluar selección con y sin Maia sobre posiciones nuevas comparables; medir transferencia y retención en el módulo PRO, no inferir utilidad educativa solo de concordancia con humanos.

Fuentes oficiales de capacidades Maia: https://github.com/CSSLab/maia3 y https://github.com/CSSLab/maia2 . Fijar versión y verificar API/licencia/pesos al implementar.
