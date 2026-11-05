/** @typedef {import('../services/module07Service.js').CoachPartidasListQuery} CoachPartidasListQuery */

export const COACH_RESULT_FILTER_OPTIONS = ['1-0', '0-1', '1/2-1/2', '*']

export const COACH_RHYTHM_FILTER_OPTIONS = [
    { value: 'ultrabullet', label: 'UltraBullet' },
    { value: 'bullet', label: 'Bullet' },
    { value: 'blitz', label: 'Blitz' },
    { value: 'rapid', label: 'Rapid' },
    { value: 'classical', label: 'Classical' },
    { value: 'daily', label: 'Correspondencia' },
]

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
    importedFrom: '',
    importedTo: '',
    rhythms: [],
    studyName: '',
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
            String(filters.importedFrom || '').trim() ||
            String(filters.importedTo || '').trim() ||
            filters.rhythms?.length ||
            String(filters.studyName || '').trim() ||
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
    const importedFrom = String(filters.importedFrom || '').trim()
    const importedTo = String(filters.importedTo || '').trim()
    if (importedFrom) query.imported_from = importedFrom
    if (importedTo) query.imported_to = importedTo
    if (filters.rhythms?.length) {
        query.rhythms = [...filters.rhythms]
    }
    const studyName = String(filters.studyName || '').trim()
    if (studyName) query.study_name = studyName
    if (filters.results?.length) {
        query.results = [...filters.results]
    }
    return query
}
