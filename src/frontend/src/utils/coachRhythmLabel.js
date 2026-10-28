import { resolveDisplaySpeedClass } from './coachSpeedClassLichess.js'
import { formatTimeControlDisplay } from './coachTimeControlDisplay.js'

const SPEED_TITLES = {
    ultrabullet: 'UltraBullet',
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    daily: 'Correspondencia',
    correspondence: 'Correspondencia',
}

/** Same rhythm string as Partidas column (for category rules). */
export function coachRhythmLabelForGame(game) {
    const displaySpeed = resolveDisplaySpeedClass(game?.speed_class, game?.time_control)
    const speedTitle = displaySpeed ? SPEED_TITLES[displaySpeed] || displaySpeed : null
    const clock =
        game?.time_control_display ||
        formatTimeControlDisplay(game?.time_control, displaySpeed || game?.speed_class)
    const parts = []
    if (speedTitle) parts.push(speedTitle)
    if (clock) parts.push(clock)
    return parts.length ? parts.join(' ') : ''
}
