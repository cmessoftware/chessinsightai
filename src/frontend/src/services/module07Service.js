import api from './api.js'

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

export async function listGames() {
    const { data } = await api.get('/api/v1/module07/games')
    return data.games || []
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
