import React from 'react'
import { Box, Button, Checkbox, FormControlLabel, FormGroup, Paper, Typography } from '@mui/material'
import { COACH_GAMES_TABLE_COLUMN_DEFS } from '../../utils/coachGamesTableColumns.js'

/** Preferencias de columnas visibles en Coach → Partidas (FEAT-052 dentro de Configuración). */
export default function CoachGamesColumnSettings({
    visibleColumns,
    onToggleColumn,
    onResetColumns,
    embedded = false,
}) {
    const body = (
        <>
            {!embedded && (
                <Typography variant="subtitle1" gutterBottom>
                    Columnas en la tabla Partidas
                </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Elegí qué campos mostrar en la biblioteca de partidas. La preferencia se guarda en
                este navegador.
            </Typography>
            <FormGroup>
                {COACH_GAMES_TABLE_COLUMN_DEFS.map((col) => (
                    <FormControlLabel
                        key={col.id}
                        control={
                            <Checkbox
                                size="small"
                                checked={visibleColumns.has(col.id)}
                                disabled={col.locked}
                                onChange={() => onToggleColumn(col.id)}
                            />
                        }
                        label={
                            col.locked ? `${col.label} (siempre visible)` : col.label
                        }
                    />
                ))}
            </FormGroup>
            <Box sx={{ mt: 2 }}>
                <Button size="small" variant="outlined" onClick={onResetColumns}>
                    Restaurar todas las columnas
                </Button>
            </Box>
        </>
    )
    if (embedded) return body
    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            {body}
        </Paper>
    )
}
