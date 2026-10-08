import React from 'react'
import { Box, CircularProgress, Paper, Typography } from '@mui/material'
import { formatPlayerEval, formatPvOneLine } from '../../utils/engineEval.js'

function LineRow({ rank, evalText, lineSan }) {
    return (
        <Box
            sx={{
                display: 'flex',
                gap: 1.5,
                py: 0.75,
                px: 1,
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: 13,
                lineHeight: 1.45,
            }}
        >
            <Typography
                component="span"
                sx={{ fontFamily: 'inherit', fontSize: 'inherit', minWidth: 20, color: 'text.secondary' }}
            >
                {rank}
            </Typography>
            <Typography
                component="span"
                sx={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    minWidth: 52,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: evalText.startsWith('+')
                        ? 'success.main'
                        : evalText.startsWith('-')
                          ? 'error.main'
                          : 'text.primary',
                }}
            >
                {evalText}
            </Typography>
            <Typography
                component="span"
                sx={{ fontFamily: 'inherit', fontSize: 'inherit', flex: 1, wordBreak: 'break-word' }}
            >
                {lineSan}
            </Typography>
        </Box>
    )
}

/** Análisis Stockfish WASM en el navegador (navegación PGN). */
export default function LiveEnginePanel({ liveState, targetDepth, multipv }) {
    const { status, lines, depthReached, error } = liveState || {}

    return (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Análisis rápido (navegador)</Typography>
                {status === 'loading' && <CircularProgress size={16} />}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Stockfish lite WASM · objetivo depth {targetDepth}
                {multipv ? ` · MultiPV ${multipv}` : ''}
                {depthReached ? ` · alcanzado ${depthReached}` : ''}
            </Typography>
            {error && (
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                    {error}
                </Typography>
            )}
            {status === 'loading' && !lines.length && (
                <Typography variant="body2" color="text.secondary">
                    Calculando…
                </Typography>
            )}
            {lines.map((c) => (
                <LineRow
                    key={c.rank}
                    rank={c.rank}
                    evalText={formatPlayerEval(c.player_score)}
                    lineSan={formatPvOneLine(c)}
                />
            ))}
            {status === 'ready' && !lines.length && !error && (
                <Typography variant="body2" color="text.secondary">
                    Sin líneas.
                </Typography>
            )}
        </Paper>
    )
}
