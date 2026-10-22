export const COACH_PARTIDAS_COLUMNS_CHANGED = 'coach-partidas-columns-changed'

export function notifyCoachPartidasColumnsChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(COACH_PARTIDAS_COLUMNS_CHANGED))
    }
}
