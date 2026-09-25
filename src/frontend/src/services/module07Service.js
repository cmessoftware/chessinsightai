import api from './api.js'

/** FastAPI detail: string, validation array, or fallback. */
export function parseApiDetail(err) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        return detail
            .map((item) => item.msg || item.message || JSON.stringify(item))
            .join(' · ')
    }
    return err.message || 'Error de API'
}

export async function ingestPgn(pgnText, options = {}) {
    const { corpusType = 'personal', source = 'pgn_upload' } = options
    const payload = {
        pgn_text: pgnText,
        corpus_type: corpusType,
        source,
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

export async function listGames() {
    const { data } = await api.get('/api/v1/module07/games')
    return data.games || []
}

export async function listDecisions(gameId) {
    const { data } = await api.get(`/api/v1/module07/games/${gameId}/decisions`)
    return data.decisions || []
}

export async function getDecision(decisionId) {
    const { data } = await api.get(`/api/v1/module07/decisions/${decisionId}`)
    return data
}
