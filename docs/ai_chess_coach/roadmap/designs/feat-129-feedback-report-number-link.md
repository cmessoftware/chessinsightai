# FEAT-129 · Número de reporte en el enlace (sin jerga GitHub)

**Estado:** ✅ Done (tras merge del PR en `main`).  
**Deriva de:** [FEAT-121](./feat-120-122-feedback-comentarios.md#feat-121--confirmación) (confirmación post-envío) · **LOG-FEAT-10**  
**Relacionado:** FEAT-123 / FEAT-124 / FEAT-128 (misma convención en listados e historial)  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md)

## Problema

En la confirmación de Comentarios el texto hablaba de «issue» y del «repositorio». La mayoría de los usuarios no usa GitHub; necesitan un **número de reporte** claro para citar al equipo, sin aprender la interfaz de GitHub.

## Objetivo

Tras enviar un reporte, mostrar solo el **número** (`#123`) como texto del enlace. El `href` puede seguir apuntando a la ficha técnica (issue en GitHub) para quien quiera abrirlo; en pantalla no se nombra GitHub ni «issue».

## Alcance

| Incluye | Excluye |
|--------|---------|
| Copy del intro y de la alerta de éxito en `FeedbackPage` | Cambiar backend o formato de respuesta API |
| Enlace con etiqueta `#{number}` y `title` accesible («Ficha del reporte #N») | Quitar el enlace (FEAT-123 puede añadir vista in-app) |
| Documentar la misma regla para FEAT-123/128 al listar reportes | Renumerar issues existentes en GitHub |

## Aceptación

1. El párrafo introductorio no menciona «issue», «repositorio» ni GitHub.
2. Tras éxito: mensaje del tipo «Tu reporte fue enviado» y enlace cuyo **texto visible** es solo `#<número>` (p. ej. `#271`).
3. Sin `created.url` o sin `created.number`, el mensaje de éxito no muestra enlace roto.
4. FEAT-123 y FEAT-128 reutilizan la misma convención al mostrar filas de «mis reportes» (spec referenciada; implementación en sus ramas).

## Rama

`feature/11_129_feedback_issue_number_link`

## Código

- `src/frontend/src/pages/FeedbackPage.jsx`