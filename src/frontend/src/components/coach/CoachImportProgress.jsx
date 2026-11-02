import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

/** FEAT-089: visible wait state while a game import request is in flight. */
export default function CoachImportProgress({ active, label = 'Importando partidas…' }) {
    if (!active) return null
    return (
        <Box
            role="status"
            aria-live="polite"
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, my: 1.5 }}
        >
            <CircularProgress size={22} />
            <Typography variant="body2">{label}</Typography>
        </Box>
    )
}
