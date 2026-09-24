import api from './api.js'

export async function ingestAndAnalyze(pgnText, playerUsername, options = {}) {
    const { corpusType = 'personal', source = 'pgn_upload' } = options
    const { data } = await api.post('/api/v1/module07/ingest-and-analyze', {
        pgn_text: pgnText,
        player_username: playerUsername,
        corpus_type: corpusType,
        source,
    })
    return data
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
