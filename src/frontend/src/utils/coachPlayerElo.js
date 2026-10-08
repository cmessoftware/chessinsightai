/**
 * Elo del jugador analizado desde metadatos de partida (spec §10).
 */

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseEloInt(raw) {
    if (raw == null || raw === '') return null
    const n = Number.parseInt(String(raw).replace(/[^\d]/g, ''), 10)
    if (!Number.isFinite(n) || n <= 0 || n >= 4000) return null
    return n
}

/**
 * @param {{ white_elo?: unknown, black_elo?: unknown } | null | undefined} game
 * @param {'white' | 'black'} playerColor
 * @returns {number | null}
 */
export function parsePlayerEloFromGame(game, playerColor) {
    if (!game) return null
    const white = parseEloInt(game.white_elo)
    const black = parseEloInt(game.black_elo)
    if (playerColor === 'black') return black ?? null
    return white ?? null
}

/** Elo del jugador que mueve en ese ply (umbrales de impacto v1). */
export function parseMoverEloFromGame(game, moverColor) {
    if (!game) return null
    if (moverColor === 'black') return parseEloInt(game.black_elo)
    return parseEloInt(game.white_elo)
}
