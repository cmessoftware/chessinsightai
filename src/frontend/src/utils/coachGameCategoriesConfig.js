export const COACH_GAME_CATEGORIES_STORAGE_KEY = 'coach.partidas.categories.v1'

/**
 * @typedef {{ type: 'source_contains' | 'text_keywords' | 'corpus_type' | 'speed_class', value: string }} CoachCategoryRule
 * @typedef {{
 *   id: string
 *   label: string
 *   priority: number
 *   enabled?: boolean
 *   builtIn?: boolean
 *   fallback?: boolean
 *   rules: CoachCategoryRule[]
 * }} CoachGameCategoryDef
 */

/** @returns {CoachGameCategoryDef[]} */
export function defaultCoachGameCategories() {
    return [
        {
            id: 'estudio',
            label: 'Estudios',
            priority: 10,
            builtIn: true,
            enabled: true,
            rules: [
                { type: 'source_contains', value: 'estudio' },
                { type: 'source_contains', value: 'study' },
                { type: 'source_contains', value: 'fen' },
                { type: 'source_contains', value: 'position' },
                { type: 'text_keywords', value: 'estudio' },
            ],
        },
        {
            id: 'tactico',
            label: 'Tema táctico',
            priority: 20,
            builtIn: true,
            enabled: true,
            rules: [
                {
                    type: 'text_keywords',
                    value: 'táctico,tactico,tactic,puzzle,ejercicio,ct-art,combinación,combinacion',
                },
                { type: 'source_contains', value: 'tactic' },
                { type: 'source_contains', value: 'puzzle' },
            ],
        },
        {
            id: 'torneo',
            label: 'Torneo',
            priority: 30,
            builtIn: true,
            enabled: true,
            rules: [
                {
                    type: 'text_keywords',
                    value: 'torneo,tournament,championship,campeonato,open,titled tuesday',
                },
            ],
        },
        {
            id: 'corpus_elite',
            label: 'Corpus elite',
            priority: 40,
            builtIn: true,
            enabled: true,
            rules: [{ type: 'corpus_type', value: 'elite' }],
        },
        {
            id: 'corpus_fide',
            label: 'Corpus FIDE',
            priority: 41,
            builtIn: true,
            enabled: true,
            rules: [{ type: 'corpus_type', value: 'fide' }],
        },
        {
            id: 'corpus_novice',
            label: 'Corpus novice',
            priority: 42,
            builtIn: true,
            enabled: true,
            rules: [{ type: 'corpus_type', value: 'novice' }],
        },
        {
            id: 'corpus_stockfish',
            label: 'Corpus Stockfish',
            priority: 43,
            builtIn: true,
            enabled: true,
            rules: [{ type: 'corpus_type', value: 'stockfish' }],
        },
        {
            id: 'lichess',
            label: 'Lichess',
            priority: 50,
            builtIn: true,
            enabled: true,
            rules: [{ type: 'source_contains', value: 'lichess' }],
        },
        {
            id: 'chesscom',
            label: 'Chess.com',
            priority: 60,
            builtIn: true,
            enabled: true,
            rules: [
                { type: 'source_contains', value: 'chess.com' },
                { type: 'source_contains', value: 'chesscom' },
            ],
        },
        {
            id: 'pgn',
            label: 'Importación PGN',
            priority: 100,
            builtIn: true,
            enabled: true,
            fallback: true,
            rules: [],
        },
    ]
}

function cloneCategory(cat) {
    return {
        ...cat,
        rules: (cat.rules || []).map((r) => ({ ...r })),
    }
}

/** @param {unknown} raw @returns {CoachGameCategoryDef[]} */
export function normalizeCoachGameCategories(raw) {
    const defaults = defaultCoachGameCategories()
    const byId = new Map(defaults.map((c) => [c.id, cloneCategory(c)]))

    if (!Array.isArray(raw)) {
        return [...byId.values()].sort((a, b) => a.priority - b.priority)
    }

    for (const item of raw) {
        if (!item || typeof item !== 'object') continue
        const id = String(item.id || '').trim()
        if (!id) continue
        const label = String(item.label || '').trim()
        const priority = Number(item.priority)
        const rules = Array.isArray(item.rules)
            ? item.rules
                  .map((r) => ({
                      type: r?.type,
                      value: String(r?.value ?? '').trim(),
                  }))
                  .filter(
                      (r) =>
                          ['source_contains', 'text_keywords', 'corpus_type', 'speed_class'].includes(
                              r.type,
                          ) &&
                          r.value,
                  )
            : []

        const existing = byId.get(id)
        if (existing) {
            byId.set(id, {
                ...existing,
                label: label || existing.label,
                priority: Number.isFinite(priority) ? priority : existing.priority,
                enabled: item.enabled !== false,
                rules: rules.length ? rules : existing.rules,
            })
        } else {
            byId.set(id, {
                id,
                label: label || id,
                priority: Number.isFinite(priority) ? priority : 70,
                enabled: item.enabled !== false,
                builtIn: false,
                fallback: Boolean(item.fallback),
                rules,
            })
        }
    }

    return [...byId.values()].sort((a, b) => a.priority - b.priority)
}

/** @returns {CoachGameCategoryDef[]} */
export function loadCoachGameCategories() {
    if (typeof localStorage === 'undefined') {
        return defaultCoachGameCategories()
    }
    try {
        const raw = localStorage.getItem(COACH_GAME_CATEGORIES_STORAGE_KEY)
        if (!raw) return defaultCoachGameCategories()
        return normalizeCoachGameCategories(JSON.parse(raw))
    } catch {
        return defaultCoachGameCategories()
    }
}

/** @param {CoachGameCategoryDef[]} categories */
export function saveCoachGameCategories(categories) {
    if (typeof localStorage === 'undefined') return
    const payload = normalizeCoachGameCategories(categories)
    localStorage.setItem(COACH_GAME_CATEGORIES_STORAGE_KEY, JSON.stringify(payload))
}

export function resetCoachGameCategories() {
    const next = defaultCoachGameCategories()
    saveCoachGameCategories(next)
    return next
}

export function slugifyCategoryId(label) {
    const base = String(label || 'categoria')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    return base ? `custom_${base}` : `custom_${Date.now()}`
}

/** @param {CoachGameCategoryDef} cat */
export function categoryRulesSummary(cat) {
    const parts = []
    for (const r of cat.rules || []) {
        if (r.type === 'corpus_type') parts.push(`corpus=${r.value}`)
        else if (r.type === 'source_contains') parts.push(`fuente ∋ "${r.value}"`)
        else if (r.type === 'text_keywords') parts.push(`texto: ${r.value}`)
        else if (r.type === 'speed_class') parts.push(`ritmo Lichess=${r.value}`)
    }
    if (cat.fallback) parts.push('(resto)')
    return parts.length ? parts.join(' · ') : '—'
}
