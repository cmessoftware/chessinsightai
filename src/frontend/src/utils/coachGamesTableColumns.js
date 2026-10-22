export const COACH_GAMES_TABLE_COLUMNS_STORAGE_KEY = 'coach.partidas.tableColumns.v2'
const COACH_GAMES_TABLE_COLUMNS_STORAGE_KEY_V1 = 'coach.partidas.tableColumns.v1'

/** @typedef {'partida' | 'white_player' | 'black_player' | 'player_pov' | 'rhythm' | 'eco' | 'white_elo' | 'black_elo' | 'opening' | 'date_played' | 'source' | 'analysis' | 'result' | 'actions'} CoachGamesColumnId */

/** @type {{ id: CoachGamesColumnId, label: string, defaultVisible: boolean, locked?: boolean }[]} */
export const COACH_GAMES_TABLE_COLUMN_DEFS = [
    { id: 'partida', label: 'Partida', defaultVisible: true, locked: true },
    { id: 'white_player', label: 'Blancas', defaultVisible: true },
    { id: 'black_player', label: 'Negras', defaultVisible: true },
    { id: 'player_pov', label: 'Jugador POV', defaultVisible: true },
    { id: 'rhythm', label: 'Ritmo', defaultVisible: true },
    { id: 'eco', label: 'ECO', defaultVisible: true },
    { id: 'white_elo', label: 'Elo B', defaultVisible: true },
    { id: 'black_elo', label: 'Elo N', defaultVisible: true },
    { id: 'opening', label: 'Apertura', defaultVisible: true },
    { id: 'date_played', label: 'Fecha', defaultVisible: true },
    { id: 'source', label: 'Fuente', defaultVisible: true },
    { id: 'analysis', label: 'Análisis', defaultVisible: true },
    { id: 'result', label: 'Resultado', defaultVisible: true },
    { id: 'actions', label: 'Acciones', defaultVisible: true, locked: true },
]

const ALL_IDS = COACH_GAMES_TABLE_COLUMN_DEFS.map((c) => c.id)

/** @returns {Set<CoachGamesColumnId>} */
export function defaultVisibleCoachGamesColumns() {
    return new Set(
        COACH_GAMES_TABLE_COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.id),
    )
}

/** @param {unknown} raw */
export function normalizeVisibleCoachGamesColumns(raw) {
    const defaults = defaultVisibleCoachGamesColumns()
    if (!Array.isArray(raw)) {
        return defaults
    }
    const allowed = new Set(ALL_IDS)
    const next = new Set()
    for (const id of raw) {
        if (typeof id === 'string' && allowed.has(id)) {
            next.add(id)
        }
    }
    for (const def of COACH_GAMES_TABLE_COLUMN_DEFS) {
        if (def.locked) {
            next.add(def.id)
        }
    }
    if (next.size === 0) {
        return defaults
    }
    return next
}

/** @returns {Set<CoachGamesColumnId>} */
export function loadVisibleCoachGamesColumns() {
    if (typeof localStorage === 'undefined') {
        return defaultVisibleCoachGamesColumns()
    }
    try {
        let raw = localStorage.getItem(COACH_GAMES_TABLE_COLUMNS_STORAGE_KEY)
        if (!raw) {
            const legacy = localStorage.getItem(COACH_GAMES_TABLE_COLUMNS_STORAGE_KEY_V1)
            if (legacy) {
                const migrated = normalizeVisibleCoachGamesColumns(JSON.parse(legacy))
                migrated.add('rhythm')
                saveVisibleCoachGamesColumns(migrated)
                return migrated
            }
            return defaultVisibleCoachGamesColumns()
        }
        return normalizeVisibleCoachGamesColumns(JSON.parse(raw))
    } catch {
        return defaultVisibleCoachGamesColumns()
    }
}

/** @param {Set<CoachGamesColumnId>} visible */
export function saveVisibleCoachGamesColumns(visible) {
    if (typeof localStorage === 'undefined') {
        return
    }
    const normalized = normalizeVisibleCoachGamesColumns([...visible])
    localStorage.setItem(
        COACH_GAMES_TABLE_COLUMNS_STORAGE_KEY,
        JSON.stringify([...normalized]),
    )
}

/** @param {Set<CoachGamesColumnId>} visible @param {CoachGamesColumnId} id */
export function isCoachGamesColumnVisible(visible, id) {
    return visible.has(id)
}

/** Checkbox + actions column + visible data columns */
export function coachGamesTableColSpan(visible) {
    let n = 1
    for (const def of COACH_GAMES_TABLE_COLUMN_DEFS) {
        if (visible.has(def.id)) {
            n += 1
        }
    }
    return n
}
