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

const CURSOR_PREFIX = 'coach_analysis_cursor_v1:'

/** Último `cursorPath` en análisis liviano (JSON array de índices). */
export function saveCoachAnalysisCursor(gameId, cursorPath) {
    if (!gameId || !Array.isArray(cursorPath)) return
    try {
        sessionStorage.setItem(`${CURSOR_PREFIX}${gameId}`, JSON.stringify(cursorPath))
    } catch {
        /* ignore */
    }
}

export function loadCoachAnalysisCursor(gameId) {
    if (!gameId) return null
    try {
        const raw = sessionStorage.getItem(`${CURSOR_PREFIX}${gameId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : null
    } catch {
        return null
    }
}
