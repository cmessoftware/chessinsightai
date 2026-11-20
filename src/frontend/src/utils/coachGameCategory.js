import { defaultCoachGameCategories, loadCoachGameCategories } from './coachGameCategoriesConfig.js'
import { getCoachGameCategoryOverrideIds } from './coachGameCategoryOverrides.js'
import { coachRhythmLabelForGame } from './coachRhythmLabel.js'
import { resolveDisplaySpeedClass } from './coachSpeedClassLichess.js'

function keywordsMatch(text, rawKeywords) {
    const hay = String(text || '').toLowerCase()
    const parts = String(rawKeywords || '')
        .split(/[,;]+/)
        .map((p) => p.trim().toLowerCase())
        .filter(Boolean)
    return parts.some((kw) => {
        if (kw.includes(' ')) return hay.includes(kw)
        const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        return re.test(hay)
    })
}

/** @param {object} game @param {{ type: string, value: string }} rule */
function ruleMatches(game, rule) {
    const source = String(game?.catalog_source || game?.source || '')
        .trim()
        .toLowerCase()
    const textParts = [
        game?.display_title,
        game?.opening,
        game?.catalog_source,
        game?.source,
    ]
    const tc = String(game?.time_control ?? '').trim()
    if (tc) {
        const rhythm = coachRhythmLabelForGame(game)
        if (rhythm) textParts.push(rhythm)
    } else if (game?.description) {
        textParts.push(game.description)
    }
    const text = textParts.filter(Boolean).join(' ')
    const corpus = String(game?.corpus_type || 'personal').trim().toLowerCase()
    const value = String(rule.value || '').trim().toLowerCase()

    switch (rule.type) {
        case 'source_contains':
            return Boolean(value) && source.includes(value)
        case 'corpus_type':
            return Boolean(value) && corpus === value
        case 'speed_class': {
            const effective = resolveDisplaySpeedClass(game?.speed_class, game?.time_control)
            return Boolean(value) && String(effective || '').toLowerCase() === value
        }
        case 'text_keywords':
            return keywordsMatch(text, rule.value)
        default:
            return false
    }
}

/** @param {object} game @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef} cat */
function categoryMatches(game, cat) {
    if (cat.enabled === false) return false
    if (cat.fallback) return false
    if (!cat.rules?.length) return false
    return cat.rules.some((r) => ruleMatches(game, r))
}

function resolveFromRules(game, list) {
    const sorted = [...list].sort((a, b) => a.priority - b.priority)

    for (const cat of sorted) {
        if (categoryMatches(game, cat)) {
            return { id: cat.id, label: cat.label, manual: false }
        }
    }

    const fallback =
        sorted.find((c) => c.fallback) ||
        sorted.find((c) => c.id === 'pgn') ||
        defaultCoachGameCategories().find((c) => c.fallback)
    return { id: fallback?.id || 'pgn', label: fallback?.label || 'Importación PGN', manual: false }
}

function categoryList(categories) {
    return (categories?.length ? categories : loadCoachGameCategories()).filter((c) => c.enabled !== false)
}

/**
 * All category ids that apply to a game (manual tags or automatic rule).
 * @param {object | null | undefined} game
 * @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef[] | null | undefined} categories
 * @param {Record<string, string[] | string> | null | undefined} overrides
 * @returns {string[]}
 */
export function resolveCoachGameCategoryIds(game, categories, overrides) {
    const list = categoryList(categories)
    const gameId = game?.id != null ? String(game.id) : ''
    const manualIds = getCoachGameCategoryOverrideIds(overrides, gameId)
    if (manualIds.length) {
        return manualIds.filter((id) => list.some((c) => c.id === id))
    }
    return [resolveFromRules(game, list).id]
}

/**
 * @param {object | null | undefined} game
 * @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef[] | null | undefined} categories
 * @param {Record<string, string[] | string> | null | undefined} overrides
 * @returns {{ id: string, label: string, manual: boolean }}
 */
export function resolveCoachGameCategory(game, categories, overrides) {
    const list = categoryList(categories)
    const gameId = game?.id != null ? String(game.id) : ''
    const manualIds = getCoachGameCategoryOverrideIds(overrides, gameId)
    if (manualIds.length) {
        const primaryId = manualIds[0]
        const match = list.find((c) => c.id === primaryId)
        if (match) {
            return { id: match.id, label: match.label, manual: true }
        }
    }

    return resolveFromRules(game, list)
}

/**
 * @param {object[]} games
 * @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef[] | null | undefined} categories
 * @param {Record<string, string[] | string> | null | undefined} overrides
 */
export function listCoachGameCategoryFilters(games, categories, overrides) {
    const list = categoryList(categories)
  /** @type {Map<string, { id: string, label: string, count: number }>} */
    const byId = new Map()
    for (const game of games || []) {
        for (const catId of resolveCoachGameCategoryIds(game, list, overrides)) {
            const cat = list.find((c) => c.id === catId)
            const label = cat?.label || catId
            const prev = byId.get(catId)
            if (prev) {
                prev.count += 1
            } else {
                byId.set(catId, { id: catId, label, count: 1 })
            }
        }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

/** @param {object} game @param {string | null} filterId @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef[] | null | undefined} categories @param {Record<string, string[] | string> | null | undefined} overrides */
export function coachGameMatchesCategoryFilter(game, filterId, categories, overrides) {
    if (!filterId || filterId === 'all') return true
    return resolveCoachGameCategoryIds(game, categories, overrides).includes(filterId)
}

/**
 * Advanced Fuente filter: any selected category (Torneo, Chess.com, corpus, …).
 * Empty selection does not filter. This does not assign a category.
 * @param {object} game
 * @param {string[] | null | undefined} sourceIds
 * @param {import('./coachGameCategoriesConfig.js').CoachGameCategoryDef[] | null | undefined} categories
 * @param {Record<string, string[] | string> | null | undefined} overrides
 */
export function coachGameMatchesSourceFilter(game, sourceIds, categories, overrides) {
    if (!sourceIds?.length) return true
    const ids = resolveCoachGameCategoryIds(game, categories, overrides)
    return sourceIds.some((sid) => ids.includes(sid))
}