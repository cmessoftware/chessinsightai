import api from './api.js'
import { blankStudyPgn } from '../utils/pgnHeaders.js'

/** FastAPI detail: string, validation array, or fallback. */
export function parseApiDetail(err) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') {
        if (
            detail.includes('coach_lichess_import_settings') &&
            detail.includes('does not exist')
        ) {
            return 'Falta la migración de Lichess en Postgres. En la raíz del repo ejecutá: alembic upgrade head (revisión 20261015_000001).'
        }
        if (detail.length > 320) {
            const oneLine = detail.split('\n').find((line) => /Error|UndefinedTable|ProgrammingError|HTTPException/i.test(line))
            if (oneLine) return oneLine.trim().slice(0, 280)
            return `${detail.slice(0, 280)}…`
        }
        return detail
    }
    if (Array.isArray(detail)) {
        return detail
            .map((item) => item.msg || item.message || JSON.stringify(item))
            .join(' · ')
    }
    return err.message || 'Error de API'
}

/** Empty starting position saved as a personal game, ready for the analysis board. */
export async function createBlankCoachGame() {
    const data = await ingestPgn(blankStudyPgn(), {
        corpusType: 'personal',
        source: 'manual',
    })
    const game = data?.games?.[0]
    if (!game?.id) {
        throw new Error('No se pudo crear la partida.')
    }
    return game
}

export async function ingestPgn(pgnText, options = {}) {
    const {
        corpusType = 'personal',
        source = 'pgn_upload',
        maxGames = null,
    } = options
    const payload = {
        pgn_text: pgnText,
        corpus_type: corpusType,
        source,
    }
    if (maxGames != null) {
        payload.max_games = maxGames
    }
    const { data } = await api.post('/api/v1/module07/ingest', payload)
    return data
}

export async function ingestAndAnalyze(pgnText, options = {}) {
    const {
        corpusType = 'personal',
        source = 'pgn_upload',
        playerUsername = null,
    } = options
    const payload = {
        pgn_text: pgnText,
        corpus_type: corpusType,
        source,
    }
    if (playerUsername) {
        payload.player_username = playerUsername
    }
    const { data } = await api.post('/api/v1/module07/ingest-and-analyze', payload)
    return data
}

export async function createAnalysisJob(gameIds, playerUsername, options = {}) {
    const {
        stockfishDepth = 12,
        stockfishMultipv = 3,
    } = options
    if (!Array.isArray(gameIds) || !gameIds.length) {
        throw new Error('game_ids vacío')
    }
    const name = (playerUsername || '').trim()
    if (!name) {
        throw new Error('player_username vacío')
    }
    try {
        const { data } = await api.post('/api/v1/module07/jobs', {
            game_ids: gameIds,
            player_username: name,
            stockfish_depth: stockfishDepth,
            stockfish_multipv: stockfishMultipv,
        })
        return data
    } catch (err) {
        const msg = parseApiDetail(err)
        const wrapped = new Error(msg)
        wrapped.response = err.response
        throw wrapped
    }
}

export async function listJobs() {
    const { data } = await api.get('/api/v1/module07/jobs')
    return data.jobs || []
}

/**
 * @typedef {Object} CoachPartidasListQuery
 * @property {string[]} [corpus_types]
 * @property {boolean} [opening_eco_or]
 * @property {string} [white_player]
 * @property {string} [black_player]
 * @property {string} [eco]
 * @property {string} [opening]
 * @property {string} [date_from]
 * @property {string} [date_to]
 * @property {string[]} [results]
 * @property {number} [limit]
 * @property {number} [offset]
 */

/** @param {CoachPartidasListQuery} [query] */
export async function listGames(query = {}) {
    const params = {}
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue
        if (Array.isArray(value)) {
            if (!value.length) continue
            params[key] = value
            continue
        }
        params[key] = value
    }
    const { data } = await api.get('/api/v1/module07/games', { params })
    return data.games || []
}

export async function listCoachCorpusTypes() {
    const { data } = await api.get('/api/v1/module07/games/corpus-types')
    return data.corpus_types || []
}

export async function patchCoachGameTitle(gameId, displayTitle) {
    const { data } = await api.patch(`/api/v1/module07/games/${gameId}`, {
        display_title: displayTitle,
    })
    return data
}

export async function patchCoachGameResult(gameId, result) {
    const { data } = await api.patch(`/api/v1/module07/games/${gameId}`, {
        result,
    })
    return data
}

export async function patchCoachGameManualAnalysis(gameId, manualAnalysis) {
    const { data } = await api.patch(`/api/v1/module07/games/${gameId}`, {
        manual_analysis: Boolean(manualAnalysis),
    })
    return data
}

export async function patchCoachGameStudyPgn(gameId, pgnText) {
    const { data } = await api.patch(`/api/v1/module07/games/${gameId}`, {
        pgn_text: pgnText,
    })
    return data
}

export async function getGame(gameId) {
    const { data } = await api.get(`/api/v1/module07/games/${gameId}`)
    return data
}

export async function listDecisions(gameId) {
    const { data } = await api.get(`/api/v1/module07/games/${gameId}/decisions`)
    return data.decisions || []
}

export async function getDecision(decisionId) {
    const { data } = await api.get(`/api/v1/module07/decisions/${decisionId}`)
    return data
}

export async function getGameAnnotations(gameId) {
    const { data } = await api.get(`/api/v1/module07/games/${gameId}/annotations`)
    return data
}

export async function putGameAnnotations(gameId, body) {
    const { data } = await api.put(`/api/v1/module07/games/${gameId}/annotations`, body)
    return data
}

export async function deleteCoachGame(gameId) {
    const { data } = await api.delete(`/api/v1/module07/games/${gameId}`)
    return data
}

export async function deleteCoachGames(gameIds) {
    const { data } = await api.post('/api/v1/module07/games/bulk-delete', {
        game_ids: gameIds,
    })
    return data
}

export async function bulkUpdateCoachGamesCorpus(gameIds, corpusType) {
    const { data } = await api.post('/api/v1/module07/games/bulk-corpus', {
        game_ids: gameIds,
        corpus_type: corpusType,
    })
    return data
}

export async function getLichessImportSettings() {
    const { data } = await api.get('/api/v1/module07/lichess-import/settings')
    return data
}

export async function saveLichessImportSettings(body) {
    const { data } = await api.put('/api/v1/module07/lichess-import/settings', body)
    return data
}

export async function runLichessImport(body = {}) {
    const { data } = await api.post('/api/v1/module07/lichess-import/run', body)
    return data
}

export async function getChesscomImportSettings() {
    const { data } = await api.get('/api/v1/module07/chesscom-import/settings')
    return data
}

export async function saveChesscomImportSettings(body) {
    const { data } = await api.put('/api/v1/module07/chesscom-import/settings', body)
    return data
}

export async function runChesscomImport(body = {}) {
    const { data } = await api.post('/api/v1/module07/chesscom-import/run', body)
    return data
}

export async function getPovBulkStatus() {
    const { data } = await api.get('/api/v1/module07/pov-bulk/status')
    return data
}

export async function applyPovBulk(body) {
    const { data } = await api.post('/api/v1/module07/pov-bulk/apply', body)
    return data
}

export async function rollbackPovBulk() {
    const { data } = await api.post('/api/v1/module07/pov-bulk/rollback')
    return data
}
