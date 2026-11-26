# FEAT-130 · Estados de flujo en Comentarios

**Relación:** FEAT-124 (cierre admin) · LOG-FEAT-10  
**Rama:** `feature/11_130_feedback_issue_workflow`

## Objetivo

Selector de estado al estilo GitHub Projects, etiquetas en español, visible para todos; **solo el rol `admin` de plataforma** puede cambiarlo.

## Estados

Backlog, Por hacer, En curso, En revisión, Finalizado, No planeado, Duplicado — sincronizados con etiquetas `estado:*` en el issue de GitHub y `open`/`closed` + `state_reason` cuando corresponde.

## API

- `PATCH /api/feedback/issues/{n}` con `{ "workflow_status": "<id>" }` — solo admin de plataforma.
- El hilo expone `can_manage_workflow`, `issue.workflow_status`, `issue.workflow_label`.

## UI

`FeedbackIssueWorkflowMenu` (admin) / chip lectura (resto). Confirmación cerrar/reabrir para admin de grupo: `CoachConfirmBadge` (FEAT-045).