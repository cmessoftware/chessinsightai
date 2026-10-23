import { Chess } from 'chess.js'

/** @typedef {'q' | 'r' | 'b' | 'n'} PromotionPiece */

/** Legal promotion piece codes for from→to, or [] if not a promotion. */
export function promotionChoicesForMove(fen, from, to) {
    if (!fen || !from || !to) return []
    try {
        const chess = new Chess(fen)
        const moves = chess
            .moves({ square: from, verbose: true })
            .filter((m) => m.to === to && m.promotion)
        const set = new Set(moves.map((m) => m.promotion))
        const order = ['q', 'r', 'b', 'n']
        return /** @type {PromotionPiece[]} */ (
            order.filter((p) => set.has(p))
        )
    } catch {
        return []
    }
}

export function isPromotionMove(fen, from, to) {
    return promotionChoicesForMove(fen, from, to).length > 0
}

export const PROMOTION_PIECE_GLYPH = Object.freeze({
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘',
})

export const PROMOTION_PIECE_LABEL = Object.freeze({
    q: 'Dama',
    r: 'Torre',
    b: 'Alfil',
    n: 'Caballo',
})
