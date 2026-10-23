import { parsePlayerColor } from './coachEngineLabels.js'

/**
 * Color del jugador analizado (POV de evaluaciones en Coach).
 * @param {object | null | undefined} gameMeta
 * @param {object | null | undefined} [reviewPack]
 * @returns {'white' | 'black'}
 */
export function resolveCoachPlayerColor(gameMeta, reviewPack = null) {
    const explicit = reviewPack?.player_color ?? gameMeta?.player_color
    if (explicit != null && String(explicit).trim() !== '') {
        return parsePlayerColor(explicit)
    }
    const user = String(gameMeta?.player_username || '').trim().toLowerCase()
    if (user) {
        const w = String(gameMeta?.white_player || '').trim().toLowerCase()
        const b = String(gameMeta?.black_player || '').trim().toLowerCase()
        if (user === b) return 'black'
        if (user === w) return 'white'
    }
    return 'white'
}

/** @param {'white' | 'black'} color */
export function coachPlayerColorLabel(color) {
    return color === 'black' ? 'negras' : 'blancas'
}
