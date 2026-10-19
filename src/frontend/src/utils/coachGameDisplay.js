const SPEED_TITLES = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    daily: 'Correspondencia',
}

export function formatClockLabel(initialSeconds, increment) {
    const inc = Math.max(0, increment || 0)
    if (initialSeconds % 60 === 0) {
        return `${initialSeconds / 60}+${inc}`
    }
    return `${initialSeconds}s+${inc}`
}

export function formatTimeControlDisplay(raw) {
    const tc = String(raw || '').trim()
    if (!tc || tc === '-' || tc === '*') return null
    if (tc.startsWith('-')) return null
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

/** @param {Record<string, unknown>} game */
export function formatCoachGameDescription(game) {
    if (game?.description) {
        return String(game.description)
    }
    const white = String(game?.white_player || '').trim() || 'Blancas'
    const black = String(game?.black_player || '').trim() || 'Negras'
    let line = `${white} vs ${black}`
    const pov = String(game?.player_username || '').trim()
    if (pov) {
        line += ` · POV ${pov}`
    }
    const rhythm = []
    const speedTitle = speedClassTitle(game?.speed_class)
    const clock =
        game?.time_control_display ||
        formatTimeControlDisplay(game?.time_control)
    if (speedTitle) rhythm.push(speedTitle)
    if (clock) rhythm.push(clock)
    if (rhythm.length) {
        line += ` (${rhythm.join(' ')})`
    }
    return line
}
