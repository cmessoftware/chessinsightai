import { Chess } from 'chess.js'

const PIECE_ORDER = ['q', 'r', 'b', 'n', 'p']

/** @typedef {'p'|'n'|'b'|'r'|'q'} PieceType */

/**
 * Captured piece types along the variation path from ``root`` (inclusive of ``path``).
 * @returns {{ capturedByWhite: PieceType[], capturedByBlack: PieceType[] }}
 */
export function computeCapturedPiecesFromTree(root, path) {
    const capturedByWhite = []
    const capturedByBlack = []
    if (!root?.fen) {
        return { capturedByWhite, capturedByBlack }
    }
    const chess = new Chess(root.fen)
    let node = root
    for (const idx of path || []) {
        const child = node.children?.[idx]
        if (!child?.uci || child.uci.length < 4) {
            break
        }
        const from = child.uci.slice(0, 2)
        const to = child.uci.slice(2, 4)
        const promotion = child.uci.length > 4 ? child.uci[4] : undefined
        let move
        try {
            move = chess.move({ from, to, promotion })
        } catch {
            break
        }
        if (move?.captured) {
            if (move.color === 'w') {
                capturedByWhite.push(move.captured)
            } else {
                capturedByBlack.push(move.captured)
            }
        }
        node = child
    }
    return {
        capturedByWhite: sortCapturedTypes(capturedByWhite),
        capturedByBlack: sortCapturedTypes(capturedByBlack),
    }
}

/** @param {PieceType[]} types */
export function sortCapturedTypes(types) {
    const counts = { q: 0, r: 0, b: 0, n: 0, p: 0 }
    for (const t of types) {
        if (counts[t] !== undefined) {
            counts[t] += 1
        }
    }
    const out = []
    for (const key of PIECE_ORDER) {
        for (let i = 0; i < counts[key]; i += 1) {
            out.push(key)
        }
    }
    return out
}

const GLYPH = {
    w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
    b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' },
}

/** Render glyphs for pieces captured by ``takerColor`` (victim color is the opposite). */
export function capturedPieceGlyphs(types, takerColor) {
    const victim = takerColor === 'w' ? 'b' : 'w'
    return types.map((t) => GLYPH[victim][t] || '').join('')
}
