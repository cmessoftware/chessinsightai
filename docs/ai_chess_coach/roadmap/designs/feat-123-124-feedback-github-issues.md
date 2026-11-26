# FEAT-123 / FEAT-124 · Hilo de comentarios y cierre de issues en Comentarios

**Estado:** ⬜ Todo (spec consolidada; implementación pendiente). Base adjuntos: FEAT-120…122 ([#275](https://github.com/cmessoftware/chessinsightai/pull/275)).  
**Tracker:** [issues-coach-move-classification-pedagogy-mini-plan.md](./issues-coach-move-classification-pedagogy-mini-plan.md) (filas FEAT-123, FEAT-124)  
**Relacionado:** LOG-FEAT-10, FEAT-120…122, `FeedbackPage`, `services/github_feedback.py`, `routers/feedback.py`

## Contexto

Hoy `/feedback` crea un issue en GitHub y enlaza al usuario al issue recién creado. No hay continuidad en la app: no se listan issues previos del usuario, no se leen comentarios del repositorio y el admin no puede cerrar desde ChessDash.

GitHub es la fuente de verdad para bugs y sugerencias (mismo token y repo que LOG-FEAT-10). La UI debe reflejar el estado del issue y su conversación sin duplicar lógica a medias en Postgres salvo un mapeo opcional usuario ↔ número de issue para listados rápidos.

---

## FEAT-123 · Comentarios sobre el issue (bidireccional con GitHub)

### Problema

Quien reporta no puede responder en el producto ni ver actualizaciones del equipo. Los comentarios hechos en github.com no aparecen en la UI.

### Objetivo

En **Comentarios**, permitir **ver y publicar comentarios** en el issue asociado, con la **misma semántica** que en GitHub Issues (hilo lineal, markdown básico, autor y fecha).

### Alcance

| Incluye | Excluye (v1) |
|--------|----------------|
| Listar issues creados por el usuario autenticado (o los que la API pueda resolver por etiqueta/autor en el cuerpo) | Issues de otros usuarios visibles a no-admin |
| Sincronizar **issue comments** vía REST `GET/POST …/issues/{n}/comments` | Review comments en PR, discusiones, reactions |
| Mostrar comentarios escritos **en GitHub** y los enviados **desde la UI** en el mismo hilo | Edición o borrado de comentarios ajenos |
| Adjuntes en comentarios: reutilizar FEAT-120/122 (imágenes en markdown del comentario, misma política de subida) | Asignar milestones, projects, sub-issues |

### Aceptación

1. Tras elegir un issue (o desde la confirmación post-envío), la UI muestra **estado** (abierto/cerrado), título, enlace a GitHub y **lista de comentarios** ordenados por fecha (más antiguos arriba o abajo — documentar en implementación y ser consistente).
2. Un comentario nuevo desde la app aparece en GitHub en menos de un reintento visible (recargar o poll corto).
3. Un comentario añadido en GitHub por un maintainer se muestra tras **refrescar** o **polling** (intervalo configurable; máx. 60 s en dev).
4. El cuerpo del comentario identifica al usuario ChessDash (`**Usuario:** …` en markdown o firma acordada), alineado con el cuerpo del issue.
5. Sin token o sin permiso `issues: read` / `issues: write` la UI muestra error claro; no pantalla vacía.
6. Admin puede ver el mismo hilo en issues que el usuario abrió (sin filtrar por autor del comentario).

### API (orientación)

- `GET /api/feedback/issues` — listado paginado para el usuario actual (filtro en servidor por autor en cuerpo o tabla de mapping).
- `GET /api/feedback/issues/{number}` — metadatos + comentarios (proxy GitHub).
- `POST /api/feedback/issues/{number}/comments` — texto + opcional `files` multipart (reuso `_save_uploads` para URLs en markdown).
- Opcional: `POST /api/feedback/issues/{number}/sync` — fuerza lectura desde GitHub.

### UI (orientación)

- Pestaña o sección **«Mis reportes»** en `FeedbackPage` (o ruta `/feedback/issues/:number`).
- Campo multilínea + enviar; opcional imágenes como en el alta.
- Badge abierto/cerrado; en filas y confirmación, enlace con texto solo `#{número}` (convención **FEAT-129**); enlace secundario opcional «Abrir ficha» sin destacar GitHub.

### Permisos GitHub

`GITHUB_FEEDBACK_TOKEN`: **Issues** read/write; **Contents** read/write si hay imágenes (FEAT-122).

### Rama sugerida

`feature/11_123_feedback_issue_threads` (un ítem por branch cuando se implemente).

---

## FEAT-124 · Admin: cerrar issues desde la UI

### Problema

Solo se puede cerrar en GitHub. El admin debe entrar al repositorio para marcar resuelto un reporte.

### Objetivo

Usuario con permiso **admin** puede **cerrar** (y opcionalmente **reabrir**) un issue de feedback desde ChessDash, reflejado en GitHub.

### Alcance

| Incluye | Excluye (v1) |
|--------|----------------|
| Acción **Cerrar issue** con confirmación | Borrar issues |
| Actualizar estado en UI y en listado FEAT-123 | Cambiar labels, asignados, título |
| Reabrir issue (admin) si estaba cerrado | Cierre masivo |

### Aceptación

1. Solo `requiredPermission="admin"` (o equivalente API) ve **Cerrar** / **Reabrir**.
2. `PATCH` vía GitHub API (`state: closed` / `open`); la UI refleja el nuevo estado sin recargar la página entera (invalidar consulta o respuesta del PATCH).
3. Registrar en log de actividad (extender LOG-FEAT-09): evento «feedback_issue_closed» / «feedback_issue_reopened» con número de issue y usuario admin.
4. Usuario no admin que intenta cerrar recibe 403.

### API (orientación)

- `PATCH /api/feedback/issues/{number}` body `{ "state": "open" | "closed" }` — admin only.

### Rama sugerida

`feature/11_124_feedback_admin_close` (o mismo epic que 123 si el equipo prefiere un solo PR grande; por regla del repo, preferir ramas separadas).

---

## Orden de implementación sugerido

1. **FEAT-123** lectura (list + comments) sin POST.
2. **FEAT-123** POST comentarios + adjuntos.
3. **FEAT-124** cierre/reapertura admin.
4. Polling o SSE liviano para sync GitHub → UI.

## Referencias

- GitHub REST: [Issues comments](https://docs.github.com/en/rest/issues/comments), [Update issue](https://docs.github.com/en/rest/issues/issues#update-an-issue).
- PR base Comentarios: [#275](https://github.com/cmessoftware/chessinsightai/pull/275) (FEAT-120…122).
