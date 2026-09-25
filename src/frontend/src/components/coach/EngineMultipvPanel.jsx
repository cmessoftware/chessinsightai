import React from 'react'
import { Box, Paper, Typography } from '@mui/material'
import { formatPlayerEval, formatPvOneLine } from '../../utils/engineEval.js'

function LineRow({ rank, evalText, lineSan, highlight, suffix }) {
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
                bgcolor: highlight ? 'action.selected' : 'transparent',
                borderLeft: highlight ? 3 : 0,
                borderColor: highlight ? 'primary.main' : 'transparent',
            }}
        >
            <Typography
                component="span"
                sx={{ fontFamily: 'inherit', fontSize: 'inherit', minWidth: 20, color: 'text.secondary' }}
            >
                {rank != null ? rank : '·'}
            </Typography>
            <Typography
                component="span"
                sx={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    minWidth: 52,
                    textAlign: 'right',
                    fontWeight: 600,
                    color: evalText.startsWith('+') ? 'success.main' : evalText.startsWith('-') ? 'error.main' : 'text.primary',
                }}
            >
                {evalText}
            </Typography>
            <Typography
                component="span"
                sx={{ fontFamily: 'inherit', fontSize: 'inherit', flex: 1, wordBreak: 'break-word' }}
            >
                {lineSan}
                {suffix ? (
                    <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {suffix}
                    </Typography>
                ) : null}
            </Typography>
        </Box>
    )
}

/**
 * Lichess / Chess.com style MultiPV lines for one decision point.
 */
export default function EngineMultipvPanel({ pack, depth, multipv }) {
    if (!pack) {
        return (
            <Typography variant="body2" color="text.secondary">
                Sin datos de motor para este ply.
            </Typography>
        )
    }

    const candidates = pack.candidates || []
    const played = pack.played_move
    const playedSan = played?.san
    const playedInLines = candidates.some((c) => c.same_move || c.san === playedSan)

    const metaDepth = depth ?? pack.evidence?.depth
    const metaMultipv = multipv ?? pack.evidence?.multipv ?? candidates.length

    return (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">Variantes (MultiPV)</Typography>
                <Typography variant="caption" color="text.secondary">
                    {metaDepth ? `depth ${metaDepth}` : ''}
                    {metaMultipv ? ` · MultiPV ${metaMultipv}` : ''}
                </Typography>
            </Box>
            {candidates.map((c) => (
                <LineRow
                    key={c.rank ?? c.uci ?? c.san}
                    rank={c.rank}
                    evalText={formatPlayerEval(c.player_score)}
                    lineSan={formatPvOneLine(c)}
                    highlight={c.same_move || c.san === playedSan}
                    suffix={
                        c.same_move || c.san === playedSan
                            ? '(jugada en partida)'
                            : c.eval_gap_cp != null
                              ? `Δ ${c.eval_gap_cp} cp`
                              : ''
                    }
                />
            ))}
            {played && !playedInLines && (
                <LineRow
                    rank="—"
                    evalText={formatPlayerEval(played.player_score)}
                    lineSan={formatPvOneLine({ san: played.san, pv_san: played.pv_san })}
                    highlight
                    suffix="(jugada en partida, fuera del MultiPV)"
                />
            )}
            {!candidates.length && !played && (
                <Typography variant="body2" color="text.secondary">
                    No hay líneas MultiPV en el review pack.
                </Typography>
            )}
        </Paper>
    )
}
