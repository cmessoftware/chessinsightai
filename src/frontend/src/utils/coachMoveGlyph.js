/** Destination square of a UCI move (`e2e4` → `e4`, `e7e8q` → `e8`). */
export function uciDestinationSquare(uci) {
    const text = String(uci || '')
    if (text.length < 4) return null
    const square = text.slice(2, 4)
    return /^[a-h][1-8]$/.test(square) ? square : null
}

/**
 * Top-right of the square, in the viewer's orientation.
 * @returns {{ left: number, top: number, size: number }}
 */
export function glyphBadgeBox(square, orientation, boardWidth) {
    const file = square.charCodeAt(0) - 97
    const rank = Number(square[1])
    const squareSize = boardWidth / 8
    const col = orientation === 'black' ? 7 - file : file
    const row = orientation === 'black' ? rank - 1 : 8 - rank
    const size = Math.max(14, Math.round(squareSize * 0.42))
    return {
        left: col * squareSize + squareSize - size - 1,
        top: row * squareSize + 1,
        size,
    }
}
