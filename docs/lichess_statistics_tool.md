# Implementar herramienta de estadísticas masivas de Lichess en ChessInsightAI

Roadmap de implementación (módulo LS01, epic aparte): [`docs/lichess_statistics/01_module_implementation_plan.md`](lichess_statistics/01_module_implementation_plan.md). Rama: `feature/lichess_statistics_tool`. Fuera de F07/F08 y de `ai_chess_coach_course`.

## Objetivo

Crear una herramienta local dentro del proyecto **ChessInsightAI** que descargue las partidas de un usuario de Lichess, obtenga o genere sus evaluaciones con Stockfish, calcule métricas estadísticas y exporte los resultados en un formato compatible con Excel.

La implementación debe integrarse con la arquitectura existente. Antes de modificar código, inspeccionar el repositorio para identificar:

- Estructura de módulos y herramientas.
- Modelos y servicios existentes para PGN.
- Integración actual con Stockfish.
- Configuración de SQLAlchemy.
- Base SQLite o PostgreSQL utilizada.
- Convenciones de logging, configuración y pruebas.
- Herramientas CLI existentes.

No duplicar componentes que ya existan.

## Alcance funcional

Implementar una herramienta ejecutable desde línea de comandos con una interfaz equivalente a:

```bash
python -m chessinsightai.tools.lichess_statistics \
  --username cmess4401 \
  --perf-type rapid \
  --since 2026-01-01 \
  --until 2026-12-31 \
  --database sqlite:///data/chessinsight.db \
  --output data/lichess_statistics.xlsx
 
```

Adaptar el nombre del módulo y la forma de ejecución a las convenciones reales del proyecto.

## Obtención de partidas

Consumir el endpoint oficial:

```http
GET https://lichess.org/api/games/user/{username}
```

Solicitar respuesta NDJSON:

```http
Accept: application/x-ndjson
```

Usar cuando corresponda:

```text
since
until
perfType
rated
clocks=true
evals=true
opening=true
```

Procesar la respuesta mediante streaming, sin cargar todo el historial en memoria.

Implementar:

- Timeout configurable.
- Reintentos con backoff.
- Si Lichess responde HTTP 429, esperar al menos 60 segundos.
- Identificación única mediante `GameId`.
- Descarga incremental.
- Exclusión de partidas ya procesadas.
- Registro de errores sin interrumpir todo el lote.
- Token opcional mediante variable de entorno, sin almacenarlo en código.
- Omitir partida con motores de AI de Lichess y de menos de 10 movidas en total.

## Datos básicos por partida

Guardar como mínimo:

```text
game_id
fecha
usuario
color
rival
resultado
ritmo
duracion_segundos
ranking_inicial
variacion_ranking
ranking_final
apertura
eco
cantidad_jugadas
pgn
fecha_analisis
fuente_evaluacion
version_stockfish
profundidad_stockfish
```

Calcular:

```text
ranking_final = ranking_inicial + variacion_ranking
```

El resultado desde el punto de vista del usuario debe almacenarse como:

```text
G
T
P
```



## Evaluación con Stockfish

Para cada partida:

1. Usar las evaluaciones descargadas de Lichess cuando estén disponibles y sean completas.
2. Si no existen o están incompletas, analizar localmente con Stockfish.
3. Registrar si la fuente fue `lichess` o `stockfish_local`.
4. Mantener una configuración uniforme para las partidas analizadas localmente.

Parámetros configurables:

```text
stockfish_path
depth
movetime_ms
threads
hash_mb
```

Normalizar todas las evaluaciones desde el punto de vista del usuario. Contemplar:

- Evaluaciones en centipeones.
- Mate a favor o en contra.
- Cambio de perspectiva entre blancas y negras.
- Promociones.
- Partidas incompletas.
- Abandono.
- Tablas.
- Pérdida por tiempo.



## Métricas requeridas

Calcular para el usuario:

```text
imprecisiones
errores
errores_graves
perdida_promedio_cp
precision_general
precision_apertura
precision_medio_juego
precision_final
```

No usar el promedio simple de las tres precisiones parciales para obtener la precisión general.

## Algoritmo de precisión

Reproducir el algoritmo público de Lichess:

[https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala](https://github.com/lichess-org/lila/blob/master/modules/analyse/src/main/AccuracyPercent.scala)

La implementación debe incluir:

1. Conversión de centipeones a probabilidad de victoria.
2. Cálculo de precisión de cada jugada según la reducción de probabilidad de victoria.
3. Media ponderada por volatilidad.
4. Media armónica.
5. Promedio de ambas para obtener la precisión general.
6. Aplicación independiente del mismo cálculo para apertura, medio juego y final.

Documentar en el código cualquier diferencia inevitable respecto de la implementación de Lichess.

## División por fases

Implementar un componente explícito para clasificar cada ply como:

```text
opening
middlegame
endgame
```

Prioridad:

1. Reutilizar una división por fases existente en ChessInsightAI.
2. Si no existe, portar el criterio utilizado por Lichess.
3. Mantener la clasificación desacoplada para poder reemplazarla posteriormente.

No dividir la partida usando únicamente números fijos de jugada salvo como fallback documentado.

## Persistencia

Crear o reutilizar tablas para:

### Partidas

Metadatos generales de cada partida.

### Evaluaciones

Una fila por ply con:

```text
game_id
ply
fen
move_uci
move_san
evaluation_before_cp
evaluation_after_cp
best_move
cp_loss
win_probability_before
win_probability_after
move_accuracy
judgment
phase
```



### Estadísticas

Una fila consolidada por usuario y partida con todas las métricas requeridas.

Agregar restricciones o índices para impedir duplicados por `game_id`.

Usar migraciones si el proyecto ya trabaja con Alembic u otra herramienta equivalente.

## Exportación

Generar:

```text
CSV
XLSX
```

El XLSX debe incluir una hoja llamada:

```text
Jugar en Lichess
```

Columnas, en este orden:

```text
Fecha
Partida
Ritmo
Duración
Rival
G/T/P
Ranking inicial
Imprecisiones
Errores
Errores graves
Pérdida prom. cp
Precisión
Precisión apertura
Precisión mediojuego
Precisión final
Ranking final
Comentarios
```

Las precisiones deben exportarse como valores numéricos entre 0 y 100.

El archivo debe poder abrirse en Excel y Google Sheets sin macros.

## Estadísticas agregadas

Incluir consultas o servicios para obtener:

- Evolución del ranking.
- Promedio de pérdida en centipeones.
- Promedio de precisión general.
- Promedio de precisión por fase.
- Cantidad de imprecisiones, errores y errores graves por partida.
- Resultados separados por blancas y negras.
- Resultados por apertura.
- Resultados por mes.
- Comparación entre períodos.
- Tendencia de las últimas N partidas.

No calcular promedios de precisión mezclando partidas sin registrar cantidad de partidas y período.

## CLI

Incluir comandos o parámetros para:

```text
descargar solamente
analizar solamente
procesar todo
reprocesar una partida
reprocesar un período
exportar sin volver a analizar
limitar cantidad de partidas
filtrar por ritmo
forzar Stockfish local
```

Ejemplos esperados:

```bash
python -m chessinsightai.tools.lichess_statistics sync \
  --username cmess4401 \
  --perf-type rapid
```

```bash
python -m chessinsightai.tools.lichess_statistics analyze \
  --username cmess4401 \
  --only-missing
```

```bash
python -m chessinsightai.tools.lichess_statistics export \
  --username cmess4401 \
  --output data/lichess_statistics.xlsx
```

Adaptar la sintaxis a la infraestructura CLI real.

## Diseño técnico

Separar responsabilidades:

```text
LichessClient
GameImportService
StockfishAnalysisService
PhaseClassifier
LichessAccuracyCalculator
GameStatisticsService
StatisticsRepository
ExcelStatisticsExporter
```

Usar interfaces o protocolos donde el proyecto ya siga ese criterio.

Evitar:

- Lógica de negocio dentro del comando CLI.
- Dependencias directas entre exportación y API.
- Consultas SQL dispersas.
- Valores de configuración hardcodeados.
- Reanalizar partidas sin necesidad.
- Usar scraping de la interfaz web de Lichess.



## Pruebas

Crear pruebas unitarias para:

- Conversión centipeones a probabilidad de victoria.
- Precisión de una jugada.
- Precisión general.
- Precisión por fases.
- Perspectiva de blancas y negras.
- Cálculo de ranking final.
- Clasificación G/T/P.
- Manejo de mate.
- Partidas sin análisis.
- Partidas parcialmente analizadas.
- Prevención de duplicados.
- Exportación de columnas.

Crear pruebas de integración con respuestas NDJSON guardadas como fixtures. No depender de la API real durante las pruebas automáticas.

Agregar al menos una partida fixture con valores esperados obtenidos de Lichess y comparar los resultados con una tolerancia documentada.

## Observabilidad

Registrar:

```text
partidas descargadas
partidas nuevas
partidas omitidas
partidas analizadas por Lichess
partidas analizadas localmente
partidas con error
tiempo total
tiempo promedio por partida
```

No registrar tokens ni información sensible.

## Entregables

1. Implementación completa.
2. Migraciones necesarias.
3. Pruebas unitarias y de integración.
4. Comando CLI documentado.
5. Ejemplo de configuración.
6. Ejemplo de exportación.
7. Documento breve con decisiones técnicas.
8. Lista de archivos creados y modificados.
9. Resultado de las pruebas y comandos utilizados.



## Criterios de aceptación

- La herramienta descarga partidas de `cmess4401`.
- Una segunda ejecución no duplica ni vuelve a analizar partidas completas.
- Las partidas sin evaluación de Lichess pueden analizarse con Stockfish local.
- Las métricas se calculan desde la perspectiva correcta del usuario.
- La precisión general no se obtiene promediando las fases.
- Las cuatro precisiones se exportan correctamente.
- El ranking inicial y final son correctos.
- El XLSX abre correctamente en Excel y Google Sheets.
- Las pruebas se ejecutan sin errores.
- No se rompe ninguna funcionalidad existente de ChessInsightAI.



## Procedimiento de implementación

Antes de escribir código:

1. Inspeccionar la arquitectura existente.
2. Enumerar los componentes reutilizables.
3. Presentar un plan de implementación por etapas.
4. Identificar cualquier decisión que no pueda resolverse examinando el repositorio.
5. Implementar en cambios pequeños y verificables.
6. Ejecutar las pruebas después de cada etapa relevante.
7. Entregar un resumen final con limitaciones conocidas.

