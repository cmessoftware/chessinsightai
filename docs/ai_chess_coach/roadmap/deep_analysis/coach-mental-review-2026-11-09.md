# Revisión con entrenador · modelo mental, críticas y candidatas

**Fecha prevista:** lunes 9 de noviembre de 2026. **Revisor:** entrenador, 2100 Elo FIDE, 25 años como instructor. **Estado:** protocolo preparado; sesión y feedback pendientes. No se atribuyen al entrenador valoraciones todavía no emitidas.

**Objetivo:** determinar si el módulo ayuda a un jugador intermedio a reconocer cuándo detenerse, proponer opciones razonables, calcular la respuesta rival y elegir con criterio. El Elo del instructor aporta experiencia de revisión; no sustituye evidencia de uso con alumnos.

**Tracker:** [issues de Coach](../designs/issues-coach-move-classification-pedagogy-mini-plan.md), FEAT-07 / MENT-BUG-01…07 / MENT-FEAT-01…08. **Gate existente:** [M-11](./coach-mental-1600-hitl-checklist.md). Fuente técnica revisada: `main` b7d18587, reglas `v1`. Registrar la versión realmente usada el lunes.

## 1. Material y límites

**Alcance vigente:** el modelo mental se usa para **rapid y ritmos más lentos** (clásicas y correspondencia). **Blitz y bullet quedan excluidos** de ejemplos, controles, calibración, métricas y validación pedagógica; tampoco se usan como complemento. Las partidas de torneo de los estudios públicos son **clásicas**: 45 minutos, 60 o más, según el torneo. El PGN exportado no trae el reloj numérico; no se inventa el control exacto de cada evento y no se las etiqueta como rapid.

[PGN de ejemplo](./coach-mental-review-2026-11-09.pgn). Cada partida es el capítulo publicado completo, con sus variantes y comentarios, tal como lo exporta el estudio. E1 sale de **Principio de Iniciativa**: Morphy–Duke of Brunswick (1858); C13, C14 y C15 repiten ese capítulo y marcan la posición a analizar. E2 sale de **Metodo de la eliminación y comparacion**: L'Ami–Vidit (2023), partida completa. Hay un ejemplo más por estudio en la [sección 9](#9-un-ejemplo-por-estudio-de-lichess). Legalidad de las FEN nuevas verificada con python-chess. No se ejecutó Stockfish para establecer mejores jugadas o evaluaciones.

El protocolo completo con ejemplos propios y FEN se entrega a Sergio por separado. Este documento público conserva el procedimiento, los temas de comparación y las referencias públicas, sin publicar los PGN propios ni sus metadatos. Los IDs P1–P3/C01–C16 son códigos del protocolo privado, sin enlace a partidas personales.

E1 no representa elite moderna y puede ser conocido de memoria. E2 es una sola partida completa. No son una muestra representativa. Completar con posición tranquila de medio juego y final de elite moderna elegidos por el instructor. Si reconoce un caso, anotarlo y excluirlo de medición ciega del alumno. El PGN de ejemplo conserva el resultado de cada capítulo publicado.

Los tags ReviewPOV/ReviewCorpus documentan intención; no se presupone que el importador los aplique. Cada caso trae el capítulo completo; el comentario inicial indica la posición a analizar.

## 2. Preparación antes de la reunión

1. Entrar por la raíz de ChessDash y usar el menú interno mientras BUG-098 siga abierto. Registrar fecha, beta/commit, reglas, navegador, dispositivo y disponibilidad del motor. No usar Reportes.
2. Preferir cuenta de prueba/biblioteca aislada. Guardar los originales y trabajar con copias de los ejemplos. No reasignar corpus en bloque en la biblioteca real mientras BUG-099 siga abierto; la separación P/E también está en los IDs del protocolo.
3. Importar el PGN de ejemplo: cinco capítulos publicados (C13–C15 repiten Morphy) más E3, E4 y E5. Comprobar jugadores, jugadas, variantes y FEN. Resolver duplicados antes de comparar. No lanzar Analizar todas.
4. Configurar explícitamente el POV según la tabla. Importar no garantiza que el tag ReviewPOV sea interpretado. Para un caso de negras seleccionar una jugada negra; verificar que la posición evaluada sea **la anterior a esa jugada** y que el turno de la FEN coincida.
5. Abrir Mental 1600. Para el recorrido ciego cubrir/ocultar PGN futuro, resultado, panel mental y motor; si la UI no permite ocultarlos, mostrar al instructor solo tablero o FEN fuera de la vista de esas salidas. Operador conoce el caso; revisor no ve la continuación.
6. Activar el análisis liviano desde Motor solo al llegar a la fase de contraste. Esperar evidencia de MultiPV terminado para ese FEN, anotar profundidad y fuente. Si no hay MultiPV, registrar no disponible; no contar ausencia como desacuerdo pedagógico. El fallo de estadísticas no impide esta revisión.

## 3. Sesión propuesta (60 minutos)

| Tiempo | Trabajo | Entregable |
| --- | --- | --- |
| 0–5 min | Acordar nivel objetivo y significado de crítica | Definición operativa del instructor |
| 5–30 min | Ocho casos ciegos: C04, C06, C08, C09, C11, C12, C14 y C16 | Juicio previo, 2–3 candidatas y mejor respuesta rival |
| 30–45 min | Revelar Mental y luego motor para esos casos | Coincidencias, omisiones, falsas alertas y candidatas descartadas |
| 45–55 min | Casos semánticos C14 y C15; revisar terminología, pausas y ayudas | Correcciones prioritarias |
| 55–60 min | Ordenar cambios y elegir casos nuevos tranquilos/estratégicos | Tres prioridades y plan de nueva validación |

Sesión inicial exploratoria. Completar C01–C16 después para la muestra de 16 decisiones, sin complementos de ritmos excluidos. La reunión por sí sola no cierra el gate M-11.

## 4. Procedimiento por posición, paso a paso

1. Cargar posición **antes de mover**, turno y POV. Conservar última jugada rival en el registro; no mostrar la jugada histórica objetivo ni sus continuaciones.
2. Sin ver el modelo ni el motor, registrar juicio del instructor: tranquila / requiere pausa / forzada, motivo concreto y dificultad para 1600–1800 rapid. Una posición forzada puede ser fácil; separar obligatoriedad de dificultad.
3. Instructor propone hasta tres candidatas SAN con idea y mejor respuesta rival que exigiría calcular. Puede aceptar una sola respuesta legal; no inventar tres por formato. Registrar también si falta contexto.
4. Sergio resuelve por separado: amenaza, candidatas, línea mínima, elección y tiempo usado. Conservar su primer intento, sin convertir el tiempo de la sesión en reloj real de la partida.
5. Revelar Mental 1600 y registrar modo, pausa, E*, evidencia, D*, orden y S*. Verificar posición/bando. Las alertas S* de la jugada hecha son retrospectivas y no deben contaminar el diagnóstico previo.
6. Revelar continuación histórica y motor, con scores comparables y profundidad registrada. Comparar respuestas rivales y planes; distinguir mala jugada, alternativa válida y diferencia de estilo. No equiparar primera PV a única candidata didáctica.
7. Clasificar desacuerdo: bug de posición/turno, omisión, falsa alerta, categoría errónea, explicación incompleta, falta de datos o preferencia pedagógica. Asignar ticket y evidencia FEN. Registrar también candidatas humanas ausentes de MultiPV sin darlas por malas.
8. Si hubo cambio de reglas, repetir los casos afectados y al menos un caso tranquilo y otro de negras. Guardar versión y resultado nuevo sin borrar la medición inicial.

**Prueba de fuga retrospectiva:** en una copia, conservar FEN y última jugada rival, variar solo la jugada elegida. El diagnóstico previo de criticidad debe mantenerse; la valoración posterior y S* pueden cambiar. Mientras no exista modo ejercicio independiente, registrar esta limitación del prototipo actual.

## 5. Posiciones seleccionadas

No se fijan de antemano modo ni candidatas correctas: los controles tranquilos también son hipótesis para contrastar. La columna de movimiento sirve al operador y se oculta al revisor en la fase ciega.

| Casos | Tipo | Qué contrastar |
| --- | --- | --- |
| C01–C05 | Propias rapid, POV negras; material privado | Cambios, ruptura central, seguridad del rey y respuesta a captura |
| C06–C09 | Propias rapid, POV blancas; material privado | Control tranquilo, decisión de peón, planes y recaptura |
| C10–C12 | Propias rapid; material privado | Desarrollo, iniciativa y estructura tras captura |
| C13 | E1 antes de 9.Bg5 | Desarrollo/iniciativa frente a capturas tentadoras |
| C14 | E1 antes de 10.Nxb5 | Sacrificio: material expuesto no prueba un error |
| C15 | E1 antes de 16.Qb8+ | Jaque con sacrificio: control negativo de S2 |
| C16 | E2 antes de 9.cxd5 | Resolver tensión central; discutir con el instructor |

Comparar recaptura/tensión, iniciativa, estructura y sacrificio por tema. No tratar estos grupos como pares de igual dificultad ni como experimento causal. El conjunto privado contiene 16 decisiones sin complemento blitz. Los cinco estudios públicos de la [sección 9](#9-un-ejemplo-por-estudio-de-lichess) suman un ejemplo cada uno; E1 y E2 ya están en C13 y C16.

## 6. Controles funcionales y bugs de biblioteca

| Control | Pasos | Resultado exigido / evidencia |
| --- | --- | --- |
| S2 y jaques | E1 antes de 16.Qb8+; revisar alerta tras esa jugada legal | Dar jaque al rival no equivale a dejar el rey propio en jaque |
| Contexto anterior | Comparar un caso propio del material privado por PGN y por FEN aislada | Última captura reconocida en PGN; en FEN sin historia declarar contexto ausente |
| Negras / giro | Repetir C04 con tablero girado | Mismo FEN, turno y diagnóstico; solo cambia orientación |
| MultiPV | Misma posición con 1 y con 3 PV; mantener scores registrados | Tres PV configuradas no prueban que sean cercanas o igualmente razonables |
| Cache / ramas | Ir y volver entre dos posiciones y una variante | Sin candidatas o scores de otro FEN/POV; registrar path de variante |
| Sin motor | Desactivar motor y abrir caso nuevo | Triggers basados en tablero identificables; no disponible para datos que requieren motor |
| Selección vacía | En copia de biblioteca, entrar en Partidas sin marcar filas | No hay edición masiva habilitada ni selección implícita para edición |
| Solo dos filas | En copia con >20 partidas, limpiar toda selección, marcar dos, cambiar categoría y luego corpus en ensayos separados | Exactamente dos IDs modificados; comparar todos los IDs previos/posteriores, también páginas ocultas |
| Selección por página | Marcar página 1, ir a 2, ordenar, filtrar y esperar refresco | Alcance total visible; no aparecen nuevas selecciones silenciosas. Checkbox de página no se confunde con limpiar todo |
| Dos tipos de cambio | Categoría local y corpus persistido probados por separado | Identificar persistencia y borrado de overrides; no atribuir cambio manual a clasificador automático |

La prueba masiva es un procedimiento pendiente: no se ejecutó contra datos de producción durante esta actualización. Capturar IDs de request/respuesta y estados anteriores para reversión del lote; no restaurar todas las partidas a personal por su nombre o Elo.

## 7. Registro de feedback

| Caso / FEN / rama | Juicio ciego instructor y motivo | Candidatas humanas SAN + respuesta rival | Intento de Sergio / tiempo | Modo UI / E* / D* / S* | Motor / depth / fuente | Acuerdo / causa | Ticket / decisión |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pendiente de sesión | | | | | | | |

Registrar criticidad y calidad de candidatas por separado. El instructor también define vocabulario adecuado, cantidad de información y utilidad del modo rápido. No convertir su feedback en una nota global inventada.

**Resumen de cierre a completar:** N revisadas propias/elite y rapid/clásicas/correspondencia; N críticas humanas detectadas; N omitidas; N tranquilas con falsa alarma; candidatas humanas útiles cubiertas/omitidas; explicación suficiente/incompleta; casos sin datos. Informar conteos con denominador y estrato. No promediar todo en una única nota.

**Cierre técnico:** MENT-BUG P0 resueltos con regresión, FEN/POV y contexto consistentes, ninguna alerta S2 por dar jaque. **Cierre pedagógico:** al menos 15 decisiones, tres partidas rapid propias, controles fast/critical revisados y desacuerdos con acción; mantener los restantes requisitos M-11. Una muestra seleccionada y un instructor producen evidencia exploratoria, no una precisión poblacional.

## 8. FEN públicas verificadas para reproducir

La FEN aislada no contiene la última jugada rival. Usar PGN cuando el trigger dependa de historia. Las FEN propias se conservan únicamente en el material privado.

### C13 · E1 · antes de 9.Bg5

Estudio **Principio de Iniciativa**, capítulo Morphy–Duke of Brunswick. [Capítulo](https://lichess.org/study/0DIi9xBK/g4XCL2I5).

```text
rn2kb1r/pp2qppp/2p2n2/4p3/2B1P3/1QN5/PPP2PPP/R1B1K2R w KQkq - 0 9
```

### C14 · E1 · antes de 10.Nxb5

```text
rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10
```

### C15 · E1 · antes de 16.Qb8+

```text
4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16
```

### C16 · E2 · antes de 9.cxd5

Estudio **Metodo de la eliminación y comparacion**, capítulo L'Ami–Vidit. [Capítulo](https://lichess.org/study/MAjiqRfC/a4uWaS04).

```text
r1bqr1k1/ppp2ppp/2n1pn2/3p4/2PP4/P1Q1P3/1P2NPPP/R1B1KB1R w KQ - 0 9
```

## 9. Un ejemplo por estudio de Lichess

Un capítulo público de cada estudio. El título es el `StudyName` exportado por Lichess. La jugada indicada es la de la partida, para el operador; en la fase ciega no se muestra. Estas posiciones no sustituyen C01–C12, que son las rapid propias. E2, E3 y E4 son clásicas de torneo: 45 minutos, 60 o más, según el evento, y por eso entran en el modelo mental. E1 es una clásica histórica de referencia, sin reloj moderno en el PGN. E5 es la única cuyo nombre de evento ya dice rapid.

| Id | Estudio | Capítulo | Antes de | Qué contrastar |
| --- | --- | --- | --- | --- |
| E3 | [Errores en las aperturas](https://lichess.org/study/KM1VdlIZ/3NTHt2nW) | Saemisch–Capablanca, Karlsbad 1929 | 9...Aa6 | Error de pieza en la apertura, con el turno de las negras |
| E1 | [Principio de Iniciativa](https://lichess.org/study/0DIi9xBK/g4XCL2I5) | Morphy–Duke of Brunswick, 1858 | 9.Ag5 | Ya es C13. Iniciativa frente a una captura tentadora |
| E2 | [Metodo de la eliminación y comparacion](https://lichess.org/study/MAjiqRfC/a4uWaS04) | L'Ami–Vidit, Grand Swiss 2023 | 9.cxd5 | Ya es C16. Comparar si se resuelve o se mantiene la tensión |
| E4 | [Posiciones con centro abierto y cerrado](https://lichess.org/study/B7MMty6b/PW3dVLRL) | Amonatov–Rakhmanov, Moscú 2007 | 16...c5 | Decidir si se abre el centro |
| E5 | [Ejecución de Planes](https://lichess.org/study/CUexpH0y/UXWWnSnW) | Harikrishna–Caruana, Saint Louis rapid 2019 | 15.d4 | Ejecutar la ruptura central. El PGN copia el capítulo publicado, que termina en 22...c5 e incluye la variante 22.Bf3 |

### E3 · Errores en las aperturas · antes de 9...Aa6

```text
r1bqk2r/p1p2ppp/1pnp1n2/4p3/2PPP3/P1PBBP2/6PP/R2QK1NR b KQkq - 1 9
```

### E4 · Posiciones con centro abierto y cerrado · antes de 16...c5

```text
r2q1rk1/pp2bpp1/2p1bn1p/3n4/3P4/2NB1N1P/PP1B1PP1/R2QR1K1 b - - 1 16
```

### E5 · Ejecución de Planes · antes de 15.d4

```text
r3rbk1/1pp2ppp/2nqb3/p3p3/Q3P3/2BP1NP1/PP3PBP/R2R2K1 w - - 1 15
```

