# ChessInsight: clasificación de jugadas e importancia pedagógica

## Objetivo

Separar tres conceptos:

1. **Calidad de la jugada:** pérdida de evaluación respecto de la mejor alternativa.
2. **Impacto del error:** cuánto cambia la situación de la partida.
3. **Posición crítica:** momento que exige detenerse y calcular, incluso si se juega correctamente.

## 1. Clasificación por pérdida en centipeones

Usar estos umbrales iniciales, configurables y pendientes de validación:

Nota: en MVP la configuración sería directo en base de datos, en prod: Consola web de admin.

| Etiqueta   | Condición            |
| ---------- | -------------------- |
| good       | 0 <= cp_loss < 50    |
| inaccuracy | 50 <= cp_loss < 100  |
| mistake    | 100 <= cp_loss < 300 |
| blunder    | cp_loss >= 300       |

Son una convención de ChessInsight, no umbrales oficiales ni específicos de un rango de Elo.

### Cálculo

Desde la posición anterior a la jugada:

cp_loss = max(0, eval_best_cp - eval_played_cp)

Ambas evaluaciones deben:

- Estar expresadas desde la perspectiva del jugador que mueve.
- Usar el mismo motor, configuración y presupuesto de análisis.
- Comparar la mejor alternativa con la jugada realizada.
- Conservar metadatos del análisis para permitir su revisión.

Si las evaluaciones provienen de posiciones consecutivas, normalizar su perspectiva antes de restarlas.

No interpretar centipeones como material perdido: son unidades de evaluación.

### Casos especiales

- No convertir evaluaciones de mate a un valor arbitrario de centipeones.
- Registrar por separado permitir mate, perder un mate disponible o conservarlo.
- Si falta una evaluación válida, dejar la clasificación pendiente.
- Marcar resultados inestables para revisión antes de generar una explicación definitiva.

## 2. Independencia del Elo

Mantener los mismos umbrales en todas las bandas:

- Menos de 1200.
- 1200–1599.
- 1600–1999.
- 2000–2399.
- 2400 o más.

El Elo modifica la explicación, la dificultad de los ejercicios y la profundidad de cálculo esperada. No modifica cp_loss ni su etiqueta.

## 3. Impacto pedagógico

Conservar la etiqueta por centipeones y añadir un campo independiente de impacto.

| Situación                           | Interpretación                                       |
| ----------------------------------- | ---------------------------------------------------- |
| Igualada → claramente inferior      | Error que compromete la posición                     |
| Ganada → igualada                   | Ventaja desaprovechada                               |
| Ganada → perdida                    | Error decisivo                                       |
| Ventaja decisiva → ventaja decisiva | Reduce la ventaja, pero conserva una posición ganada |
| Perdida → más perdida               | Agrava una posición ya desfavorable                  |

Estas categorías requieren definir y validar los límites de los estados de posición. No asumir que una evaluación fija garantiza un resultado.

Ejemplo:

- Pasar de +8 a +5 implica cp_loss = 300.
- La etiqueta es blunder según la escala inicial.
- El impacto puede ser limitado porque se conserva una ventaja decisiva.
- La interfaz debe mostrar ambos datos sin confundirlos.

## 4. Posiciones críticas

Detectarlas con independencia de que exista un error.

Señales candidatas:

- Amenaza táctica relevante.
- Diferencia importante entre la mejor candidata y las alternativas.
- Única jugada que conserva la posición.
- Decisión irreversible: ruptura de peones, sacrificio o cambio relevante.
- Transición a un final con consecuencias concretas.

Una señal aislada no demuestra que la posición sea crítica. Validar con variantes y contexto.

## 5. Integración con el pipeline existente

Mantener separados:

- ml_label: predicción del modelo.
- engine_label: etiqueta calculada con cp_loss.
- pedagogical_impact: interpretación contextual.
- is_critical_position: necesidad de detenerse y calcular.

Cuando ML y motor discrepen, conservar ambos resultados y registrar la discrepancia. No sobrescribir silenciosamente la predicción.

El motor mide la pérdida; el análisis contextual determina la prioridad de entrenamiento.

## 6. Datos mínimos por jugada

| Campo                | Descripción                              |
| -------------------- | ---------------------------------------- |
| player_elo           | Elo disponible del jugador               |
| best_move            | Mejor jugada encontrada                  |
| played_move          | Jugada realizada                         |
| eval_best_cp         | Evaluación de la mejor jugada            |
| eval_played_cp       | Evaluación de la jugada realizada        |
| cp_loss              | Pérdida normalizada, no negativa         |
| ml_label             | Etiqueta predicha por ML                 |
| engine_label         | Etiqueta por umbral                      |
| pedagogical_impact   | Impacto contextual                       |
| is_critical_position | Indicador de posición crítica            |
| critical_reasons     | Señales verificadas                      |
| mate_status          | Información de mate, si corresponde      |
| analysis_metadata    | Motor, versión y presupuesto de búsqueda |

## 7. Presentación al usuario

Mostrar:

1. Qué cambió con la jugada.
2. Qué amenaza o alternativa debía considerar.
3. Una variante suficiente para justificar la explicación.
4. La lección práctica.

Priorizar errores que cambian la situación de la partida y oportunidades relevantes desaprovechadas. Evitar reportes compuestos únicamente por etiquetas y evaluaciones.

## 8. Validación mínima

Verificar:

- Límites de clasificación: 49/50, 99/100 y 299/300 cp.
- Normalización correcta para blancas y negras.
- Igual clasificación para distintos Elo con igual cp_loss.
- Tratamiento separado de evaluaciones de mate.
- Posiciones críticas donde la jugada realizada es correcta.
- Pérdidas grandes que conservan una ventaja decisiva.
- Discrepancias entre ML y motor.

Validar los umbrales con partidas revisadas antes de tratarlos como definitivos.

## 9. Mensajes básicos de recomendación adaptados al Elo

### Objetivo

Generar recomendaciones breves para inaccuracy, mistake y blunder, reutilizables posteriormente en un reporte en lenguaje natural.

La etiqueta depende de cp_loss. El Elo adapta el vocabulario, la extensión y el nivel de cálculo esperado.

Los mensajes son plantillas propias de ChessInsight; no reproducen textos de ChessBase o Fritz.

### Plantillas generales

Estas recomendaciones pueden utilizarse cuando todavía no se ha identificado una causa concreta.

| Elo       | Etiqueta   | Recomendación                                                                                                                    |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| <1200     | inaccuracy | Antes de mover, revisa qué amenaza tu rival y si tus piezas quedan defendidas.                                                   |
| <1200     | mistake    | Compara tu jugada con una alternativa que mantenga tus piezas seguras. Revisa la respuesta inmediata del rival.                  |
| <1200     | blunder    | Detenerse en esta posición y comprueba jaques, capturas y amenazas de ambos jugadores antes de elegir.                           |
| 1200–1599 | inaccuracy | Compara dos candidatas y revisa si alguna mejora la actividad de tus piezas sin conceder amenazas.                               |
| 1200–1599 | mistake    | Calcula la respuesta más fuerte del rival a tu candidata y comprueba cómo continuarías.                                          |
| 1200–1599 | blunder    | Revisa primero las variantes forzadas: jaques, capturas y amenazas. No cierres el cálculo antes de comprobar la respuesta rival. |
| 1600–1999 | inaccuracy | Compara las candidatas por actividad, estructura y contrajuego concedido. Identifica qué ventaja conserva cada una.              |
| 1600–1999 | mistake    | Contrasta tu candidata con la mejor defensa rival y evalua la posición al terminar la secuencia.                                 |
| 1600–1999 | blunder    | Busca la refutación de tu candidata. Verifica movimientos intermedios y recursos defensivos antes de dar la variante por válida. |
| 2000–2399 | inaccuracy | Revisa el orden de jugadas y compara las concesiones concretas de las candidatas principales.                                    |
| 2000–2399 | mistake    | Localiza el punto donde cambia la evaluación y verificá si omitiste una defensa o evaluaste mal la posición resultante.          |
| 2000–2399 | blunder    | Reconstruye la variante crítica con la mejor respuesta rival y verifica el recurso que invalida tu elección.                     |
| ≥2400     | inaccuracy | Contrastá las candidatas principales y precisa la concesión que explica la pérdida de evaluación.                                |
| ≥2400     | mistake    | Revisá el recurso crítico y la evaluación de la posición final de la variante.                                                   |
| ≥2400     | blunder    | Verificá la refutación concreta y el orden exacto de la secuencia forzada.                                                       |

Estas plantillas orientan la revisión. No afirman cuál fue la causa del error.

### Personalización según evidencia

Cuando el análisis identifica un motivo, reemplazar la recomendación general por una concreta.

| Motivo verificado           | Recomendación básica                                                        | Recomendación avanzada                                                                         |
| --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pieza indefensa             | Comprueba qué piezas quedan atacadas y sin defensa después de mover.        | Revisa las piezas sueltas y su relación con los recursos tácticos rivales.                     |
| Amenaza rival omitida       | Identifica la amenaza del rival antes de ejecutar tu plan.                  | Contrasta tu plan con la amenaza concreta y verifica si podés responder con un recurso activo. |
| Movimiento intermedio       | Revisa si el rival dispone de un jaque o una amenaza antes de recapturar.   | Verifica movimientos intermedios que alteren el orden de la secuencia.                         |
| Seguridad del rey           | Comprueba los jaques y las líneas abiertas cerca de tu rey.                 | Evalua las líneas de acceso al rey y la coordinación de las piezas atacantes.                  |
| Cambio desfavorable         | Antes de cambiar, observa cómo queda la posición después de las recapturas. | Compará la actividad, estructura y posibilidades del final resultante.                         |
| Ruptura de peones           | Revisa qué casillas y líneas abres al avanzar el peón.                      | Verifica la preparación de la ruptura y el contrajuego que habilita.                           |
| Oportunidad táctica perdida | Busca jaques, capturas y amenazas que aprovechen la posición rival.         | Compara las continuaciones forzadas y verifica la mejor defensa.                               |

Usar la versión básica para Elo <1600 y la avanzada para Elo ≥1600 como criterio inicial configurable.

No atribuir una causa basándose únicamente en cp_loss o en la etiqueta.
Para el MVP genear diccionario de sugerencia en un archivo json , migrale a base de datos en fase posterior.

### Ajuste por impacto sobre la partida

La recomendación debe acompañarse de una descripción del impacto cuando esté validado.

| Impacto                               | Mensaje                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| Ventaja decisiva conservada           | La jugada redujo tu ventaja, aunque conservaste una posición claramente favorable. |
| Ventaja desaprovechada                | La jugada permitió al rival neutralizar la ventaja que tenías.                     |
| Posición igualada deteriorada         | La jugada dejó una posición claramente inferior.                                   |
| Posición ganada convertida en perdida | La jugada cambió una posición ganada por una perdida según el análisis.            |
| Posición ya perdida agravada          | La jugada empeoró una posición que ya era desfavorable.                            |

No presentar todos los blunders como errores que causaron la derrota.

### Composición del mensaje

Formato:

{impact_statement} {verified_observation} {recommendation}

Incluir únicamente los componentes respaldados por el análisis.

Ejemplo con motivo verificado:

> La jugada permitió al rival neutralizar tu ventaja. La secuencia incluye un jaque intermedio antes de la recaptura. Revisa si el rival dispone de un jaque o una amenaza antes de recapturar.

Ejemplo sin motivo identificado:

> La jugada perdió 140 centipeones respecto de la mejor alternativa. Calcula la respuesta más fuerte del rival a tu candidata y comprueba cómo continuarías.

### Datos adicionales por jugada

| Campo                      | Descripción                           |
| -------------------------- | ------------------------------------- |
| recommendation_template_id | Identificador estable de la plantilla |
| recommendation_version     | Versión de las plantillas utilizadas  |
| recommendation_elo_band    | Banda aplicada; unknown si no hay Elo |
| verified_motifs            | Motivos respaldados por el análisis   |
| evidence_variation         | Variante que justifica la observación |
| impact_statement           | Descripción validada del impacto      |
| recommendation_text        | Recomendación renderizada             |

Si no hay Elo disponible, usar una plantilla neutral:

> Revisá la mejor respuesta del rival y compará tu jugada con la alternativa del motor.

### Integración con el reporte en lenguaje natural

- Agrupar recomendaciones por motivos verificados, no solo por etiquetas.
- Priorizar ejemplos con mayor impacto pedagógico.
- Evitar repetir la misma recomendación en cada jugada.
- Diferenciar un caso aislado de un patrón recurrente.
- Mostrar jugadas y variantes que respalden cada conclusión.
- No inferir falta de atención, apuro, miedo o exceso de confianza a partir de la evaluación del motor.
- Si se dispone de tiempos de reflexión, describirlos como datos; no convertirlos automáticamente en causas.

Ejemplo de síntesis respaldada por varias posiciones:

> En tres posiciones omitiste movimientos intermedios del rival. En dos de ellas perdiste una ventaja. El punto común a revisar es el orden de la secuencia: antes de recapturar, comprobar jaques y amenazas.

### Validación

Verificar que:

- Cambiar el Elo modifica el mensaje, pero no engine_label.
- Todo motivo mencionado tiene evidencia registrada.
- Los mensajes generales no inventan causas.
- Un blunder con ventaja decisiva conservada recibe el contexto correspondiente.
- El reporte no atribuye patrones a una única jugada.
- La ausencia de Elo o de motivos permite generar un mensaje neutral.

## 10. Adaptación según la fuente del PGN y disponibilidad de Elo

### Objetivo

Adaptar las recomendaciones a la plataforma, al ritmo y al Elo informado en el PGN.

Si no hay un Elo válido para el jugador analizado, mantener el análisis numérico y la identificación básica del error, sin recomendaciones adaptadas por nivel.

### Identificación de la fuente

Leer el encabezado `Site` y reconocer dominios conocidos:

| Valor reconocido                     | rating_source |
| ------------------------------------ | ------------- |
| lichess.org o una URL de ese dominio | lichess       |
| Chess.com o una URL de ese dominio   | chesscom      |
| Otra fuente o encabezado ausente     | unknown       |

Normalizar mayúsculas y espacios. Validar el dominio de las URL para evitar coincidencias falsas.

No inferir que un rating es FIDE por tratarse de un torneo presencial o por aparecer en `WhiteElo` o `BlackElo`. Usar `fide` únicamente cuando exista información explícita y confiable sobre la escala del rating.

### Lectura del Elo

Obtener el rating correspondiente al color analizado:

- Blancas: `WhiteElo`.
- Negras: `BlackElo`.

Como compatibilidad, admitir `WhiteRating` y `BlackRating` cuando el campo principal esté ausente.

Considerar el rating no disponible si está ausente, vacío, contiene `?`, vale cero o no es un número entero positivo.

Si ambos campos existen y se contradicen, priorizar `WhiteElo` o `BlackElo` y registrar la discrepancia.

No usar el Elo del rival para adaptar las recomendaciones del jugador analizado.

### Identificación del ritmo

Leer `TimeControl` y conservar su valor original.

Resolver `rating_category` mediante reglas configuradas para la fuente:

- bullet
- blitz
- rapid
- classical
- correspondence
- unknown

No asumir que las plataformas clasifican todos los controles de tiempo de la misma manera.

Si el control falta, no puede interpretarse o no hay una regla aplicable, usar `unknown`.

### Configuración por fuente y ritmo

Seleccionar las bandas de recomendaciones mediante:

recommendation_profiles[rating_source][rating_category]

Cada perfil debe incluir:

- Bandas de rating.
- Nivel de explicación asociado.
- Identificadores de plantillas.
- Versión de configuración.

No convertir ratings entre plataformas mediante una diferencia fija.

Las bandas iniciales son configuraciones provisionales, pendientes de validación; no representan equivalencias entre FIDE, Lichess y Chess.com.

### Modos de funcionamiento

| Información disponible                                    | Modo                      |
| --------------------------------------------------------- | ------------------------- |
| Elo válido, fuente y ritmo reconocidos, perfil disponible | Recomendaciones adaptadas |
| Elo válido, pero fuente o ritmo desconocidos              | Análisis básico           |
| Elo válido, pero sin perfil configurado                   | Análisis básico           |
| Elo ausente o inválido                                    | Análisis básico           |
| PGN sin encabezados, con jugadas válidas                  | Análisis básico           |

Notas: 
1. Resolver el modo por jugador: si solo las blancas tienen Elo válido, eso no habilita recomendaciones adaptadas para las negras.
2. En el caso de Analisis Basico el sistema debe indicar que debe hacerel usuario para mejorar el analisis.
3. Segun sugerencias de 2, el sistema en fase posterior deberá permitir editar el encabezado del pgn y reanalizair.


### Funcionalidad del análisis básico

Mantener:

- Evaluación del motor.
- Mejor jugada y jugada realizada.
- Pérdida en centipeones.
- Etiqueta good, inaccuracy, mistake o blunder.
- Tratamiento separado de evaluaciones de mate.
- Identificación básica de motivos tácticos cuando exista evidencia.
- Variante que justifica el error.
- Usar codigo de colores y simbolos pgn en el planel de pgn para inaccuracy, mistake o blunder, good sería por defecto.

Ejemplo:

> Error: pérdida de 140 cp. La jugada permite un ataque doble.

Si no se identifica un motivo:

> Error: pérdida de 140 cp respecto de la mejor alternativa.

No generar consejos adaptados al Elo ni atribuir causas psicológicas.

### PGN sin encabezados

Aceptar un listado de jugadas si puede reconstruirse legalmente desde la posición inicial estándar.

Si la partida comienza desde otra posición, requerir una posición inicial explícita. No inventar un FEN ni analizar como válidas jugadas que no pueden reconstruirse.

La ausencia de encabezados no impide analizar una secuencia legal.

### Datos adicionales

| Campo                         | Descripción                                           |
| ----------------------------- | ----------------------------------------------------- |
| rating_value                  | Rating válido del jugador; null si no está disponible |
| rating_source                 | lichess, chesscom, fide o unknown                     |
| rating_category               | Categoría de rating o unknown                         |
| rating_provisional            | true, false o null si no se conoce                    |
| recommendation_mode           | adapted o basic                                       |
| recommendation_profile_id     | Perfil aplicado; null en modo básico                  |
| adaptation_unavailable_reason | Motivo por el que no se aplicó adaptación             |

No inferir que un rating es definitivo porque el PGN no indique que es provisional.

### Validación

Verificar:

- Detección de Chess.com y Lichess con distintos formatos de `Site`.
- Elo ausente, inválido o disponible para un solo color.
- Compatibilidad con `WhiteRating` y `BlackRating`.
- Fuente o ritmo desconocidos.
- Perfil de recomendaciones no configurado.
- PGN sin encabezados con jugadas legales.
- Secuencia que requiere una posición inicial no proporcionada.
- Igual clasificación numérica independientemente de la fuente.
- Ausencia de recomendaciones adaptadas en modo básico.