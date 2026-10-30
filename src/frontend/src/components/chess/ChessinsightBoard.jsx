import { useCallback, useMemo } from 'react'
import { Box } from '@mui/material'
import { Chessboard } from 'react-chessboard'
import {
    mergeSquareStyles,
    removeSquareCircleMark,
    squareCircleColorFromMouseEvent,
    squareCircleMarksToStyles,
    toggleSquareCircleMark,
} from '../../utils/coachBoardSquareCircles.js'

/**
 * Vite/React board aligned with docs/ai_chess_coach_course/ui/chessinsight_board/CONTRACT.md
 * Jupyter uses the same props via Chessground (vanilla JS).
 *
 * FEAT-075: squareCircles + onSquareCirclesChange — right-click rings; left-click clears mark.
 */
export default function ChessinsightBoard({
    fen,
    orientation = 'white',
    lastMove = null,
    viewOnly = false,
    onMove,
    boardWidth = 420,
    squareCircles = null,
    onSquareCirclesChange = null,
    enableSquareCircles = false,
}) {
    const circleMode = enableSquareCircles || typeof onSquareCirclesChange === 'function'

    const lastMoveStyles = useMemo(() => squaresFromUci(lastMove), [lastMove])
    const circleStyles = useMemo(
        () => squareCircleMarksToStyles(squareCircles),
        [squareCircles],
    )
    const squareStyles = useMemo(
        () => mergeSquareStyles(lastMoveStyles, circleStyles),
        [lastMoveStyles, circleStyles],
    )

    const handleSquareMouseDown = useCallback(
        ({ square }, e) => {
            if (!circleMode || viewOnly) return
            if (e.button === 0) {
                if (squareCircles?.[square]) {
                    onSquareCirclesChange?.(removeSquareCircleMark(squareCircles, square))
                }
                return
            }
            const colorKey = squareCircleColorFromMouseEvent(e)
            if (!colorKey) return
            e.preventDefault()
            e.stopPropagation()
            const next = toggleSquareCircleMark(squareCircles, square, colorKey)
            onSquareCirclesChange?.(next)
        },
        [circleMode, viewOnly, squareCircles, onSquareCirclesChange],
    )

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
                    return onMove({ from: sourceSquare, to: targetSquare, fen }) === true
                }
                return true
            },
            ...(circleMode
                ? {
                      onSquareMouseDown: handleSquareMouseDown,
                  }
                : {}),
        }),
        [
            fen,
            orientation,
            viewOnly,
            squareStyles,
            boardWidth,
            onMove,
            circleMode,
            handleSquareMouseDown,
        ],
    )

    return (
        <Box
            sx={{
                width: boardWidth,
                maxWidth: '100%',
                flexShrink: 0,
            }}
            onContextMenu={
                circleMode
                    ? (e) => {
                          e.preventDefault()
                      }
                    : undefined
            }
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
