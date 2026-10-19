const SECONDS_PER_DAY = 86_400

const SPEED_TITLES = {
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    daily: 'Correspondencia',
    correspondence: 'Correspondencia',
}

function formatCorrespondenceDays(periodSeconds) {
    const days = periodSeconds / SECONDS_PER_DAY
    let whole = Math.round(days)
    if (whole < 1) whole = 1
    return whole === 1 ? '1 día' : `${whole} días`
}

const DAILY_SPEED = new Set(['daily', 'correspondence'])

function tryCorrespondenceSlashTimeControl(tc, dailySpeed = false) {
    if (!tc.includes('/')) return null
    const slash = tc.indexOf('/')
    const movesPart = tc.slice(0, slash)
    const periodPart = tc.slice(slash + 1)
    const plus = periodPart.indexOf('+')
    const periodBase = plus >= 0 ? periodPart.slice(0, plus) : periodPart
    const moves = Number.parseInt(movesPart.trim(), 10)
    const period = Number.parseInt(periodBase.trim(), 10)
    if (!Number.isFinite(moves) || !Number.isFinite(period)) return null
    if (period < SECONDS_PER_DAY) return null
    if (moves !== 1 && !dailySpeed) return null
    return formatCorrespondenceDays(period)
}

export function formatClockLabel(initialSeconds, increment) {
    const inc = Math.max(0, increment || 0)
    if (initialSeconds % 60 === 0) {
        return `${initialSeconds / 60}+${inc}`
    }
    return `${initialSeconds}s+${inc}`
}

export function formatTimeControlDisplay(raw, speedClass) {
    const tc = String(raw || '').trim()
    if (!tc || tc === '-' || tc === '*') return null
    if (tc.startsWith('-')) return null
    const dailySpeed = DAILY_SPEED.has(String(speedClass || '').trim().toLowerCase())
    const correspondence = tryCorrespondenceSlashTimeControl(tc, dailySpeed)
    if (correspondence) return correspondence
    if (dailySpeed && tc.includes('/')) return null
    if (tc.includes('+')) {
        const [left, right] = tc.split('+')
        const base = left.split('/')[0]
        const initial = Number.parseInt(base, 10)
        const increment = Number.parseInt(right, 10) || 0
        if (Number.isFinite(initial)) {
            if (dailySpeed && initial < SECONDS_PER_DAY) return null
            return formatClockLabel(initial, increment)
        }
        return tc
    }
    const base = tc.split('/')[0]
    const initial = Number.parseInt(base, 10)
    if (Number.isFinite(initial)) {
        if (dailySpeed && initial < SECONDS_PER_DAY) return null
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
        formatTimeControlDisplay(game?.time_control, game?.speed_class)
    if (speedTitle) rhythm.push(speedTitle)
    if (clock) rhythm.push(clock)
    if (rhythm.length) {
        line += ` (${rhythm.join(' ')})`
    }
    return line
}
