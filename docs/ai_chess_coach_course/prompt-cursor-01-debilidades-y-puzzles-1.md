# Prompt para Cursor 01 — Diagnóstico temático, ranking de debilidades y puzzles personalizados

## Rol

Actuá como arquitecto y desarrollador senior de ChessInsight. Trabajá sobre el repositorio existente, respetando su arquitectura, convenciones, pruebas y componentes ya implementados. No reemplaces módulos funcionales ni introduzcas frameworks nuevos sin necesidad demostrable.

## Contexto del producto

ChessInsight procesa partidas PGN y ya contempla, total o parcialmente:

- backend en Python/FastAPI;
- interfaz React + Vite;
- PostgreSQL mediante SQLAlchemy;
- análisis con Stockfish 17.1;
- métricas por partida y por fase;
- clasificación de jugadas en `good`, `inaccuracy`, `mistake` y `blunder`;
- pérdida de centipawns;
- componentes de explicación, SHAP, generación táctica y cursos.

La nueva feature debe convertir las posiciones críticas de las partidas del usuario en un diagnóstico temático acumulado, rankear sus puntos débiles y generar una cola de ejercicios personalizados. La taxonomía táctica se basará conceptualmente en la organización didáctica de CT-ART, pero no debe copiar ejercicios, textos, soluciones ni contenido propietario.

## Forma de trabajo obligatoria

1. Inspeccioná primero el repositorio completo y localizá:
   - modelos SQLAlchemy y migraciones;
   - parser PGN y representación de posiciones;
   - servicio de Stockfish;
   - cálculo de pérdida de centipawns y fases;
   - endpoints FastAPI;
   - pantallas React + Vite;
   - pruebas existentes;
   - configuración mediante variables de entorno.
2. Presentá un breve inventario de lo reutilizable, brechas encontradas y archivos que planeás modificar.
3. Proponé una implementación dividida en commits o etapas pequeñas y verificables.
4. Esperá confirmación antes de escribir código si encontrás una incompatibilidad arquitectónica importante. En caso contrario, implementá la feature de extremo a extremo.
5. No mezcles esta feature con refactors generales no requeridos.

## Objetivo funcional

Para cada decisión relevante del jugador se debe poder almacenar y analizar:

- partida y número de ply;
- FEN anterior a la jugada;
- jugada realizada;
- mejor jugada del motor;
- evaluación anterior y posterior desde el punto de vista del jugador;
- pérdida de centipawns normalizada;
- fase: apertura, medio juego o final;
- variantes principales del motor;
- temas detectados;
- confianza de cada etiqueta;
- si el tema representó una oportunidad, un acierto o un fallo.

Luego se debe producir un ranking de debilidades por usuario y período.

## Taxonomía inicial

Crear una taxonomía jerárquica, extensible y versionada. Usar identificadores internos propios y nombres localizables.

### Táctica

- ataque doble;
- clavada;
- ataque descubierto;
- rayos X;
- desviación;
- atracción;
- eliminación del defensor;
- sobrecarga;
- interferencia;
- despeje de línea o casilla;
- bloqueo;
- jugada intermedia;
- pieza atrapada;
- demolición de la defensa del rey;
- sacrificio de calidad;
- promoción;
- red de mate;
- defensa táctica.

### Cálculo

- jaque omitido;
- captura omitida;
- amenaza directa omitida;
- recaptura incorrecta;
- jugada única no encontrada;
- cálculo interrumpido prematuramente;
- error de orden de jugadas;
- fallo al evaluar la posición resultante.

### Estrategia dinámica

- ruptura central;
- ruptura lateral;
- ataque contra fianchetto;
- avalancha de peones;
- ataques en flancos opuestos;
- apertura de columnas;
- pieza atacante faltante;
- contrajuego central;
- momento incorrecto de una ruptura.

La taxonomía debe admitir múltiples etiquetas por posición y relaciones padre-hijo. No afirmar que una etiqueta proviene oficialmente de CT-ART ni usar sus textos.

## Detección de temas

Implementar un pipeline híbrido:

1. Reglas deterministas sobre tablero y secuencia de jugadas.
2. Comparación entre jugada realizada, mejores variantes y respuestas defensivas.
3. Características estructurales: material, seguridad del rey, estructura de peones, líneas abiertas, atacantes y defensores.
4. Clasificador existente, si el repositorio ya contiene uno adecuado.
5. LLM únicamente para explicación o desempate, nunca como única fuente de la etiqueta.

Cada detección debe ser trazable:

```json
{
  "theme_code": "remove_defender",
  "confidence": 0.87,
  "detector": "rule",
  "detector_version": "1.0",
  "evidence": {
    "defender_square": "f6",
    "target_square": "h7",
    "best_move": "Bxf6"
  }
}
```

No etiquetar por palabras generadas por el LLM sin evidencia ajedrecística estructurada.

## Oportunidades, aciertos y fallos

No calcular la tasa de error usando solamente los fallos. Para cada tema distinguir:

- `opportunity`: el tema estaba disponible en la posición;
- `success`: el jugador lo ejecutó correctamente;
- `failure`: no lo ejecutó o eligió una implementación incorrecta;
- `not_applicable`: la etiqueta describe la posición, pero no existía una decisión temática razonable.

Una oportunidad debe exigir evidencia verificable en la variante del motor o en las reglas temáticas.

## Ranking de debilidades

Implementar una puntuación configurable de 0 a 100 basada en:

- tasa de fallos sobre oportunidades;
- severidad de la pérdida de centipawns, usando winsorización o transformación logarítmica para evitar valores extremos;
- frecuencia mínima;
- recencia con decaimiento temporal;
- importancia de la posición;
- confianza de detección;
- regularización por tamaño de muestra.

Usar una aproximación beta-binomial o equivalente para impedir que dos fallos sobre dos oportunidades aparezcan automáticamente por encima de quince fallos sobre cuarenta oportunidades. Documentar la fórmula exacta, parámetros predeterminados y ejemplos numéricos.

Clasificación inicial configurable:

- `70–100`: prioridad alta;
- `50–69.99`: requiere entrenamiento;
- `30–49.99`: observación;
- `<30`: desempeño aceptable.

Exponer por tema:

- oportunidades;
- aciertos;
- fallos;
- tasa regularizada;
- pérdida media y mediana;
- puntuación de debilidad;
- confianza estadística;
- tendencia respecto del período anterior;
- fase y apertura donde más aparece.

## Generación de puzzles

Generar primero ejercicios desde partidas propias:

1. La posición mostrada debe ser anterior a la decisión crítica.
2. La solución comienza con la mejor jugada del usuario de turno.
3. Guardar una PV principal y alternativas aceptables.
4. Rechazar posiciones sin una solución suficientemente clara.
5. Validar legalidad y evaluación con Stockfish.
6. Evitar duplicados por posición normalizada y hash.
7. Conservar vínculo con partida, jugada, tema y debilidad.
8. Generar una explicación propia y breve basada en evidencia.

Crear estados de entrenamiento:

- pendiente;
- presentado;
- acertado;
- fallado;
- dominado;
- suspendido.

Registrar tiempo, primera jugada, cantidad de intentos y resultado. Preparar el modelo para repetición espaciada, sin implementar un algoritmo complejo si todavía no existe infraestructura para ello.

## Integración opcional con Chess King

Crear un catálogo de recursos externos sin copiar contenido:

```text
internal_theme_code
provider
course_name
section_name
external_url
requires_purchase
locale
active
```

Para una debilidad detectada, la UI puede mostrar el capítulo correspondiente de CT-ART/Chess King. ChessInsight solo redirige; no comprueba licencias, no embebe ejercicios y no afirma que exista un enlace profundo si la plataforma no lo ofrece.

## Modelo de datos

Adaptar nombres y relaciones al esquema existente. Como mínimo deben existir equivalentes conceptuales de:

- `ThemeDefinition`;
- `PositionThemeDetection`;
- `ThemeOpportunity`;
- `UserThemeScore` o una vista/materialización recalculable;
- `TrainingPuzzle`;
- `PuzzleAttempt`;
- `ExternalTrainingResource`.

Incluir:

- claves foráneas e índices;
- restricciones de unicidad razonables;
- versionado de detectores y fórmula;
- timestamps UTC;
- migración reversible;
- estrategia de recalculado sin duplicar registros.

No guardar datos derivados redundantes si el costo de cálculo es bajo. Si se materializan rankings, documentar cuándo se invalidan.

## API

Integrar endpoints siguiendo las convenciones existentes. Funcionalidad mínima:

- listar taxonomía;
- ejecutar o consultar etiquetado de una partida;
- obtener ranking de debilidades con filtros por fechas, fase, apertura y color;
- consultar evidencia y posiciones de un tema;
- generar y recuperar puzzles personalizados;
- registrar intentos;
- consultar recursos externos relacionados.

Agregar paginación, validación, manejo consistente de errores y aislamiento por usuario.

## React + Vite

Agregar una vista simple y funcional:

- tabla de debilidades ordenable;
- selector de período;
- filtros por fase, apertura y color;
- detalle de un tema con evolución y ejemplos propios;
- botón para crear sesión de práctica;
- tablero del puzzle utilizando el componente existente;
- vínculo claramente identificado hacia Chess King cuando exista un recurso configurado.

No reconstruir el tablero si ya existe un componente reutilizable.

## Pruebas obligatorias

Agregar pruebas unitarias e integración para:

- reglas tácticas representativas;
- múltiples temas en una posición;
- orientación correcta de evaluaciones para blancas y negras;
- cálculo de pérdida de centipawns y mate;
- regularización del ranking con muestras pequeñas;
- decaimiento temporal;
- idempotencia del etiquetado;
- deduplicación de puzzles;
- legalidad de soluciones;
- autorización entre usuarios;
- migración y constraints;
- endpoints principales.

Crear fixtures PGN/FEN pequeños y propios. No copiar ejercicios CT-ART.

## Rendimiento y observabilidad

- Procesar partidas en lotes.
- Reutilizar análisis Stockfish ya almacenados.
- Evitar ejecutar el motor durante consultas de UI.
- Añadir logs estructurados con IDs de usuario, partida y tarea, sin datos sensibles.
- Medir duración, posiciones analizadas, errores y cache hits.
- Preparar el procesamiento pesado para el mecanismo de jobs existente.

## Criterios de aceptación

La feature se considera terminada cuando:

1. Una partida importada produce posiciones temáticamente etiquetadas con evidencia.
2. El usuario obtiene un ranking reproducible y explicable.
3. Los temas con muestras pequeñas aparecen con confianza limitada.
4. Desde una debilidad pueden generarse puzzles propios válidos.
5. Los intentos modifican el historial de entrenamiento sin alterar el diagnóstico histórico.
6. Puede configurarse un recurso externo de Chess King sin almacenar contenido propietario.
7. Las migraciones, pruebas y linters pasan.
8. Se documentan fórmula, límites conocidos y procedimiento de recalculado.

## Entregables

- código y migraciones;
- pruebas automatizadas;
- documentación técnica breve;
- ejemplo de configuración;
- resumen de archivos modificados;
- comandos ejecutados y resultados;
- riesgos o tareas posteriores claramente separadas.

