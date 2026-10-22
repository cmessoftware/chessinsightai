import { Chess } from 'chess.js'

const START_FEN = new Chess().fen()

export function extractFenHeader(pgnText) {
    const match = String(pgnText || '').match(/\[FEN\s+"([^"]+)"\]/i)
    return match ? match[1] : null
}

function hasMovetextAfterHeaders(pgnText) {
    const lines = String(pgnText || '').split(/\r?\n/)
    let pastHeaders = false
    for (const raw of lines) {
        const trimmed = raw.trim()
        if (!trimmed) {
            if (pastHeaders) return false
            continue
        }
        if (trimmed.startsWith('[')) {
            pastHeaders = false
            continue
        }
        return true
    }
    return false
}

/** Normalize SetUp when FEN is present (align with backend ``ensure_fen_setup_headers``). */
export function ensurePgnSetupHeader(pgnText) {
    const text = String(pgnText || '')
    if (!extractFenHeader(text)) return text
    if (/\[SetUp\s+"1"\]/i.test(text)) return text
    if (/\[SetUp\s+"/i.test(text)) {
        return text.replace(/\[SetUp\s+"[^"]*"\]/i, '[SetUp "1"]')
    }
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

function emptyReplay({ error = null, fens = [START_FEN] } = {}) {
    return { fens, ucis: [], moves: [], moveCount: 0, error }
}

/** Replay main line from PGN for Coach study tree (supports FEN / SetUp studies). */
export function buildReplayFromPgn(pgnText) {
    const singleGamePgn = extractFirstGamePgnText(pgnText)
    const fenHeader = extractFenHeader(singleGamePgn)
    const movetextPresent = hasMovetextAfterHeaders(singleGamePgn)

    if (fenHeader) {
        try {
            new Chess(fenHeader)
        } catch {
            return emptyReplay({ error: 'invalid_fen', fens: [START_FEN] })
        }
    }

    const chess = new Chess()
    try {
        chess.loadPgn(ensurePgnSetupHeader(singleGamePgn))
    } catch {
        if (fenHeader && !movetextPresent) {
            try {
                const board = new Chess(fenHeader)
                return {
                    fens: [board.fen()],
                    ucis: [],
                    moves: [],
                    moveCount: 0,
                    error: null,
                }
            } catch {
                return emptyReplay({ error: 'invalid_fen' })
            }
        }
        if (fenHeader && movetextPresent) {
            return emptyReplay({ error: 'invalid_movetext', fens: [fenHeader] })
        }
        return emptyReplay({ error: 'invalid_pgn' })
    }

    const verbose = chess.history({ verbose: true })
    const rootFen = rootFenFromLoadedGame(chess, singleGamePgn)
    const walker = new Chess()
    const loaded = walker.load(rootFen)
    if (loaded === false) {
        return emptyReplay({ error: 'invalid_fen' })
    }
    const fens = [walker.fen()]
    const ucis = []
    const moves = []
    for (let i = 0; i < verbose.length; i += 1) {
        const played = verbose[i]
        const applied = walker.move(played.san)
        if (!applied) {
            return {
                fens,
                ucis,
                moves,
                moveCount: moves.length,
                error: 'invalid_movetext',
            }
        }
        ucis.push(played.from + played.to + (played.promotion || ''))
        moves.push({
            ply: i + 1,
            san: played.san,
            color: played.color,
            moveNumber: played.moveNumber || Math.floor(i / 2) + 1,
        })
        fens.push(walker.fen())
    }
    return { fens, ucis, moves, moveCount: moves.length, error: null }
}
