/** FEAT-072: exportar PGN (con variantes guardadas en catálogo) de partidas seleccionadas. */

/**
 * @param {string} pgn
 * @returns {string}
 */
export function normalizePgnExportBlock(pgn) {
    return String(pgn || '').replace(/\r\n/g, '\n').trim()
}

/**
 * @param {string[]} pgns
 * @returns {string}
 */
export function joinGamePgnsForExport(pgns) {
    const blocks = pgns.map(normalizePgnExportBlock).filter(Boolean)
    return blocks.join('\n\n')
}

/**
 * @param {string} filename
 * @param {string} text
 */
export function downloadTextFile(filename, text) {
    const blob = new Blob([text], { type: 'application/x-chess-pgn;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
}

/**
 * @param {number | string} gameId
 * @returns {string}
 */
export function coachGamesExportFilename(gameId) {
    const stamp = new Date().toISOString().slice(0, 10)
    if (gameId != null && gameId !== '') {
        return `coach-partida-${gameId}-${stamp}.pgn`
    }
    return `coach-partidas-${stamp}.pgn`
}
