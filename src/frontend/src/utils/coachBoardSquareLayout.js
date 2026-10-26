/** Pixel overlay for a square on the coach board (white orientation = a1 bottom-left). */
export function squareOverlayBox(square, boardWidth, orientation = 'white') {
    const sq = boardWidth / 8
    const file = square.charCodeAt(0) - 97
    const rank = parseInt(square[1], 10) - 1
    if (file < 0 || file > 7 || rank < 0 || rank > 7) {
        return { left: 0, top: 0, width: sq, height: sq }
    }
    let col = file
    let row = 7 - rank
    if (orientation === 'black') {
        col = 7 - file
        row = rank
    }
    return {
        left: col * sq,
        top: row * sq,
        width: sq,
        height: sq,
    }
}
