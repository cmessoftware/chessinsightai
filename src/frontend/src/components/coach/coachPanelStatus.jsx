import React from 'react'
import { Button, Chip, Stack } from '@mui/material'

const SEVERITY_CHIP = {
    success: { color: 'success', variant: 'filled' },
    error: { color: 'error', variant: 'filled' },
    warning: { color: 'warning', variant: 'outlined' },
    info: { color: 'default', variant: 'outlined' },
}

/** Mensaje compacto (badge) en paneles Coach — sustituye barras Alert de ancho completo. */
export function CoachStatusBadge({ severity = 'info', children, onDismiss }) {
    const cfg = SEVERITY_CHIP[severity] || SEVERITY_CHIP.info
    return (
        <Chip
            size="small"
            color={cfg.color}
            variant={cfg.variant}
            onDelete={onDismiss || undefined}
            label={
                <span
                    style={{
                        whiteSpace: 'normal',
                        lineHeight: 1.35,
                        display: 'inline-block',
                        maxWidth: 'min(520px, 72vw)',
                    }}
                >
                    {children}
                </span>
            }
            sx={{
                height: 'auto',
                py: 0.35,
                '& .MuiChip-label': { px: 1 },
            }}
        />
    )
}

export function CoachStatusBadgeRow({ badges = [] }) {
    const visible = badges.filter(Boolean)
    if (!visible.length) return null
    return (
        <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ flex: 1, minWidth: 0 }}>
            {visible}
        </Stack>
    )
}

/** Confirmación inline (FEAT-045) — sustituye `window.confirm` en acciones PGN destructivas. */
export function CoachConfirmBadge({
    message,
    confirmLabel = 'Confirmar',
    onConfirm,
    onCancel,
}) {
    if (!message) return null
    return (
        <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} useFlexGap>
            <CoachStatusBadge severity="warning" onDismiss={onCancel}>
                {message}
            </CoachStatusBadge>
            <Button size="small" variant="contained" color="error" onClick={onConfirm}>
                {confirmLabel}
            </Button>
            <Button size="small" onClick={onCancel}>
                Cancelar
            </Button>
        </Stack>
    )
}
