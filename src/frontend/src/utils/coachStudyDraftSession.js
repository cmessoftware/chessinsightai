const DRAFT_PREFIX = 'coach_study_draft_v1:'

export function saveCoachStudyDraft(gameId, pgnText) {
    if (!gameId || !pgnText) return
    try {
        sessionStorage.setItem(`${DRAFT_PREFIX}${gameId}`, String(pgnText))
    } catch {
        /* ignore quota */
    }
}

export function loadCoachStudyDraft(gameId) {
    if (!gameId) return null
    try {
        return sessionStorage.getItem(`${DRAFT_PREFIX}${gameId}`)
    } catch {
        return null
    }
}

export function clearCoachStudyDraft(gameId) {
    if (!gameId) return
    try {
        sessionStorage.removeItem(`${DRAFT_PREFIX}${gameId}`)
    } catch {
        /* ignore */
    }
}
