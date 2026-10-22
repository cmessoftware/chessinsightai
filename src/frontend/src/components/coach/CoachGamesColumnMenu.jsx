import React, { useState } from 'react'
import {
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Menu,
    Typography,
} from '@mui/material'
import { ViewColumn } from '@mui/icons-material'
import { COACH_GAMES_TABLE_COLUMN_DEFS } from '../../utils/coachGamesTableColumns.js'

export default function CoachGamesColumnMenu({ visibleColumns, onToggleColumn, onResetColumns }) {
    const [anchor, setAnchor] = useState(null)
    const open = Boolean(anchor)

    return (
        <>
            <Button
                size="small"
                variant="outlined"
                startIcon={<ViewColumn />}
                onClick={(e) => setAnchor(e.currentTarget)}
                aria-controls={open ? 'coach-games-columns-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
            >
                Columnas
            </Button>
            <Menu
                id="coach-games-columns-menu"
                anchorEl={anchor}
                open={open}
                onClose={() => setAnchor(null)}
                slotProps={{ paper: { sx: { px: 1.5, py: 1, maxWidth: 280 } } }}
            >
                <Typography variant="caption" color="text.secondary" sx={{ px: 1, display: 'block', mb: 0.5 }}>
                    Mostrar u ocultar columnas (se guarda en este navegador)
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
                            label={col.label}
                        />
                    ))}
                </FormGroup>
                <Button size="small" onClick={onResetColumns} sx={{ mt: 1 }}>
                    Restaurar todas
                </Button>
            </Menu>
        </>
    )
}
