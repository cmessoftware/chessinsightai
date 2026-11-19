import { Chess } from 'chess.js'

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

/** Tablero vacío para el editor de piezas (FEAT-039). */
export const EMPTY_BOARD_FEN = '8/8/8/8/8/8/8/8 w - - 0 1'

const SESSION_KEY = 'coach_position_fen_v1'

/**
 * Normaliza FEN pegado: trim, colapsa espacios, completa halfmove/fullmove si faltan.
 * @param {string} raw
 * @param {{ allowIllegal?: boolean }} [options] — con allowIllegal usa chess.js skipValidation (p. ej. dos reyes).
 * @returns {{ ok: true, fen: string } | { ok: false, error: string }}
 */
export function parseFenInput(raw, options = {}) {
    const trimmed = (raw || '').trim().replace(/\s+/g, ' ')
    if (!trimmed) {
        return { ok: false, error: 'Ingresá un FEN.' }
    }

    const parts = trimmed.split(' ')
    if (parts.length < 4) {
        return { ok: false, error: 'FEN incompleto (mínimo 4 campos: tablero, turno, en passant, enroque).' }
    }

    let fen = trimmed
    if (parts.length === 4) {
        fen = `${trimmed} 0 1`
    } else if (parts.length === 5) {
        fen = `${trimmed} 1`
    }

    try {
        const chess = options.allowIllegal
            ? new Chess(fen, { skipValidation: true })
            : new Chess(fen)
        return { ok: true, fen: chess.fen() }
    } catch {
        return { ok: false, error: 'No se pudo interpretar el FEN.' }
    }
}

/**
 * Instancia chess.js para edición libre de piezas en el tablero de posición.
 * @param {string} [rawFen]
 */
export function createFenEditorGame(rawFen) {
    const parsed = parseFenInput(rawFen || EMPTY_BOARD_FEN, { allowIllegal: true })
    const fen = parsed.ok ? parsed.fen : EMPTY_BOARD_FEN
    return new Chess(fen, { skipValidation: true })
}

export function loadPositionFenFromSession() {
    try {
        const v = sessionStorage.getItem(SESSION_KEY)
        if (!v) return null
        const parsed = parseFenInput(v)
        return parsed.ok ? parsed.fen : null
    } catch {
        return null
    }
}

export function savePositionFenToSession(fen) {
    try {
        if (fen) sessionStorage.setItem(SESSION_KEY, fen)
        else sessionStorage.removeItem(SESSION_KEY)
    } catch {
        /* ignore quota */
    }
}
