import { resolveDisplaySpeedClass } from './coachSpeedClassLichess.js'
import { coachRhythmLabelForGame } from './coachRhythmLabel.js'
import { formatTimeControlDisplay } from './coachTimeControlDisplay.js'

export { formatClockLabel, formatTimeControlDisplay } from './coachTimeControlDisplay.js'

const SPEED_TITLES = {
    ultrabullet: 'UltraBullet',
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    daily: 'Correspondencia',
    correspondence: 'Correspondencia',
}

function speedClassTitle(speedClass) {
    const key = String(speedClass || '').trim().toLowerCase()
    if (!key || key === 'unknown') return null
    return SPEED_TITLES[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

export function coachGamePlayersLabel(game) {
    const custom = String(game?.display_title || '').trim()
    if (custom) return custom
    const white = String(game?.white_player || '').trim() || 'Blancas'
    const black = String(game?.black_player || '').trim() || 'Negras'
    return `${white} vs ${black}`
}

/** Partidas table «Partida» column (FEAT-055): white vs black only, no POV/ritmo. */
export function formatCoachPartidaTableLabel(game) {
    const white = String(game?.white_player || '').trim() || 'Blancas'
    const black = String(game?.black_player || '').trim() || 'Negras'
    return `${white} vs ${black}`
}

/** Ritmo column: speed class + numeric clock (FEAT-056). */
export function formatCoachRhythmDisplay(game) {
    const label = coachRhythmLabelForGame(game)
    return label || '—'
}

/** @param {Record<string, unknown>} game */
export function formatCoachGameDescription(game) {
    if (game?.description) {
        return String(game.description)
    }
    let line = coachGamePlayersLabel(game)
    const pov = String(game?.player_username || '').trim()
    if (pov) {
        line += ` · POV ${pov}`
    }
    const rhythm = []
    const displaySpeed = resolveDisplaySpeedClass(game?.speed_class, game?.time_control)
    const speedTitle = speedClassTitle(displaySpeed)
    const clock =
        game?.time_control_display ||
        formatTimeControlDisplay(game?.time_control, displaySpeed || game?.speed_class)
    if (speedTitle) rhythm.push(speedTitle)
    if (clock) rhythm.push(clock)
    if (rhythm.length) {
        line += ` (${rhythm.join(' ')})`
    }
    return line
}

/** PGN ``YYYY.MM.DD`` or ISO-ish strings for Partidas table. */
export function formatCoachDatePlayed(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return '—'
    const pgn = s.match(/^(\d{4})\.(\d{2})\.(\d{2})/)
    if (pgn) {
        return `${pgn[3]}/${pgn[2]}/${pgn[1]}`
    }
    const parsed = Date.parse(s)
    if (!Number.isNaN(parsed)) {
        return new Date(parsed).toLocaleDateString()
    }
    return s
}

export function formatCoachCatalogSource(game) {
    const value = game?.catalog_source || game?.source
    return value ? String(value) : '—'
}

/** Display ``coach_games.corpus_type`` as stored (no UI translation). */
export function formatCoachCorpusType(raw) {
    const value = String(raw ?? '').trim()
    return value || '—'
}

/** Standard ECO codes (e.g. C55, B90); some sources store opening URLs in ``eco``. */
const ECO_CODE_RE = /^[A-E]\d{2}(?:\/\d+)?$/i

/**
 * @returns {{ display: string, tooltip: string | null }}
 */
export function formatCoachEcoForDisplay(raw) {
    const s = String(raw ?? '').trim()
    if (!s) return { display: '—', tooltip: null }
    if (ECO_CODE_RE.test(s)) {
        return { display: s.toUpperCase(), tooltip: null }
    }
    if (/^https?:\/\//i.test(s) || s.length > 8) {
        return { display: '—', tooltip: s }
    }
    return { display: s, tooltip: null }
}
