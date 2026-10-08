import { useMemo } from 'react'
import { Box } from '@mui/material'
import { Chessboard } from 'react-chessboard'

/**
 * Vite/React board aligned with docs/ai_chess_coach_course/ui/chessinsight_board/CONTRACT.md
 * Jupyter uses the same props via Chessground (vanilla JS).
 */
export default function ChessinsightBoard({
    fen,
    orientation = 'white',
    lastMove = null,
    viewOnly = false,
    onMove,
    boardWidth = 420,
}) {
    const squareStyles = useMemo(() => squaresFromUci(lastMove), [lastMove])

    const options = useMemo(
        () => ({
            id: 'chessinsight-board',
            position: fen,
            boardOrientation: orientation === 'black' ? 'black' : 'white',
            allowDragging: !viewOnly,
            animationDurationInMs: 200,
            squareStyles,
            boardStyle: {
                width: `${boardWidth}px`,
                maxWidth: '100%',
                aspectRatio: '1 / 1',
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (viewOnly) {
                    return false
                }
                if (onMove) {
                    onMove({ from: sourceSquare, to: targetSquare, fen })
                }
                return true
            },
        }),
        [fen, orientation, viewOnly, squareStyles, boardWidth, onMove],
    )

    return (
        <Box
            sx={{
                width: boardWidth,
                maxWidth: '100%',
                flexShrink: 0,
            }}
        >
            <Chessboard options={options} />
        </Box>
    )
}

function squaresFromUci(uci) {
    if (!uci || String(uci).length < 4) {
        return {}
    }
    const from = uci.slice(0, 2)
    const to = uci.slice(2, 4)
    const paint = { backgroundColor: 'rgba(255, 255, 0, 0.45)' }
    return { [from]: paint, [to]: paint }
}
