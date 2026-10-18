# Spec MVP: análisis profundo de partidas con Stockfish en servidor

> **Supersedido para planificación:** ver [spec_analisis_profundo_unificado.md](./spec_analisis_profundo_unificado.md) (capacidad B). Este archivo se conserva como referencia histórica.

## 1. Objetivo

Permitir que el usuario seleccione partidas y solicite un análisis profundo ejecutado en el servidor con Stockfish nativo.

El análisis profundo debe:
- Revisar toda la partida.
- Recalcular evaluaciones y errores.
- Detectar episodios de pérdida o recuperación de ventaja.
- Actualizar los indicadores del filtro “Partidas para revisar”.
- Guardar resultados reproducibles y consultables desde el tablero.

El análisis liviano existente continúa disponible como mecanismo de selección inicial.

Fuera de alcance:
- Lc0 en esta implementación.
- LLM.
- Generación automática de ejercicios.
- Análisis dentro de una petición HTTP bloqueante.
- Cambios en los umbrales de errores existentes, salvo adaptación técnica necesaria.

## 2. Inspección previa

Antes de implementar:
1. Revisar backend, modelos, almacenamiento y ejecución actual de Stockfish.
2. Identificar si existe infraestructura de jobs o workers.
3. Reutilizar servicios de análisis, normalización y clasificación compatibles.
4. Revisar la integración con el listado y el tablero.
5. Adaptar esta spec a las convenciones del proyecto.

No introducir una nueva cola o framework si la infraestructura existente cubre el caso.

## 3. Flujo funcional

1. El usuario selecciona una o varias partidas.
2. Presiona “Analizar en servidor”.
3. El backend valida las partidas y crea trabajos persistentes.
4. Un worker ejecuta Stockfish nativo.
5. El frontend muestra progreso y estado.
6. Al finalizar, se guardan los resultados.
7. Se recalculan los indicadores pedagógicos con ese análisis.
8. El tablero permite consultar el análisis profundo.

El análisis profundo completo pasa a ser la fuente preferida para filtros y visualización. Conservar el análisis liviano y su procedencia.

Un trabajo incompleto o fallido no reemplaza un análisis completo anterior.

## 4. Arquitectura

Separar responsabilidades:

- API: validación, creación y consulta de trabajos.
- Worker: ejecución de trabajos fuera del proceso de atención HTTP.
- Adaptador UCI: comunicación con Stockfish.
- Servicio de análisis: recorrido de posiciones y evaluación de jugadas.
- Servicio de clasificación: errores según la política existente.
- Servicio pedagógico: indicadores y episodios deterministas.
- Persistencia: trabajos, perfiles y resultados.

Usar un proceso de Stockfish exclusivo por trabajo activo. No compartir simultáneamente una instancia entre partidas.

El frontend no inicia ni controla directamente el proceso del motor.

## 5. Perfil de análisis

Crear un perfil versionado, por ejemplo `server_deep_v1`.

Parámetros iniciales configurables:

| Parámetro | Valor inicial |
|---|---|
| Motor | Stockfish nativo, versión fijada |
| Threads por proceso | 1 |
| Hash | 256 MB |
| Presupuesto por búsqueda | 2 segundos |
| MultiPV general | 1 |
| MultiPV en posiciones críticas | Hasta 3 |
| Presupuesto adicional por posición crítica | 5 segundos |
| Concurrencia inicial | 1 trabajo |

Estos valores son un punto de partida operativo. Deben poder ajustarse sin modificar código.

“Profundo” describe este perfil frente al análisis liviano; no garantiza que todas las posiciones queden resueltas.

No exigir una profundidad fija como criterio único de finalización. Registrar la profundidad realmente alcanzada.

Limitar la concurrencia considerando CPU, memoria y carga de la API. No usar automáticamente todos los núcleos disponibles.

## 6. Preparación de la partida

- Validar el PGN y la legalidad de las jugadas.
- Soportar posición inicial definida por `SetUp` y `FEN`, si ya está soportada por el proyecto.
- Rechazar explícitamente variantes no soportadas.
- Construir la secuencia de posiciones desde el inicio real de la partida.
- Enviar al motor la posición inicial y las jugadas previas, conservando el historial.
- Identificar al jugador analizado para calcular indicadores propios/rival.
- Si no está identificado, permitir análisis numérico por color, pero no indicadores personales.

No evaluar únicamente FEN aisladas cuando el historial de la partida está disponible.

## 7. Evaluación de posiciones

Analizar:
- La posición inicial.
- Todas las posiciones posteriores a jugadas, excepto posiciones terminales que puedan resolverse mediante las reglas del juego.

Persistir por posición:
- Índice `ply`.
- Evaluación en centipawns o mate.
- Perspectiva original y evaluación normalizada.
- Mejor jugada y variante principal.
- Profundidad y seldepth, cuando estén disponibles.
- Nodos y tiempo real.
- WDL, si el motor lo proporciona.
- Estado de finalización de la búsqueda.

Usar internamente una perspectiva uniforme desde blancas. Convertir a perspectiva del jugador al calcular indicadores o mostrar resultados.

Guardar centipawns y mate en campos separados. No representar mate como un número arbitrario de centipawns.

## 8. Evaluación de cada jugada

Para cada jugada:
1. Obtener la evaluación de la mejor continuación desde la posición anterior.
2. Obtener la evaluación de la posición después de la jugada realizada.
3. Normalizar ambas desde la perspectiva del jugador que movió.
4. Calcular la pérdida estimada.
5. Aplicar la clasificación vigente del proyecto.

Para evaluaciones numéricas:

`loss_cp = max(0, best_before_cp - played_after_cp)`

Si la jugada realizada coincide con la mejor jugada encontrada antes de mover, asignar pérdida numérica 0 y registrar cualquier diferencia entre búsquedas como variación del análisis.

Si intervienen evaluaciones de mate, usar una política explícita de transición de mate compatible con el clasificador existente. No usar la fórmula numérica.

Antes de confirmar un mistake, blunder o cambio de ventaja:
- Reanalizar la posición anterior con mayor presupuesto.
- Evaluar también la jugada realizada mediante búsqueda restringida desde esa misma posición (`searchmoves`).
- Comparar ambos resultados con perspectiva uniforme y presupuestos equivalentes.
- Actualizar la clasificación con los resultados de verificación.

Esta verificación reduce errores causados por comparar búsquedas independientes.

La clasificación sigue siendo una estimación del motor con recursos limitados.

## 9. Segunda fase: posiciones críticas

Después del recorrido general, seleccionar posiciones anteriores a:
- Mistakes y blunders detectados provisionalmente.
- Pérdidas de ventaja.
- Recuperaciones por error rival.
- Cambios de superioridad a inferioridad o viceversa.

Deduplicar por posición dentro del trabajo.

En cada posición crítica:
- Ejecutar análisis con hasta 3 candidatas.
- Guardar evaluación y variante de cada candidata.
- Verificar la jugada realizada aunque no aparezca entre las candidatas.
- Recalcular el error y los eventos afectados.

No comparar directamente puntuaciones de candidatas obtenidas con presupuestos distintos.

Mantener coherencia entre la evaluación final de la jugada y la utilizada para clasificar el error. Registrar el origen y presupuesto de ambas.

## 10. Indicadores pedagógicos

Reutilizar las reglas del filtro “Partidas para revisar”:
- Cantidad de mistakes y blunders propios.
- Cantidad de mistakes y blunders del rival.
- Superioridad e inferioridad sostenidas.
- Ventaja desaprovechada.
- Recuperación por error rival.
- Error propio hacia posición perdedora sin recuperación posterior.
- Cambios de ventaja.

Recalcular los indicadores al finalizar la verificación.

Guardar:
- Identificador del análisis fuente.
- Versión de reglas.
- Parámetros utilizados.
- Jugadas asociadas a cada evento.

No mezclar evaluaciones del análisis liviano con las del profundo para construir una misma secuencia.

## 11. Estados del trabajo

Estados mínimos:
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Guardar:
- Fecha de creación, inicio y finalización.
- Fase actual: recorrido general o verificación.
- Unidades procesadas y total de la fase.
- Heartbeat del worker.
- Intentos.
- Motivo de fallo.
- Solicitud de cancelación.

El progreso debe indicar la fase y su avance. No presentar una estimación exacta de tiempo restante.

La cancelación debe detener el motor, liberar recursos y conservar el estado del trabajo.

## 12. Persistencia y deduplicación

Separar conceptualmente:
- Trabajo de ejecución.
- Análisis resultante.
- Resultados por posición/jugada.
- Candidatas en posiciones críticas.
- Indicadores pedagógicos.

Definir una huella de análisis basada en:
- Posición inicial y secuencia legal de jugadas.
- Versión/binario del motor y red NNUE utilizada.
- Perfil y opciones efectivas.
- Versión del algoritmo de análisis.

La identidad del jugador afecta los indicadores personales, pero no requiere repetir el cálculo del motor.

Si existe un trabajo equivalente en cola o ejecución, devolver ese trabajo.

Si existe un análisis completo equivalente, reutilizarlo salvo que se solicite explícitamente forzar un nuevo análisis.

Publicar el nuevo análisis como completo y preferido solo después de guardar todos sus resultados e indicadores.

## 13. API

Adaptar rutas y contratos al backend existente.

Operaciones necesarias:
- Crear trabajos para una lista de partidas.
- Consultar estado de uno o varios trabajos.
- Solicitar cancelación.
- Consultar análisis profundo de una partida.

La creación devuelve inmediatamente:
- Identificador de partida.
- Identificador de trabajo o análisis reutilizado.
- Estado.
- Indicación de reutilización, cuando corresponda.

Validar permisos sobre cada partida.

No aceptar desde el cliente comandos UCI arbitrarios ni rutas de ejecutables. El cliente selecciona perfiles autorizados por el servidor.

## 14. Frontend

Agregar:
- Acción “Analizar en servidor” sobre partidas seleccionadas.
- Estado por partida: en cola, analizando, completado, fallido o cancelado.
- Progreso por fase.
- Cancelación.
- Reintento de trabajos fallidos.
- Indicador de fuente activa: liviano o servidor.
- Acceso a candidatas y eventos críticos en el tablero.

Mostrar motor, perfil y fecha del análisis en los detalles.

Reutilizar polling o el mecanismo de actualización existente. No introducir WebSockets solo para esta funcionalidad.

## 15. Operación y recuperación

- Configurar ruta de Stockfish desde el servidor.
- Verificar disponibilidad del motor al iniciar el worker.
- Registrar la identificación y opciones reales del motor.
- Establecer timeout por búsqueda y por trabajo.
- Detener procesos que excedan los límites.
- Liberar Stockfish ante éxito, cancelación o excepción.
- Evitar trabajos duplicados mediante reclamación exclusiva del worker.
- Detectar trabajos `running` abandonados usando heartbeat.
- Reintentar fallos transitorios con límite configurable.
- No reintentar automáticamente PGN inválidos.

Si no existe soporte de checkpoints, reiniciar la partida completa al recuperar un trabajo. No mezclar resultados de intentos con configuraciones diferentes.

Registrar tiempos, fallos y consumo de trabajo sin guardar información sensible innecesaria.

## 16. Pruebas de aceptación

1. La API crea un trabajo y responde sin esperar el análisis.
2. El worker analiza todas las posiciones válidas.
3. La normalización de signos funciona para ambos colores.
4. La mejor jugada encontrada no recibe pérdida numérica por variaciones entre búsquedas.
5. Los errores graves provisionales se verifican desde la posición anterior.
6. La jugada realizada se verifica aunque quede fuera del MultiPV.
7. Las evaluaciones de mate no se convierten a centipawns ficticios.
8. Los indicadores usan exclusivamente el nuevo análisis.
9. Un análisis fallido no reemplaza uno completo.
10. Solicitudes equivalentes reutilizan trabajo o análisis.
11. La cancelación libera el proceso del motor.
12. Un timeout deja un fallo consultable y no un trabajo ejecutándose indefinidamente.
13. Un reinicio del worker permite recuperar trabajos abandonados.
14. Se conserva el historial y se soporta FEN inicial cuando corresponda.
15. Los filtros y el tablero usan el análisis profundo completo como fuente preferida.

Usar pruebas unitarias deterministas para reglas y jobs, con adaptador de motor simulado.

Agregar una prueba de integración corta con Stockfish real. No exigir una evaluación exacta en centipawns; verificar protocolo, estructura, signos y finalización.

## 17. Entregable

Implementar:
- Perfil de análisis versionado.
- Ejecución persistente en worker.
- Adaptador de Stockfish nativo.
- Análisis completo y verificación de posiciones críticas.
- Persistencia y deduplicación.
- Recalculo de indicadores pedagógicos.
- API e integración con listado y tablero.
- Pruebas y documentación de configuración.

Dejar una interfaz de resultados por motor que permita incorporar Lc0 posteriormente, sin implementarlo en esta etapa.