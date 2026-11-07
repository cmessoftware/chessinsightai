# Spec candidata · Ejercitaciones y actividad en análisis

**Estado:** propuesta a refinar · 2026-11-07. **Epic candidata:** FEAT-102. No implementada ni aprobada como contrato definitivo.
**Ámbito:** módulo general de análisis de ChessInsight/ChessDash. Relacionada con LOG-FEAT-07/08 (instructor), FEAT-07 (Mental 1600) y MENT-FEAT-10/11/15…19 (revisión HITL). La actividad de práctica del alumno y el feedback sobre el sistema son registros distintos.

## 1. Objetivo y flujo candidato

Permitir que el usuario o un instructor autorizado conviertan partidas o posiciones en ejercicios, organicen ejercitaciones y registren su resolución. Flujo: seleccionar partida/posición desde análisis → marcar como ejercicio → definir consigna y criterio de evaluación → guardar borrador → publicar versión → practicar o asignar → registrar intentos → revisar resultados y errores.

Una **ejercitación** agrupa uno o más ejercicios. Un ejercicio puede usar una posición FEN, un fragmento PGN o una partida con varias decisiones; una partida completa no implica evaluar cada jugada. Identificar explícitamente las decisiones objetivo. Etiquetar táctica, estrategia, plan, candidatas, cálculo, final u otro tema; no limitar el módulo a acertar la primera jugada de motor.

## 2. Tareas candidatas

| ID | Prioridad / estado | Alcance y aceptación candidata |
| --- | --- | --- |
| EX-FEAT-01 | P1 · Candidata | **Marcar desde análisis.** Crear ejercicio a partir de partida o posición seleccionada, conservando origen, FEN antes de mover, turno/POV, ply/rama y contexto previo necesario. Guardar una copia/versionado del material para que editar o eliminar el origen no cambie silenciosamente el ejercicio. No modificar el PGN original. |
| EX-FEAT-02 | P1 · Candidata | **Autoría y catálogo.** Usuario crea y administra ejercicios propios; instructor autorizado crea ejercicios y ejercitaciones para sus alumnos. Definir título, consigna, tema, dificultad orientativa, objetivos, decisiones, soluciones/rúbrica, pistas y estados borrador/publicado/archivado. Publicar exige posición válida, consigna y criterio evaluable o revisión manual explícita. |
| EX-FEAT-03 | P1 · Candidata | **Rol instructor y asignaciones.** Integrar LOG-FEAT-07/08 y vínculo instructor–alumno con alcance explícito; asignar una versión publicada a alumnos autorizados, con estado pendiente/en curso/completada/revisada. No otorgar acceso global por poseer rol instructor. Creador, alumno e instructor tienen permisos diferenciados de edición, resolución y revisión. La práctica propia no necesita instructor. |
| EX-FEAT-04 | P1 · Candidata | **Resolución e intentos.** Mostrar consigna/tablero y ocultar solución, resultado y comentarios reveladores. Registrar respuesta, jugadas/líneas, candidatas, respuesta rival prevista, elección y explicación cuando la consigna lo requiera. Conservar primer intento y reintentos; pistas y solución revelada quedan registradas. Permitir pausar/reanudar sin duplicar intentos; abandonar no equivale a error. |
| EX-FEAT-05 | P1 · Candidata | **Actividad persistida.** Registrar inicio, respuesta enviada, pista, revelación, pausa/reanudación, abandono, finalización y revisión con usuario, ejercicio/versión, asignación opcional, intento, decisión y fecha. Guardado servidor con identificadores idempotentes, estados de error y reintento. Recargar o repetir una petición no aumenta conteos. No interpretar cada movimiento exploratorio como intento enviado. |
| EX-FEAT-06 | P1 · Candidata | **Aciertos y errores.** Evaluar por soluciones/variantes aceptadas, tolerancia explícita o rúbrica manual según tipo. Estados: acierto/error/parcial/pendiente de revisión/no evaluable; separar completitud y abandono del resultado. Guardar criterio, versión y evidencia; soluciones alternativas razonables no son errores por diferir de la PV principal. Mostrar explicación concreta del hallazgo sin atribuir pensamientos al jugador. |
| EX-FEAT-07 | P1 · Candidata | **Seguimiento usuario/instructor.** Vistas de catálogo, mis ejercitaciones, asignaciones, historial de intentos, detalle por ejercicio/decisión y resumen por alumno/tema/período. Mostrar intentos, aciertos, errores, parciales, pendientes, ayudas y abandonos con denominadores explícitos. Separar primer intento, mejor resultado y práctica asistida. No mostrar ceros cuando faltan datos ni convertir visitas en práctica completada. |
| EX-FEAT-08 | P1 · Candidata | **Revisión y corrección.** Instructor comenta intentos y aplica rúbrica; conservar evaluación anterior y motivo si se corrige. Nueva solución o consigna publica una nueva versión; no recalcular históricos silenciosamente. Opcionalmente enlazar feedback HITL del sistema, conservando separado el juicio sobre alumno del juicio sobre modelo. |
| EX-FEAT-09 | P1 · Candidata | **Datos, API y permisos.** Especificar entidades ejercicio/versiones, ejercitación/ítems, asignación, intento, respuesta por decisión, eventos y revisión; persistencia Postgres/API y migraciones. Aplicar autorización en servidor, proteger soluciones durante resolución y restringir datos privados a sus participantes. Validar legalidad de FEN/jugadas y referencias estables. Definir retención y efecto de revocar acceso o archivar material sobre historial. |
| EX-FEAT-10 | P1 · Candidata | **Verificación del flujo.** Cubrir práctica propia y asignada, partida con varias decisiones, FEN/variante/negras, respuesta alternativa aceptada, evaluación manual pendiente, pista, abandono/reanudación, recarga/reenvío, cambio de versión y acceso no autorizado. Cierre requiere evidencia de actividad persistida y conteos consistentes, sin fuga de solución ni contaminación de resultados previos. |

## 3. Criterios de evaluación a refinar

| Tipo | Evaluación candidata |
| --- | --- |
| Táctica o línea concreta | Conjunto explícito de jugadas/variantes aceptadas, defensa rival y condición de finalización. |
| Plan o estrategia | Rúbrica de objetivos y evidencias; revisión manual o asistida indicada como tal. |
| Candidatas y cálculo | Cobertura y justificación de opciones, respuesta rival y coherencia de la continuación; no solo coincidencia SAN. |
| Recorrido de partida | Resultado por decisión objetivo y resumen con cobertura; completar el recorrido no prueba haber acertado. |

Motores son evidencia opcional con fuente, versión y presupuesto guardados. La evaluación automática por motor debe especificar tolerancias y tratamiento de mates y alternativas; no convertir ausencia de motor en error del alumno ni considerar Maia árbitro de corrección.

**Métricas candidatas:** aciertos de primer intento / decisiones evaluadas de primer intento; errores con igual denominador; parciales separados; pendientes/no evaluables excluidos y visibles. Reintentos y resultados con ayuda se informan aparte. Registrar tiempo de actividad como aproximación si hay pausas/desconexión, sin inferir tiempo real de pensamiento.

## 4. Límites e integración

El módulo general puede alojar material de análisis sin cambiar las restricciones del modelo mental: cualquier assessment Mental 1600 y sus métricas admiten rapid o más lento, excluyendo blitz/bullet; referencias sin reloj mantienen tratamiento de estudio. No generar assessments excluidos al marcar material como ejercicio.

Guardar borradores no publica material ni lo asigna automáticamente. Los comentarios del instructor sobre una respuesta pertenecen a la revisión del intento; los comentarios sobre una propuesta del sistema pertenecen al módulo HITL MENT-FEAT-15…19. Completar ejercicios o recibir feedback no cierra M-11.

## 5. Decisiones abiertas antes de implementación

- Rúbricas y tolerancias por tipo; si el MVP incluye evaluación por motor o comienza con soluciones explícitas y revisión manual.
- Forma de confirmar el vínculo instructor–alumno, alcance de grupos y acceso tras terminar la relación.
- Alcance inicial de asignaciones, plazos opcionales, secuenciación y publicación/compartición.
- Retención, edición, eliminación y reevaluación explícita de históricos.
- Tratamiento de respuestas libres y líneas parciales; número de intentos y ayudas permitidas por consigna.

**Secuencia candidata:** EX-FEAT-01/02/09 → EX-FEAT-04/05/06 (práctica propia) → EX-FEAT-03/08 (instructor) → EX-FEAT-07/10. Refinar con usuarios e instructor antes de congelar contratos. Ninguna tarea queda Done por esta documentación.
