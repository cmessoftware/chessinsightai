import {
    formatCoachCatalogSource,
    formatCoachEcoForDisplay,
    formatCoachRhythmDisplay,
} from './coachGameDisplay.js'

/** @typedef {'white_player' | 'black_player' | 'eco' | 'white_elo' | 'black_elo' | 'opening' | 'date_played' | 'source' | 'rhythm' | 'analysis' | 'result'} CoachGamesSortField */

/** @param {string | null | undefined} raw */
export function coachDateSortKey(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return ''
    const pgn = s.match(/^(\d{4})\.(\d{2})\.(\d{2})/)
    if (pgn) return `${pgn[1]}-${pgn[2]}-${pgn[3]}`
    const parsed = Date.parse(s)
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10)
    return s
}

/** @param {string | null | undefined} raw */
function resultSortKey(raw) {
    const s = String(raw ?? '').trim()
    if (!s || s === '*') return 'z'
    return s
}

/** @param {string | number | null | undefined} raw */
function eloSortKey(raw) {
    const n = Number.parseInt(String(raw ?? '').trim(), 10)
    return Number.isFinite(n) ? n : -1
}

/**
 * @param {Record<string, unknown>} game
 * @param {CoachGamesSortField} field
 * @param {{ jobStatusForGame?: (game: Record<string, unknown>) => string | null }} [ctx]
 */
export function coachGameSortKey(game, field, ctx = {}) {
    switch (field) {
        case 'white_player':
            return String(game.white_player ?? '').trim().toLowerCase()
        case 'black_player':
            return String(game.black_player ?? '').trim().toLowerCase()
        case 'eco':
            return formatCoachEcoForDisplay(game.eco).display.toLowerCase()
        case 'white_elo':
            return eloSortKey(game.white_elo)
        case 'black_elo':
            return eloSortKey(game.black_elo)
        case 'opening':
            return String(game.opening ?? '').trim().toLowerCase()
        case 'date_played':
            return coachDateSortKey(game.date_played)
        case 'source':
            return formatCoachCatalogSource(game).toLowerCase()
        case 'rhythm':
            return formatCoachRhythmDisplay(game).toLowerCase()
        case 'result':
            return resultSortKey(game.result)
        case 'analysis': {
            const ply = Number(game.client_analysis_ply_count) || 0
            const client = ply > 0 || game.client_analyzed ? 1 : 0
            const status = ctx.jobStatusForGame?.(game) ?? null
            const rank =
                {
                    completed: 50,
                    running: 40,
                    pending: 30,
                    failed: 20,
                }[status] ?? (game.analysis_job_id ? 10 : 0)
            return rank * 1000 + client * 100 + Math.min(ply, 99)
        }
        default:
            return ''
    }
}

/**
 * @param {Record<string, unknown>[]} games
 * @param {CoachGamesSortField | null} sortBy
 * @param {'asc' | 'desc'} sortDirection
 * @param {{ jobStatusForGame?: (game: Record<string, unknown>) => string | null }} [ctx]
 */
export function sortCoachGames(games, sortBy, sortDirection, ctx = {}) {
    if (!sortBy || !games.length) return games
    const dir = sortDirection === 'desc' ? -1 : 1
    const indexed = games.map((game, index) => ({ game, index }))
    indexed.sort((a, b) => {
        const ka = coachGameSortKey(a.game, sortBy, ctx)
        const kb = coachGameSortKey(b.game, sortBy, ctx)
        let cmp = 0
        if (typeof ka === 'number' && typeof kb === 'number') {
            cmp = ka - kb
        } else {
            cmp = String(ka).localeCompare(String(kb), undefined, { sensitivity: 'base' })
        }
        if (cmp !== 0) return cmp * dir
        return a.index - b.index
    })
    return indexed.map((row) => row.game)
}
