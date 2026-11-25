# FEAT-120…122 · Comentarios con imágenes

**Estado:** ✅ Done ([#275](https://github.com/cmessoftware/chessinsightai/pull/275), integrado en `main`).  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) (FEAT-120, FEAT-121, FEAT-122)  
**Colisiones de id:** [roadmap-id-collisions-2026-11.md](./roadmap-id-collisions-2026-11.md) (histórico PR #274 vs #275)

## Objetivo

Extender `/feedback` (LOG-FEAT-10) con adjuntos visuales, UX post-envío y publicación de imágenes en el issue de GitHub sin URLs locales rotas.

## FEAT-120 · Adjuntos en el alta

- Hasta **5** imágenes por envío (JPEG, PNG, WebP, GIF; máx. **5 MB** cada una).
- `POST /api/feedback` multipart; JSON legacy en `POST /api/feedback/json`.
- Vista previa, quitar y ampliar en `FeedbackPage`.
- Servir adjuntos locales: `GET /api/feedback/attachments/{id}`.

## FEAT-121 · Confirmación

Tras éxito: pantalla de confirmación (sin formulario vacío), miniaturas enviadas y botón **«Enviar otro comentario»** que restaura el formulario.

## FEAT-122 · Imágenes en GitHub

- Subida a `.feedback/attachments/` en rama `GITHUB_FEEDBACK_ATTACHMENTS_BRANCH` (default `feedback-attachments`) vía Contents API.
- Cuerpo del issue con URLs `raw.githubusercontent.com`.
- `attachment_warnings` en la respuesta si falta permiso `contents: write`.
- Fallback: `FEEDBACK_ATTACHMENT_PUBLIC_BASE_URL` en producción.

### Variables (`.env`)

Ver `src/api/.env.example`: `GITHUB_FEEDBACK_TOKEN`, `GITHUB_FEEDBACK_REPO`, `GITHUB_FEEDBACK_ATTACHMENTS_BRANCH`, `FEEDBACK_ATTACHMENT_PUBLIC_BASE_URL`, `FEEDBACK_ATTACHMENTS_DIR`.

## Código principal

| Pieza | Ruta |
|-------|------|
| Router | `src/api/routers/feedback.py` |
| Adjuntos | `src/api/services/feedback_attachments.py` |
| GitHub | `src/api/services/github_feedback.py` |
| UI | `src/frontend/src/pages/FeedbackPage.jsx` |
| Tests | `tests/api/test_feedback_attachments.py` |

## Fuera de alcance (siguientes ítems)

Hilo de comentarios, listado de reportes y cierre admin → **FEAT-123 / FEAT-124** ([feat-123-124-feedback-github-issues.md](./feat-123-124-feedback-github-issues.md)).