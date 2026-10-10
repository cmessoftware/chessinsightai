const KEY = 'coach_last_game_id_v1'

export function saveCoachLastGameId(gameId) {
    if (!gameId) return
    try {
        sessionStorage.setItem(KEY, String(gameId))
    } catch {
        /* ignore */
    }
}

export function loadCoachLastGameId() {
    try {
        return sessionStorage.getItem(KEY)
    } catch {
        return null
    }
}
