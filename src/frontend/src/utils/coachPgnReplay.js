import { Chess } from 'chess.js'

/** Replay main line from PGN for Coach study tree. */
export function buildReplayFromPgn(pgnText) {
    const chess = new Chess()
    try {
        chess.loadPgn(pgnText)
    } catch {
        return { fens: [new Chess().fen()], ucis: [], moves: [], moveCount: 0 }
    }
    const verbose = chess.history({ verbose: true })
    const walker = new Chess()
    const fens = [walker.fen()]
    const ucis = []
    const moves = []
    for (let i = 0; i < verbose.length; i += 1) {
        const played = verbose[i]
        walker.move(played.san)
        ucis.push(played.from + played.to + (played.promotion || ''))
        moves.push({
            ply: i + 1,
            san: played.san,
            color: played.color,
            moveNumber: Math.floor(i / 2) + 1,
        })
        fens.push(walker.fen())
    }
    return { fens, ucis, moves, moveCount: verbose.length }
}
