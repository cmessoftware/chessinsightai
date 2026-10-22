import { Box, Typography } from '@mui/material'
import { capturedPieceGlyphs } from '../../utils/coachCapturedPieces.js'

function Strip({ label, glyphs, justifyContent }) {
    return (
        <Box
            sx={{
                width: '100%',
                minHeight: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent,
                px: 0.5,
            }}
        >
            <Typography
                component="span"
                aria-label={label}
                sx={{
                    fontSize: 18,
                    lineHeight: 1,
                    letterSpacing: 0.5,
                    userSelect: 'none',
                    opacity: glyphs ? 0.92 : 0.35,
                }}
            >
                {glyphs || '·'}
            </Typography>
        </Box>
    )
}

/** Captured mini-glyphs above and below the board; respects flip (bottom = your side). */
export default function CoachCapturedPiecesStack({
    orientation = 'white',
    capturedByWhite,
    capturedByBlack,
    boardWidth,
    children,
}) {
    const bottomColor = orientation === 'black' ? 'b' : 'w'
    const topColor = bottomColor === 'w' ? 'b' : 'w'
    const topCaptures = bottomColor === 'w' ? capturedByWhite : capturedByBlack
    const bottomCaptures = bottomColor === 'w' ? capturedByBlack : capturedByWhite
    const topGlyphs = capturedPieceGlyphs(topCaptures, bottomColor)
    const bottomGlyphs = capturedPieceGlyphs(bottomCaptures, topColor)

    return (
        <Box sx={{ width: boardWidth, maxWidth: '100%' }}>
            <Strip
                label="Piezas capturadas por el jugador de abajo"
                glyphs={topGlyphs}
                justifyContent="flex-end"
            />
            {children}
            <Strip
                label="Piezas capturadas por el jugador de arriba"
                glyphs={bottomGlyphs}
                justifyContent="flex-start"
            />
        </Box>
    )
}
