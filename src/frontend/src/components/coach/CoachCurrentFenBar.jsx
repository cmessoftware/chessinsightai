import React, { useCallback, useState } from 'react'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import ContentCopy from '@mui/icons-material/ContentCopy'
import { copyTextToClipboard } from '../../utils/coachPgnExport.js'

/** Posición actual (FEN) bajo el tablero — FEAT-022/023; enlace posición en FEAT-024. */
export default function CoachCurrentFenBar({ fen, maxWidth }) {
    const value = (fen || '').trim()
    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async () => {
        if (!value) return
        try {
            const ok = await copyTextToClipboard(value)
            if (ok) {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
            }
        } catch {
            /* clipboard denied */
        }
    }, [value])

    if (!value) return null

    return (
        <Box
            sx={{
                width: maxWidth,
                maxWidth: '100%',
                mt: 0.75,
                px: 0.5,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
            }}
        >
            <Typography
                variant="caption"
                component="div"
                title={value}
                sx={{
                    flex: 1,
                    minWidth: 0,
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
            <Tooltip title={copied ? 'FEN copiado' : 'Copiar FEN al portapapeles'}>
                <IconButton
                    size="small"
                    onClick={() => {
                        void handleCopy()
                    }}
                    aria-label="Copiar FEN al portapapeles"
                    sx={{ mt: -0.25, flexShrink: 0 }}
                >
                    <ContentCopy sx={{ fontSize: '0.95rem' }} />
                </IconButton>
            </Tooltip>
        </Box>
    )
}
