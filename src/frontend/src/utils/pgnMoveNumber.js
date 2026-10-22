/** PGN move numbers from the root FEN clock (supports black to move / non-1 start). */

export function initialPgnClock(fen) {
    const parts = String(fen || '').trim().split(/\s+/)
    return {
        side: parts[1] === 'b' ? 'b' : 'w',
        fullmove: Math.max(1, parseInt(parts[5] || '1', 10) || 1),
    }
}

export function sideToMoveAtPly(rootFen, plyBefore) {
    const start = initialPgnClock(rootFen)
    if (plyBefore % 2 === 0) return start.side
    return start.side === 'w' ? 'b' : 'w'
}

export function fullmoveNumberAtPly(rootFen, plyBefore) {
    const start = initialPgnClock(rootFen)
    if (start.side === 'w') {
        return start.fullmove + Math.floor(plyBefore / 2)
    }
    return start.fullmove + Math.floor((plyBefore + 1) / 2)
}
