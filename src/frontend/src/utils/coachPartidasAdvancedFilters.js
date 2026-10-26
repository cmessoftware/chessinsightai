/** @typedef {import('../services/module07Service.js').CoachPartidasListQuery} CoachPartidasListQuery */

export const COACH_RESULT_FILTER_OPTIONS = ['1-0', '0-1', '1/2-1/2', '*']

/** @typedef {{ eco: string, name: string } | null} OpeningCatalogSelection */

export const EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS = {
    corpusTypes: [],
    whitePlayer: '',
    blackPlayer: '',
    eco: '',
    /** @type {OpeningCatalogSelection} */
    openingCatalog: null,
    dateFrom: '',
    dateTo: '',
    results: [],
}

/**
 * @param {typeof EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS} filters
 * @returns {boolean}
 */
export function coachPartidasAdvancedFiltersActive(filters) {
    if (!filters) return false
    return Boolean(
        filters.corpusTypes?.length ||
            String(filters.whitePlayer || '').trim() ||
            String(filters.blackPlayer || '').trim() ||
            String(filters.eco || '').trim() ||
            filters.openingCatalog?.eco ||
            String(filters.dateFrom || '').trim() ||
            String(filters.dateTo || '').trim() ||
            filters.results?.length,
    )
}

/**
 * @param {typeof EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS} filters
 * @returns {CoachPartidasListQuery}
 */
export function buildCoachPartidasListQuery(filters) {
    if (!coachPartidasAdvancedFiltersActive(filters)) {
        return {}
    }
    /** @type {CoachPartidasListQuery} */
    const query = {}
    if (filters.corpusTypes?.length) {
        query.corpus_types = [...filters.corpusTypes]
    }
    const white = String(filters.whitePlayer || '').trim()
    const black = String(filters.blackPlayer || '').trim()
    if (white) query.white_player = white
    if (black) query.black_player = black
    if (filters.openingCatalog?.eco && filters.openingCatalog?.name) {
        query.eco = filters.openingCatalog.eco
        query.opening = `*${filters.openingCatalog.name}*`
        query.opening_eco_or = true
    } else {
        const eco = String(filters.eco || '').trim()
        if (eco) query.eco = eco
    }
    const dateFrom = String(filters.dateFrom || '').trim()
    const dateTo = String(filters.dateTo || '').trim()
    if (dateFrom) query.date_from = dateFrom
    if (dateTo) query.date_to = dateTo
    if (filters.results?.length) {
        query.results = [...filters.results]
    }
    return query
}
