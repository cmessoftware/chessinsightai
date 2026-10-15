import React from 'react'
import { Typography } from '@mui/material'

/** Posición actual (FEN) bajo el tablero — FEAT-022; copiar/enlace en FEAT-023/024. */
export default function CoachCurrentFenBar({ fen, maxWidth }) {
    const value = (fen || '').trim()
    if (!value) return null

    return (
        <Typography
            variant="caption"
            component="div"
            title={value}
            sx={{
                width: maxWidth,
                maxWidth: '100%',
                mt: 0.75,
                px: 0.5,
                color: 'text.secondary',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.68rem',
                lineHeight: 1.45,
                wordBreak: 'break-all',
                userSelect: 'text',
            }}
        >
            <Typography
                component="span"
                variant="caption"
                sx={{ fontWeight: 600, mr: 0.5, fontFamily: 'inherit' }}
            >
                FEN
            </Typography>
            {value}
        </Typography>
    )
}
