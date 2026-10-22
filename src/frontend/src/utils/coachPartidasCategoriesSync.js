export const COACH_PARTIDAS_CATEGORIES_CHANGED = 'coach-partidas-categories-changed'

export function notifyCoachPartidasCategoriesChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(COACH_PARTIDAS_CATEGORIES_CHANGED))
    }
}
