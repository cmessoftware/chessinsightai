# Spec candidata · Ejercitaciones y actividad en análisis

**Estado:** propuesta a refinar · 2026-11-07. **Epic candidata:** FEAT-102. No implementada ni aprobada como contrato definitivo.
**Ámbito:** módulo general de análisis de ChessInsight/ChessDash. Relacionada con LOG-FEAT-07/08 (instructor), FEAT-07 (Mental 1600) y MENT-FEAT-10/11/15…19 (revisión HITL). La actividad de práctica del alumno y el feedback sobre el sistema son registros distintos.

## 1. Objetivo y flujo candidato

**Alcance corregido:** ejercicios abiertos por objetivos, sin solución o secuencia predeterminada obligatoria. El alumno propone y ejecuta un plan, calcula respuestas y justifica decisiones. Variantes históricas y PV son referencias posteriores, no una clave de respuestas. Admitir diferentes planes válidos.

Permitir que el usuario o un instructor autorizado conviertan partidas o posiciones en ejercicios, organicen ejercitaciones y registren su resolución. Flujo: seleccionar partida/posición desde análisis → marcar como ejercicio → definir consigna y criterio de evaluación → guardar borrador → publicar versión → practicar o asignar → registrar intentos → revisar resultados y errores.

Una **ejercitación** agrupa uno o más ejercicios. Un ejercicio puede usar una posición FEN, un fragmento PGN o una partida con varias decisiones; una partida completa no implica evaluar cada jugada. Identificar explícitamente las decisiones objetivo. Etiquetar táctica, estrategia, plan, candidatas, cálculo, final u otro tema; no limitar el módulo a acertar la primera jugada de motor.

## 2. Tareas candidatas

| ID         | Prioridad / estado | Alcance y aceptación candidata                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-FEAT-01 | P1 · Candidata     | **Exportar partidas o estudios** Permitir que un usuario rol instructor pueda exportar a usuario o grupos asignados como alumnos partidas seleccionadas o estudios completos                                                                                                                                                                                                                                                                                                                    |
| EX-FEAT-02 | P1 · Candidata     | **Marcar desde análisis.** Crear ejercicio a partir de partida o posición seleccionada, conservando origen, FEN antes de mover, turno/POV, ply/rama y contexto previo necesario. Guardar una copia/versionado del material para que editar o eliminar el origen no cambie silenciosamente el ejercicio. No modificar el PGN original.                                                                                                                                                           |
| EX-FEAT-03 | P1 · Candidata     | **Autoría y catálogo.** Usuario crea y administra ejercicios propios; instructor autorizado crea ejercicios y ejercitaciones para sus alumnos. Definir título, consigna, tema, dificultad orientativa, objetivos, decisiones, objetivos/rúbrica, pistas y estados borrador/publicado/archivado. Publicar exige posición válida, consigna y criterio evaluable o revisión manual explícita.                                                                                                      |
| EX-FEAT-04 | P1 · Candidata     | **Rol instructor y asignaciones.** Integrar LOG-FEAT-07/08 y vínculo instructor–alumno con alcance explícito; asignar una versión publicada a alumnos autorizados, con estado pendiente/en curso/completada/revisada. No otorgar acceso global por poseer rol instructor. Creador, alumno e instructor tienen permisos diferenciados de edición, resolución y revisión. La práctica propia no necesita instructor.                                                                              |
| EX-FEAT-05 | P1 · Candidata     | **Resolución e intentos.** Mostrar consigna/tablero y ocultar análisis de referencia, resultado y comentarios reveladores. Registrar respuesta, jugadas/líneas, candidatas, respuesta rival prevista, elección y explicación cuando la consigna lo requiera. Conservar primer intento y reintentos; pistas y análisis revelado quedan registradas. Permitir pausar/reanudar sin duplicar intentos; abandonar no equivale a error.                                                               |
| EX-FEAT-06 | P1 · Candidata     | **Actividad persistida.** Registrar inicio, respuesta enviada, pista, revelación, pausa/reanudación, abandono, finalización y revisión con usuario, ejercicio/versión, asignación opcional, intento, decisión y fecha. Guardado servidor con identificadores idempotentes, estados de error y reintento. Recargar o repetir una petición no aumenta conteos. No interpretar cada movimiento exploratorio como intento enviado.                                                                  |
| EX-FEAT-07 | P1 · Candidata     | **Aciertos y errores.** Evaluar cumplimiento del objetivo y calidad del proceso mediante rúbrica humana o evidencia de motor, sin lista cerrada de jugadas correctas. Estados: acierto/error/parcial/pendiente de revisión/no evaluable; separar completitud y abandono del resultado. Guardar criterio, versión y evidencia; soluciones alternativas razonables no son errores por diferir de la PV principal. Mostrar explicación concreta del hallazgo sin atribuir pensamientos al jugador. |
| EX-FEAT-08 | P1 · Candidata     | **Seguimiento usuario/instructor.** Vistas de catálogo, mis ejercitaciones, asignaciones, historial de intentos, detalle por ejercicio/decisión y resumen por alumno/tema/período. Mostrar intentos, aciertos, errores, parciales, pendientes, ayudas y abandonos con denominadores explícitos. Separar primer intento, mejor resultado y práctica asistida. No mostrar ceros cuando faltan datos ni convertir visitas en práctica completada.                                                  |
| EX-FEAT-09 | P1 · Candidata     | **Revisión y corrección.** Instructor comenta intentos y aplica rúbrica; conservar evaluación anterior y motivo si se corrige. Nueva rúbrica o consigna publica una nueva versión; no recalcular históricos silenciosamente. Opcionalmente enlazar feedback HITL del sistema, conservando separado el juicio sobre alumno del juicio sobre modelo.                                                                                                                                              |
| EX-FEAT-10 | P1 · Candidata     | **Datos, API y permisos.** Especificar entidades ejercicio/versiones, ejercitación/ítems, asignación, intento, respuesta por decisión, eventos y revisión; persistencia Postgres/API y migraciones. Aplicar autorización en servidor, proteger análisis de referencia durante resolución y restringir datos privados a sus participantes. Validar legalidad de FEN/jugadas y referencias estables. Definir retención y efecto de revocar acceso o archivar material sobre historial.            |
| EX-FEAT-11 | P1 · Candidata     | **Verificación del flujo.** Cubrir práctica propia y asignada, partida con varias decisiones, FEN/variante/negras, respuesta alternativa aceptada, evaluación manual pendiente, pista, abandono/reanudación, recarga/reenvío, cambio de versión y acceso no autorizado. Cierre requiere evidencia de actividad persistida y conteos consistentes, sin fuga de análisis ni contaminación de resultados previos.                                                                                  |

## 3. Objetivos abiertos y evaluación

| Objetivo de la consigna, para blancas o negras | Evidencia a revisar                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| Obtener o consolidar ventaja                   | Progreso o conversión favorable frente a defensas exigentes.                            |
| Igualar una posición inferior                  | Neutralizar amenazas, reducir desventaja y encontrar recursos defensivos.               |
| Explotar debilidades tácticas o estratégicas   | Identificar objetivos, preparar acceso, calcular defensas y evitar concesiones mayores. |
| Mejorar abriendo columnas o diagonales         | Apertura útil para el propio plan, ocupación de líneas y control del contrajuego.       |
| Activar piezas o mejorar una pieza pasiva      | Función, coordinación, casillas y participación en el plan, considerando tiempos.       |

El creador define posición, bando, objetivo, horizonte de decisiones y rúbrica. Publicar no exige una jugada correcta ni un árbol de variantes. Si la consigna exige algo inalcanzable según la evidencia disponible, revisar la consigna; no penalizar al alumno por esa imposibilidad.

**Rúbrica por dimensiones:** diagnóstico, plan, candidatas, respuesta rival/cálculo, ejecución/adaptación y resultado. Estados por dimensión: logrado/parcial/no logrado/no evaluable, con evidencia y comentario. Registrar calidad del proceso separada del resultado: un plan razonable puede fallar al ejecutarlo; ganar por error rival no demuestra solidez del plan. Acierto/error es un resumen derivado de criterios explícitos, nunca coincidencia con una jugada secreta.

**Modalidades:** enviar plan y variantes justificadas, o continuar jugando durante un horizonte configurable. El intento contiene decisiones sucesivas y termina por envío, objetivo observado o fin del horizonte; no requiere recorrer un árbol fijo. Un desenlace incierto queda inconcluso/pendiente, no como error automático.

### Evaluadores y nivel del jugador

- **Instructor humano:** revisa la intención declarada y aplica la rúbrica, aceptando planes alternativos y adecuando exigencia al nivel. Puede corregir evaluación automática conservando historial y fundamento.
- **Stockfish/Lc0 u otro evaluador validado:** aporta evidencia de solidez táctica, recursos rivales y consecuencias. Analizar también la propuesta enviada aunque no aparezca en MultiPV; guardar motor/versión, presupuesto, PV, scores y POV. No usar umbrales universales de centipeones ni exigir aumento de evaluación en cada jugada.
- **Maia al nivel configurado:** rival de práctica y referencia de respuestas humanas plausibles/dificultad práctica. Predice comportamiento humano; probabilidad de jugada no equivale a corrección. Para certificar ventaja/igualdad, combinar con instructor o evaluador objetivo. Registrar versión y escala/origen del rating; no equiparar automáticamente Elo Maia/Lichess/Chess.com/FIDE.

Modos candidatos: humano, automático limitado a dimensiones verificables, híbrido. La evaluación automática de apertura de líneas, actividad o explotación de debilidades requiere detectores específicos validados. Sin ellos, presentar evidencia y dejar rúbrica estratégica pendiente de instructor. No sustituir validación por una explicación textual no sustentada.

Separar trayectoria realmente jugada contra Maia del contraste frente a defensa exigente. Una victoria práctica ante un error de Maia no prueba que el plan funcione contra buena defensa. Una jugada poco probable según Maia puede ser válida. La adaptación al nivel afecta dificultad y exigencia didáctica; no convierte una refutación táctica en jugada correcta.

**Métricas:** objetivos logrados/parciales/no logrados por dimensión y tipo, cobertura de revisión y evolución en posiciones nuevas. Separar primer intento, reintentos, ayudas, provisional automático y confirmado humano; denominadores solo con revisión disponible. Tiempo registrado no demuestra tiempo de pensamiento.

### Factibilidad y utilidad

**Evaluación de diseño: viable como MVP humano/híbrido; automatización estratégica completa pendiente de validación.** Reutilizar tablero, variantes, motores e intentos es una hipótesis de arquitectura que debe confirmarse inspeccionando código. Primer corte: crear consigna abierta, registrar plan/continuación y aplicar rúbrica manual. Agregar práctica contra Maia y evidencia objetiva sin hacerlos requisitos para registrar un ejercicio.

**Utilidad esperada:** trabajar decisiones y planes transferibles a partidas, reconocer alternativas y distinguir diagnóstico, cálculo y ejecución. No hay mejora de Elo demostrada por esta spec. Costos/riesgos: tiempo del instructor, sensibilidad al horizonte/presupuesto del motor y proxies estratégicos que premien mejoras superficiales. La valoración global en centipeones no explica por sí sola si una pieza mejoró su función.

**Piloto:** instructor selecciona casos de diferentes objetivos y niveles, incluidos planes alternativos válidos y errores sutiles. Contrastar rúbrica humana/automática por dimensión, desacuerdos, tiempo de revisión y utilidad percibida; probar transferencia con posiciones nuevas del mismo tema. Acordar criterios de aceptación antes del piloto. Una muestra pequeña no acredita eficacia general.

Fuentes técnicas: [Project Maia, Microsoft Research](https://www.microsoft.com/en-us/research/project/project-maia/technical-deep-dive/) y [Maia-2 oficial](https://github.com/CSSLab/maia2). Respaldan modelado humano por nivel; no validan esta rúbrica pedagógica.

### Tareas adicionales

| ID         | Estado         | Criterio de aceptación candidato                                                                                                                                                        |
| ---------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-FEAT-11 | P1 · Candidata | Editor de objetivos abiertos/rúbricas: publicar y resolver sin introducir solución ni variante correcta; conservar objetivo, horizonte y dimensiones evaluables. Integra EX-FEAT-02/06. |
| EX-FEAT-12 | P1 · Candidata | Práctica con Maia y evaluación híbrida desacopladas: conservar trayectoria, nivel y evidencia contra defensa exigente; admitir plan no previsto y no puntuar por probabilidad Maia.     |
| EX-FEAT-13 | P1 · Candidata | Piloto/calibración de §3: registrar resultados por dimensión y discrepancias humanas antes de habilitar calificación automática general.                                                |

## 4. Límites e integración

El módulo general puede alojar material de análisis sin cambiar las restricciones del modelo mental: cualquier assessment Mental 1600 y sus métricas admiten rapid o más lento, excluyendo blitz/bullet; referencias sin reloj mantienen tratamiento de estudio. No generar assessments excluidos al marcar material como ejercicio.

Guardar borradores no publica material ni lo asigna automáticamente. Los comentarios del instructor sobre una respuesta pertenecen a la revisión del intento; los comentarios sobre una propuesta del sistema pertenecen al módulo HITL MENT-FEAT-15…19. Completar ejercicios o recibir feedback no cierra M-11.

## 5. Decisiones abiertas antes de implementación

- Rúbricas y tolerancias por tipo; si el MVP incluye evaluación por motor o comienza con consignas abiertas y revisión manual.
- Forma de confirmar el vínculo instructor–alumno, alcance de grupos y acceso tras terminar la relación.
- Alcance inicial de asignaciones, plazos opcionales, secuenciación y publicación/compartición.
- Retención, edición, eliminación y reevaluación explícita de históricos.
- Tratamiento de respuestas libres y líneas parciales; número de intentos y ayudas permitidas por consigna.

**Secuencia candidata:** EX-FEAT-01/02/09 → EX-FEAT-04/05/06 (práctica propia) → EX-FEAT-03/08 (instructor) → EX-FEAT-07/10/13; EX-FEAT-11 se integra desde autoría y EX-FEAT-12 agrega práctica híbrida. Refinar con usuarios e instructor antes de congelar contratos. Ninguna tarea queda Done por esta documentación.

## 6. Candidatas de motor o manuales y fundamento por jugada

**Alcance:** ofrecer opciones de Stockfish, opciones humanas plausibles de Maia y jugadas agregadas manualmente por usuario/instructor, con explicación y evidencia. Son material de comparación y discusión, no una solución cerrada del ejercicio. El alumno puede proponer otras jugadas y pedir su revisión bajo los mismos criterios.

### Presentación y procedencia

Cada candidata conserva SAN/UCI, FEN/turno/POV, autor o proveedor, idea, respuesta rival exigente, continuación ilustrativa y fundamento. Una misma jugada puede tener varias fuentes; conservar sus aportes sin duplicar la opción ni atribuir al motor una explicación humana.

- **Stockfish:** lista ordenada por evaluación con MultiPV, PV y profundidad/presupuesto. Identificar posición y parámetros comunes.
- **Maia:** lista por probabilidad o preferencia humana al nivel configurado; llamarlas candidatas plausibles de Maia, sin equiparar ese orden con mejores jugadas objetivas.
- **Manual:** ingresar jugada legal, fundamento, variantes y valoración opcional del instructor/usuario. No exigir validación motor para guardarla. Evaluación ausente permanece pendiente; una cifra manual se etiqueta como valoración humana, no como score del motor.

Permitir evaluar con Stockfish cualquier candidata Maia/manual, incluso fuera de MultiPV, con presupuesto comparable. Mantener separados ranking objetivo, orden Maia y orden didáctico. Si una fuente no está disponible, conservar las otras y mostrar su ausencia.

### Ejemplo de comparación

Ejemplo ilustrativo, no evaluaciones de una posición real. Valores desde POV del jugador, misma posición y presupuesto comparable:

| Candidata | Evaluación Stockfish | Pérdida frente a la mejor analizada | Fundamento a completar                                                                     |
| --------- | -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Jugada 1  | +100 cp              | 0 cp                                | Qué ventaja conserva/obtiene, cómo responde el rival y qué plan permite.                   |
| Jugada 2  | +50 cp               | 50 cp                               | Qué concede respecto de la primera y por qué aún puede ser una alternativa razonable.      |
| Jugada 3  | 0 cp                 | 100 cp                              | Qué recurso rival neutraliza la ventaja y si cumple o incumple el objetivo de la consigna. |

**Evaluación de posición no equivale a mejora obtenida:** +100 cp tras mover significa una estimación favorable de un peón desde el POV declarado, no que esa jugada ganó un peón ni mejoró 100 cp respecto de la posición inicial. Guardar también evaluación inicial cuando se afirme progreso. La diferencia frente a la mejor analizada no prueba que se haya encontrado la mejor absoluta.

Respetar la convención de visualización estándar de la app (+ blancas / − negras); el ejemplo usa POV jugador explícito. Guardar ambas convenciones sin invertir dos veces; en negras una evaluación estándar negativa puede ser favorable. Mates se muestran como mate, no se convierten a cp para ordenar diferencias aritméticas. Scores de diferentes motores/presupuestos no se mezclan como si fueran comparables.

### Explicación buena, dudosa o inadecuada

Explicar por qué una jugada es útil o falla **respecto del objetivo y del contexto**, con hechos verificables: pieza que mejora, línea que se abre, debilidad atacable, amenaza cubierta, tiempo cedido o recurso rival. Incluir al menos una respuesta rival y continuación cuando el juicio dependa de cálculo. Comparar también concesiones y alternativas.

No deducir causalidad de un score aislado ni fabricar una razón estratégica para justificarlo. Ejemplo de estructura: “Mejora la torre al ocupar la columna abierta; tras …X conserva presión sobre Y. La alternativa permite …Z y pierde el control de esa entrada”. Este texto requiere posición/línea que lo respalden.

Un generador de explicaciones puede proponer un borrador basado en tablero y líneas, etiquetado automático/no revisado; el instructor puede escribir, corregir y validar. Sin evidencia suficiente: “fundamento pendiente” o incertidumbre explícita. Una probabilidad Maia alta no justifica “buena”; un menor score no basta para “mala”. No asignar automáticamente acierto/error por quedar fuera del top 3.

**Fases:** durante el intento ciego ocultar candidatas, scores, fundamentos y líneas de referencia. Revelarlas después del envío o a pedido como ayuda, registrando exposición. La ayuda no sobrescribe el intento inicial ni su evaluación independiente.

### Tareas candidatas adicionales

| ID         | Estado         | Alcance y aceptación candidata                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX-FEAT-14 | P1 · Candidata | **Proveedor de candidatas.** Stockfish MultiPV, Maia por nivel y carga manual con fundamentos/variantes; fuentes múltiples por jugada, validación legal y estados sin motor. Guardar nuevas opciones fuera de listas sin convertirlas en incorrectas.                                                                                                                |
| EX-FEAT-15 | P1 · Candidata | **Comparador de valoraciones.** Evaluación inicial/final, diferencia frente a la mejor analizada, probabilidad Maia independiente, parámetros y POV visibles. Analizar candidata manual/Maia bajo condiciones comparables; tratar scores ausentes, mates y negras sin cifras inventadas.                                                                             |
| EX-FEAT-16 | P1 · Candidata | **Fundamento y revisión.** Editor por candidata con idea, evidencia, respuesta rival, continuación, concesiones y vínculo al objetivo. Procedencia manual/automática y estado pendiente/revisado; historial de correcciones. Borradores automáticos sin evidencia no se presentan como hechos.                                                                       |
| EX-FEAT-17 | P1 · Candidata | **Validación funcional/pedagógica.** Verificar opciones 100/50/0 cp como fixture ilustrativo, negras/POV, mates, candidata fuera de MultiPV, motor ausente, alternativa válida fuera del top 3 y ocultación en modo ciego. Instructor revisa explicaciones y casos donde la preferencia Maia discrepa de Stockfish; documentar límites antes de automatizar juicios. |

**Decisiones pendientes:** cantidad inicial de candidatas, presupuesto comparable de evaluación y generación automática de explicaciones. Carga manual y revisión humana deben funcionar aunque no se habilite generación automática.
