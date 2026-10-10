import { Chess } from 'chess.js'

/** chess.js only accepts a single game; multi-game exports fail parse. */
export function extractFirstGamePgnText(pgnText) {
    const text = (pgnText || '').trim()
    if (!text) return text
    const probe = new Chess()
    try {
        probe.loadPgn(text)
        return text
    } catch {
        /* fall through */
    }
    const chunks = text.split(/\n\n(?=\[)/)
    for (let end = 1; end <= chunks.length; end += 1) {
        const candidate = chunks.slice(0, end).join('\n\n')
        const chess = new Chess()
        try {
            chess.loadPgn(candidate)
            return candidate
        } catch {
            /* try longer slice */
        }
    }
    return chunks[0] || text
}

/** Replay main line from PGN for Coach study tree. */
export function buildReplayFromPgn(pgnText) {
    const singleGamePgn = extractFirstGamePgnText(pgnText)
    const chess = new Chess()
    try {
        chess.loadPgn(singleGamePgn)
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
