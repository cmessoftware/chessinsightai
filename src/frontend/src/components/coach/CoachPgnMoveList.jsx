import React, { useEffect, useMemo, useRef } from 'react'
import { Box, Paper, Typography } from '@mui/material'

/** Agrupa jugadas en pares (n. blancas negras) para visualización tipo PGN. */
export function groupSanMoves(moves) {
    if (!moves?.length) return []
    const rows = []
    let i = 0
    while (i < moves.length) {
        const first = moves[i]
        if (first.color === 'b') {
            rows.push({ moveNum: first.moveNumber ?? null, white: null, black: first })
            i += 1
            continue
        }
        const second = moves[i + 1]?.color === 'b' ? moves[i + 1] : null
        rows.push({
            moveNum: first.moveNumber ?? Math.floor(i / 2) + 1,
            white: first,
            black: second,
        })
        i += second ? 2 : 1
    }
    return rows
}

function MoveCell({ move, selected, onSelect, moveRef, align = 'left' }) {
    if (!move) {
        return <Box sx={{ minHeight: 28 }} />
    }
    return (
        <Box
            ref={selected ? moveRef : undefined}
            component="button"
            type="button"
            onClick={() => onSelect(move.ply)}
            aria-current={selected ? 'true' : undefined}
            aria-label={`Ir a ${move.san}`}
            sx={{
                border: 'none',
                background: 'none',
                font: 'inherit',
                cursor: 'pointer',
                width: '100%',
                textAlign: align,
                px: 1,
                py: 0.35,
                borderRadius: 0.5,
                color: 'text.primary',
                bgcolor: selected ? 'primary.main' : 'transparent',
                ...(selected ? { color: 'primary.contrastText' } : {}),
                '&:hover': {
                    bgcolor: selected ? 'primary.dark' : 'action.hover',
                },
            }}
        >
            {move.san}
        </Box>
    )
}

/**
 * Lista PGN clickeable; una fila por número de jugada (blancas | negras).
 */
export default function CoachPgnMoveList({
    moves = [],
    replayPly = 0,
    onGoPly,
    resultLabel = null,
    maxHeight = 520,
}) {
    const rows = useMemo(() => groupSanMoves(moves), [moves])
    const activeRef = useRef(null)

    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, [replayPly])

    const isSelected = (move) => move && replayPly === move.ply

    return (
        <Paper
            variant="outlined"
            sx={{
                p: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 280,
                maxHeight,
            }}
        >
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="subtitle2">PGN</Typography>
                {resultLabel && (
                    <Typography variant="caption" color="text.secondary">
                        {resultLabel}
                    </Typography>
                )}
            </Box>
            {!moves.length ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    Sin movimientos en esta partida.
                </Typography>
            ) : (
                <Box
                    sx={{
                        overflow: 'auto',
                        flex: 1,
                        typography: 'body2',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    }}
                >
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: '2.25rem 1fr 1fr',
                            gap: 0,
                            px: 0.5,
                            py: 0.25,
                            bgcolor: replayPly === 0 ? 'action.selected' : 'transparent',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ color: 'text.secondary', py: 0.5, pl: 0.5 }}>—</Box>
                        <Box sx={{ gridColumn: 'span 2' }}>
                            <MoveCell
                                move={{ ply: 0, san: 'Posición inicial' }}
                                selected={replayPly === 0}
                                onSelect={onGoPly}
                                moveRef={replayPly === 0 ? activeRef : undefined}
                            />
                        </Box>
                    </Box>
                    {rows.map((row) => {
                        const rowActive =
                            isSelected(row.white) || isSelected(row.black)
                        return (
                            <Box
                                key={`${row.moveNum}-${row.white?.ply ?? 'b'}`}
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: '2.25rem 1fr 1fr',
                                    gap: 0,
                                    px: 0.5,
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    bgcolor: rowActive ? 'action.hover' : 'transparent',
                                }}
                            >
                                <Box
                                    sx={{
                                        color: 'text.secondary',
                                        py: 0.5,
                                        pl: 0.5,
                                        userSelect: 'none',
                                    }}
                                >
                                    {row.moveNum != null ? `${row.moveNum}.` : '…'}
                                </Box>
                                <MoveCell
                                    move={row.white}
                                    selected={isSelected(row.white)}
                                    onSelect={onGoPly}
                                    moveRef={isSelected(row.white) ? activeRef : undefined}
                                />
                                <MoveCell
                                    move={row.black}
                                    selected={isSelected(row.black)}
                                    onSelect={onGoPly}
                                    moveRef={isSelected(row.black) ? activeRef : undefined}
                                />
                            </Box>
                        )
                    })}
                </Box>
            )}
        </Paper>
    )
}
