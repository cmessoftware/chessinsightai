/** Lichess perf buckets from PGN TimeControl base time (seconds per player). */

const SECONDS_PER_DAY = 86_400
const LICHESS_ULTRA_MAX_SECONDS = 29
const LICHESS_BULLET_MAX_SECONDS = 179
const LICHESS_BLITZ_MAX_SECONDS = 479
const LICHESS_RAPID_MAX_SECONDS = 1499

export function parseTimeControlBaseSeconds(raw) {
    const tc = String(raw || '').trim()
    if (!tc || tc === '-' || tc === '*' || tc.startsWith('-')) return null
    if (tc.includes('/')) {
        const slash = tc.indexOf('/')
        const movesPart = tc.slice(0, slash)
        const periodPart = tc.slice(slash + 1)
        const plus = periodPart.indexOf('+')
        const periodBase = plus >= 0 ? periodPart.slice(0, plus) : periodPart
        const period = Number.parseInt(periodBase.trim(), 10)
        const moves = Number.parseInt(movesPart.trim(), 10)
        if (Number.isFinite(period) && period >= SECONDS_PER_DAY && moves === 1) {
            return null
        }
        if (Number.isFinite(period) && period >= SECONDS_PER_DAY) {
            return null
        }
    }
    const base = tc.split('+')[0].split('/')[0]
    const initial = Number.parseInt(base.trim(), 10)
    return Number.isFinite(initial) ? initial : null
}

function lichessSpeedFromBaseSeconds(initial) {
    if (initial <= LICHESS_ULTRA_MAX_SECONDS) return 'ultrabullet'
    if (initial <= LICHESS_BULLET_MAX_SECONDS) return 'bullet'
    if (initial <= LICHESS_BLITZ_MAX_SECONDS) return 'blitz'
    if (initial <= LICHESS_RAPID_MAX_SECONDS) return 'rapid'
    return 'classical'
}

export function inferSpeedClassFromTimeControl(raw) {
    const tc = String(raw || '').trim()
    if (!tc || tc === '-' || tc === '*') return null
    if (tc.startsWith('-')) return 'daily'
    if (tc.includes('/')) {
        const slash = tc.indexOf('/')
        const periodPart = tc.slice(slash + 1)
        const plus = periodPart.indexOf('+')
        const periodBase = plus >= 0 ? periodPart.slice(0, plus) : periodPart
        const period = Number.parseInt(periodBase.trim(), 10)
        if (Number.isFinite(period) && period >= SECONDS_PER_DAY) {
            return 'daily'
        }
    }
    const initial = parseTimeControlBaseSeconds(tc)
    if (initial == null) return null
    return lichessSpeedFromBaseSeconds(initial)
}

export function resolveDisplaySpeedClass(storedSpeedClass, timeControl) {
    const inferred = inferSpeedClassFromTimeControl(timeControl)
    if (inferred) return inferred
    const key = String(storedSpeedClass || '').trim().toLowerCase()
    if (!key || key === 'unknown') return null
    return key
}
