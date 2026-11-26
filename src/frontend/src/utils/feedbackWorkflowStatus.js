/** Estados de flujo Comentarios (sincronizados con GitHub vía etiquetas estado:*). */

export const FEEDBACK_WORKFLOW_STATUSES = [
    {
        id: 'backlog',
        label: 'Backlog',
        chipColor: 'default',
        menuColor: 'success',
    },
    {
        id: 'todo',
        label: 'Por hacer',
        chipColor: 'success',
        menuColor: 'success',
    },
    {
        id: 'in_progress',
        label: 'En curso',
        chipColor: 'info',
        menuColor: 'success',
    },
    {
        id: 'in_review',
        label: 'En revisión',
        chipColor: 'warning',
        menuColor: 'success',
    },
    {
        id: 'done',
        label: 'Finalizado',
        chipColor: 'secondary',
        menuColor: 'secondary',
    },
    {
        id: 'not_planned',
        label: 'No planeado',
        chipColor: 'default',
        menuColor: 'default',
    },
    {
        id: 'duplicate',
        label: 'Duplicado',
        chipColor: 'default',
        menuColor: 'default',
    },
]

export function workflowStatusMeta(id) {
    return FEEDBACK_WORKFLOW_STATUSES.find((s) => s.id === id) || FEEDBACK_WORKFLOW_STATUSES[1]
}