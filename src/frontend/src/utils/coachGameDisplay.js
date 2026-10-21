const SPEED_TITLES = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    daily: 'Correspondencia',
    correspondence: 'Correspondencia',
}

const CORRESPONDENCE = new Set(['daily', 'correspondence'])
const DAY_PERIODS = new Set([86400, 172800, 259200, 432000, 604800])

export function formatClockLabel(initialSeconds, increment) {
    const inc = Math.max(0, increment || 0)
    if (initialSeconds % 60 === 0) {
        return `${initialSeconds / 60}+${inc}`
    }
    return `${initialSeconds}s+${inc}`
}

function daysLabel(days) {
    return `${days}d`
}

export function formatTimeControlDisplay(raw, speedClass) {
    const key = String(speedClass || '').trim().toLowerCase()
    const tc = String(raw || '').trim()
    if (!tc || tc === '-' || tc === '*') return null
    if (tc.startsWith('-')) return null

    if (tc.includes('/')) {
        const [daysRaw, periodRaw] = tc.split('/')
        const days = Number.parseInt(daysRaw, 10)
        const period = Number.parseInt(String(periodRaw || '').split('+')[0], 10)
        if (Number.isFinite(days) && DAY_PERIODS.has(period)) {
            return daysLabel(days)
        }
    }

    if (CORRESPONDENCE.has(key)) {
        if (tc.includes('+')) return null
        const value = Number.parseInt(tc.split('/')[0], 10)
        if (!Number.isFinite(value)) return null
        if (value >= 86400 && value % 86400 === 0) {
            return daysLabel(value / 86400)
        }
        if (value >= 1 && value < 60) {
            return daysLabel(value)
        }
        return null
    }

    if (tc.includes('+')) {
        const [left, right] = tc.split('+')
        const base = left.split('/')[0]
        const initial = Number.parseInt(base, 10)
        const increment = Number.parseInt(right, 10) || 0
        if (Number.isFinite(initial)) {
            return formatClockLabel(initial, increment)
        }
        return tc
    }
    const base = tc.split('/')[0]
    const initial = Number.parseInt(base, 10)
    if (Number.isFinite(initial)) {
        return formatClockLabel(initial, 0)
    }
    return tc
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

/** @param {Record<string, unknown>} game */
export function formatCoachGameDescription(game) {
    const white = String(game?.white_player || '').trim()
    const black = String(game?.black_player || '').trim()
    if (!white && !black && !game?.display_title && game?.description) {
        return String(game.description)
    }
    let line = coachGamePlayersLabel(game)
    const pov = String(game?.player_username || '').trim()
    if (pov) {
        line += ` · POV ${pov}`
    }
    const rhythm = []
    const speedTitle = speedClassTitle(game?.speed_class)
    const clock = formatTimeControlDisplay(game?.time_control, game?.speed_class)
    if (speedTitle) rhythm.push(speedTitle)
    if (clock) rhythm.push(clock)
    if (rhythm.length) {
        line += ` (${rhythm.join(' ')})`
    }
    return line
}
