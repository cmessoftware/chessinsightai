# FEAT-129 · Número de reporte sin enlace a GitHub

**Estado:** ✅ Done (tras merge del PR en `main`).  
**Deriva de:** [FEAT-121](./feat-120-122-feedback-comentarios.md#feat-121--confirmación) (confirmación post-envío) · **LOG-FEAT-10**  
**Relacionado:** FEAT-123 / FEAT-124 / FEAT-128 (misma convención en listados e historial)  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md)

## Problema

En la confirmación de Comentarios el texto hablaba de «issue» y del «repositorio», y a veces enlazaba a GitHub. La mayoría de los usuarios no usa GitHub; solo necesitan un **número de reporte** para citar al equipo. El producto no debe ofrecer un atajo al issue en github.com.

## Objetivo

Tras enviar un reporte, mostrar solo el **número** (`#123`) como **texto** (sin `<a href>`). La API puede seguir devolviendo `url` para uso interno o admin; la UI de Comentarios **no** la usa ni expone enlaces externos.

## Alcance

| Incluye | Excluye |
|--------|---------|
| Copy del intro y de la alerta de éxito en `FeedbackPage` | Quitar `url` del JSON de la API |
| `#<número>` visible, sin enlace | Vista in-app del hilo (FEAT-123) |
| Misma regla en specs FEAT-123 / FEAT-128 para listados | Enlace «Abrir en GitHub» en la UI pública |

## Aceptación

1. El párrafo introductorio no menciona «issue», «repositorio» ni GitHub.
2. Tras éxito: «Tu reporte ya fue enviado. Número de reporte: **#&lt;n&gt;**» — el número **no** es clicable y no hay enlace a dominios de GitHub.
3. Sin `created.number`, el mensaje de éxito omite la línea del número (sin pantalla rota).
4. FEAT-123 y FEAT-128 listan reportes con el mismo criterio: número visible, detalle y hilo **dentro de ChessDash** (no linkout a GitHub para usuarios finales).

## Rama

`feature/11_129_feedback_issue_number_link`

## Código

- `src/frontend/src/pages/FeedbackPage.jsx`