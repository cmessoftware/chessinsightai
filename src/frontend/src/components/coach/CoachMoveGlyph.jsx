import React from 'react'
import { Box } from '@mui/material'
import { glyphBadgeBox } from '../../utils/coachMoveGlyph.js'

const NAG_BADGE = {
    '!!': { bg: '#1baca6', fg: '#fff' },
    '!': { bg: '#629924', fg: '#fff' },
    '!?': { bg: '#5c8a2b', fg: '#fff' },
    '?!': { bg: '#e69f00', fg: '#fff' },
    '?': { bg: '#e69f00', fg: '#fff' },
    '??': { bg: '#ca3431', fg: '#fff' },
    '+-': { bg: '#f4f4f4', fg: '#222' },
    '-+': { bg: '#222', fg: '#fff' },
    '==': { bg: '#6b6b6b', fg: '#fff' },
}

/** FEAT-091: NAG glyph on the top-right of the piece that just moved. */
export default function CoachMoveGlyph({ square, nag, orientation = 'white', boardWidth }) {
    const symbol = String(nag || '').trim()
    if (!square || !symbol || !boardWidth) return null
    const box = glyphBadgeBox(square, orientation, boardWidth)
    const colors = NAG_BADGE[symbol] || { bg: '#333', fg: '#fff' }
    return (
        <Box
            aria-label={`Símbolo ${symbol}`}
            sx={{
                position: 'absolute',
                left: box.left,
                top: box.top,
                width: box.size,
                height: box.size,
                borderRadius: '50%',
                bgcolor: colors.bg,
                color: colors.fg,
                fontSize: symbol.length > 1 ? box.size * 0.34 : box.size * 0.48,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 2,
                lineHeight: 1,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.28)',
            }}
        >
            {symbol}
        </Box>
    )
}
