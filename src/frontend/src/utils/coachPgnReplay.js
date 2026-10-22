import { Chess } from 'chess.js'

const START_FEN = new Chess().fen()

export function extractFenHeader(pgnText) {
    const match = String(pgnText || '').match(/\[FEN\s+"([^"]+)"\]/i)
    return match ? match[1] : null
}

/** Insert ``[SetUp "1"]`` so chess.js loadPgn applies a FEN header. */
export function ensurePgnSetupHeader(pgnText) {
    const text = String(pgnText || '')
    if (!extractFenHeader(text)) return text
    if (/\[SetUp\s+"/i.test(text)) return text
    return text.replace(/(\[FEN\s+"[^"]+"\])/i, '[SetUp "1"]\n$1')
}

/** chess.js only accepts a single game; multi-game exports fail parse. */
export function extractFirstGamePgnText(pgnText) {
    const text = ensurePgnSetupHeader((pgnText || '').trim())
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
        const candidate = ensurePgnSetupHeader(chunks.slice(0, end).join('\n\n'))
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

function rootFenFromLoadedGame(chess, pgnText) {
    const fromHeader = extractFenHeader(pgnText)
    if (fromHeader) return fromHeader
    const headers = typeof chess.getHeaders === 'function' ? chess.getHeaders() : {}
    const fen = headers.FEN || headers.Fen
    if (fen) return fen
    return START_FEN
}

/** Replay main line from PGN for Coach study tree (supports FEN / SetUp studies). */
export function buildReplayFromPgn(pgnText) {
    const singleGamePgn = extractFirstGamePgnText(pgnText)
    const chess = new Chess()
    try {
        chess.loadPgn(ensurePgnSetupHeader(singleGamePgn))
    } catch {
        const fenOnly = extractFenHeader(singleGamePgn)
        if (fenOnly) {
            try {
                const board = new Chess(fenOnly)
                return { fens: [board.fen()], ucis: [], moves: [], moveCount: 0 }
            } catch {
                /* fall through */
            }
        }
        return { fens: [START_FEN], ucis: [], moves: [], moveCount: 0 }
    }
    const verbose = chess.history({ verbose: true })
    const rootFen = rootFenFromLoadedGame(chess, singleGamePgn)
    const walker = new Chess()
    const loaded = walker.load(rootFen)
    if (loaded === false) {
        return { fens: [START_FEN], ucis: [], moves: [], moveCount: 0 }
    }
    const fens = [walker.fen()]
    const ucis = []
    const moves = []
    for (let i = 0; i < verbose.length; i += 1) {
        const played = verbose[i]
        const applied = walker.move(played.san)
        if (!applied) break
        ucis.push(played.from + played.to + (played.promotion || ''))
        moves.push({
            ply: i + 1,
            san: played.san,
            color: played.color,
            moveNumber: played.moveNumber || Math.floor(i / 2) + 1,
        })
        fens.push(walker.fen())
    }
    return { fens, ucis, moves, moveCount: moves.length }
}
