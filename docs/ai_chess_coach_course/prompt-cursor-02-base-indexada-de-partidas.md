# Prompt para Cursor 02 — Base indexada de partidas y recuperación de modelos temáticos

## Rol

Actuá como arquitecto de datos y desarrollador senior de ChessInsight. Extendé el sistema existente para importar fuentes PGN autorizadas, indexar partidas y posiciones, y recuperar partidas modelo que enseñen correctamente una debilidad táctica o estratégica detectada en el usuario.

No implementes scraping nuevo. No importes Mega Database, CT-ART ni otras bases comerciales. La ingestión debe aceptar únicamente archivos o fuentes cuya licencia y procedencia estén registradas.

## Contexto técnico

El proyecto utiliza o prevé:

- Python;
- FastAPI;
- Streamlit;
- PostgreSQL 13+;
- SQLAlchemy;
- Stockfish 17.1;
- PGN como formato principal;
- clasificación de errores y temas;
- generación de puzzles y recomendaciones.

La base inicial puede componerse de:

- partidas y broadcasts de Lichess con licencia CC0;
- partidas propias del usuario;
- PGN de torneos previamente descargados cuya licencia se haya auditado;
- otras fuentes explícitamente autorizadas.

TWIC y fuentes sin licencia clara deben quedar deshabilitadas para ingestión productiva hasta contar con autorización documentada.

## Forma de trabajo obligatoria

1. Inspeccioná el repositorio y detectá modelos, importadores PGN, jobs, almacenamiento, servicio Stockfish, API y UI existentes.
2. Presentá inventario de componentes reutilizables, brechas y archivos a modificar.
3. Proponé etapas pequeñas que puedan implementarse en ramas secuenciales.
4. Conservá compatibilidad con los datos existentes.
5. No realices refactors ajenos a esta feature.
6. Si ya existe funcionalidad equivalente, extendela; no la dupliques.

## Objetivo funcional

El sistema debe:

1. Registrar la procedencia y licencia de cada corpus.
2. Importar PGN en lotes de manera idempotente.
3. Normalizar y deduplicar partidas.
4. Indexar posiciones exactas y sus apariciones.
5. Calcular firmas posicionales para similitud estructural.
6. Relacionar posiciones con temas tácticos y estratégicos.
7. Buscar ejemplos de alta calidad para una debilidad del usuario.
8. Rankear las partidas modelo por similitud, calidad y claridad pedagógica.
9. Entregar la partida completa y el momento instructivo sin copiar comentarios protegidos.

## Control de procedencia y licencia

Crear un registro obligatorio de fuente con equivalentes de:

```text
source_code
source_name
source_url
license_code
license_url
commercial_use_allowed
redistribution_allowed
annotations_allowed
ingestion_status
terms_snapshot_date
notes
```

Cada lote importado debe registrar:

```text
source_id
original_filename
downloaded_at
sha256
import_started_at
import_finished_at
total_games
accepted_games
rejected_games
duplicate_games
parser_version
```

Reglas:

- rechazar fuentes sin procedencia;
- impedir por defecto la ingestión productiva cuando `ingestion_status != approved`;
- separar jugadas objetivas de comentarios y variantes editoriales;
- permitir eliminar comentarios durante la importación;
- no exponer descarga masiva del corpus;
- conservar atribución y vínculo a la fuente cuando corresponda.

## Modelo de datos

Adaptar nombres al esquema actual. Deben existir equivalentes conceptuales de:

- `GameSource`;
- `ImportBatch`;
- `ReferenceGame`;
- `ReferenceGamePosition`;
- `CanonicalPosition`;
- `PositionSignature`;
- `PositionTheme`;
- `ModelGameMatch` o resultados calculables.

### Partida

Guardar como mínimo:

- jugadores;
- Elo si existe;
- evento;
- fecha;
- ronda;
- resultado;
- ECO y apertura si están disponibles;
- control de tiempo;
- secuencia SAN o movetext limpio;
- hash canónico de la partida;
- fuente y lote;
- indicadores de calidad de metadatos;
- indicador de comentarios eliminados.

### Posición canónica

Guardar:

- FEN normalizada;
- hash Zobrist de 64 bits o representación compatible con PostgreSQL;
- lado al turno;
- derechos de enroque;
- casilla en passant relevante;
- firma de material;
- firma de peones;
- fase;
- evaluación almacenada, si existe;
- versión del generador del hash.

El hash Zobrist es para localizar posiciones exactas y deduplicar, no para inferir similitud. Verificar siempre la FEN normalizada ante una coincidencia de hash para protegerse contra colisiones.

### Aparición de posición

Relacionar posición y partida con:

- ply;
- jugada que condujo a la posición;
- jugada siguiente;
- reloj si existe;
- evaluación antes/después si existe;
- temas detectados;
- resultado final.

## Normalización y deduplicación

Implementar:

- validación PGN tolerante con informe de errores;
- normalización de nombres y fechas sin perder el valor original;
- hash canónico de movetext y posición inicial;
- detección de partidas duplicadas aunque difieran comentarios o formato;
- restricciones e índices adecuados;
- importación reanudable e idempotente;
- cuarentena para partidas inválidas.

No deduplicar solamente por jugadores, fecha y resultado.

## Índices PostgreSQL

Diseñar y justificar índices para:

- hash de partida;
- Zobrist hash más FEN;
- ECO;
- fecha;
- Elo;
- fuente;
- tema;
- firma de peones y material;
- filtros combinados usados por la búsqueda.

Usar particionado solamente si las mediciones lo justifican. Evitar complejidad prematura para un corpus inicial de 100.000 a 500.000 partidas.

## Firma posicional

Implementar una firma interpretable y versionada que permita comparar posiciones similares. Incluir, según disponibilidad:

- estructura de peones por ala y centro;
- ubicación y seguridad de ambos reyes;
- lados de enroque;
- material y desequilibrios;
- piezas menores relevantes;
- columnas abiertas y semiabiertas;
- diagonales hacia el rey;
- espacio;
- peones pasados;
- cantidad de atacantes y defensores en zonas críticas;
- apertura/ECO;
- fase;
- temas detectados.

No depender exclusivamente de embeddings. Comenzar por características explícitas y una distancia ponderada. Si `pgvector` ya existe en el proyecto, puede añadirse como señal secundaria y explicable.

## Caso de referencia: avalancha contra el Dragón

La búsqueda debe poder expresar una consulta aproximada como:

```text
- estructura de Siciliana Dragón o transposición equivalente;
- negras con fianchetto en g7 y rey enrocado corto;
- blancas enrocadas largo o con intención clara de hacerlo;
- peones blancos f3, g y h avanzando;
- posibilidad temática de h5, g5 o Bh6;
- centro suficientemente estable;
- atención a la ruptura negra ...d5;
- evaluación de si g5 fue correcta, preparada o prematura.
```

El sistema debe poder devolver ejemplos contrastivos:

- `g5!` ejecutada en el momento correcto;
- `g5?` prematura;
- preparación correcta antes de `g5`;
- posición donde el ataque lateral debía posponerse por una ruptura central.

No inferir la corrección por el resultado final de la partida. Validar el momento crítico con Stockfish y señales estructurales.

## Recuperación y ranking de partidas modelo

Crear una consulta de alto nivel que reciba:

```json
{
  "user_id": "...",
  "theme_code": "pawn_storm_vs_fianchetto",
  "reference_position_id": "...",
  "filters": {
    "min_player_elo": 2400,
    "colors": ["white"],
    "date_from": null,
    "eco": ["B70", "B71", "B72", "B73", "B74", "B75", "B76", "B77", "B78", "B79"]
  },
  "limit": 10
}
```

Rankear usando una fórmula documentada y configurable:

- similitud posicional;
- coincidencia temática;
- calidad de la ejecución según motor;
- claridad del punto instructivo;
- fuerza de los jugadores;
- calidad de metadatos;
- diversidad respecto de resultados ya seleccionados;
- penalización por variantes demasiado forzadas o irrelevantes para el tema.

Aplicar diversidad para no devolver diez partidas casi idénticas del mismo jugador o variante.

Cada resultado debe explicar por qué fue seleccionado:

```json
{
  "similarity": 0.84,
  "theme_match": 0.91,
  "execution_quality": 0.88,
  "instructional_clarity": 0.79,
  "critical_ply": 31,
  "reasons": [
    "enroques opuestos",
    "fianchetto negro en g7",
    "h5 preparó la apertura de la columna h",
    "g5 mantuvo la ventaja según Stockfish"
  ]
}
```

## Uso de Stockfish

- Reutilizar evaluaciones existentes.
- Analizar solamente candidatos prefiltrados.
- Ejecutar análisis en jobs, nunca en la solicitud interactiva.
- Configurar profundidad, nodos y MultiPV.
- Guardar versión del motor y parámetros.
- Normalizar siempre la evaluación desde el punto de vista del jugador relevante.
- Manejar mates separadamente de centipawns.

## API

Integrar endpoints siguiendo las convenciones existentes para:

- registrar y consultar fuentes;
- crear y monitorear importaciones;
- obtener estadísticas del corpus;
- buscar posición exacta;
- buscar posiciones similares;
- recuperar partidas modelo para un tema o una posición crítica;
- obtener explicación del ranking;
- consultar partida y momento crítico.

Aplicar paginación, autorización, límites de consulta y validación estricta.

## Streamlit

Crear o extender una vista con:

- selector de debilidad del usuario;
- filtros de Elo, fecha, ECO, color y fuente;
- lista de partidas modelo;
- tablero en el momento crítico;
- comparación entre posición propia y modelo;
- explicación de similitud;
- reproducción de la partida;
- distinción visual entre ejemplo positivo y contraste negativo;
- atribución y enlace a la fuente.

No mostrar comentarios originales importados salvo que la licencia lo permita expresamente.

## Jobs y escalabilidad

La importación debe trabajar por streaming y lotes, sin cargar PGN completos en memoria. Incorporar:

- checkpoints;
- reanudación;
- progreso;
- conteo de errores;
- backpressure;
- límites configurables;
- cancelación segura si la infraestructura existente la admite.

Preparar tareas separadas para:

1. parseo y deduplicación;
2. indexación de posiciones;
3. generación de firmas;
4. etiquetado temático;
5. análisis Stockfish selectivo.

## Pruebas obligatorias

Agregar pruebas para:

- PGN normal y malformado;
- importación idempotente;
- deduplicación sin considerar comentarios;
- conservación de procedencia;
- bloqueo de fuentes no aprobadas;
- stripping de comentarios y variantes;
- hash exacto y verificación ante colisión simulada;
- transposiciones que alcanzan la misma posición;
- posiciones similares con hashes distintos;
- orientación de evaluación;
- búsqueda temática del ejemplo Dragón;
- ranking, diversidad y filtros;
- aislamiento y autorización;
- rendimiento básico sobre un fixture mediano.

Usar fixtures propios o con licencia abierta claramente indicada.

## Observabilidad

Añadir métricas y logs estructurados:

- partidas por segundo;
- posiciones por segundo;
- duplicados;
- errores de parseo;
- candidatos prefiltrados;
- análisis Stockfish ejecutados y reutilizados;
- duración de consultas;
- distribución de scores;
- fuente y lote implicados.

No registrar PGN completos en logs.

## Criterios de aceptación

La feature se considera terminada cuando:

1. Puede importarse idempotentemente un corpus PGN aprobado.
2. Cada partida conserva procedencia y licencia.
3. Posiciones idénticas se reutilizan y las colisiones se verifican con FEN.
4. Posiciones similares pueden encontrarse mediante características explicables.
5. Una debilidad del usuario devuelve partidas modelo rankeadas con razones.
6. El caso de avalancha contra el Dragón produce ejemplos positivos y contrastivos.
7. La UI reproduce el momento crítico y la partida completa.
8. No se copian comentarios ni contenido de bases propietarias.
9. Migraciones, pruebas y linters pasan.
10. Se documentan fuentes admitidas, fórmula de ranking, límites y operación de los jobs.

## Entregables

- código y migraciones;
- importador y jobs;
- índices y consultas;
- API y UI mínima;
- pruebas automatizadas;
- documentación de procedencia/licencias;
- benchmark sobre un corpus de prueba;
- resumen de archivos modificados;
- comandos ejecutados y resultados;
- riesgos y tareas posteriores separados de lo implementado.

