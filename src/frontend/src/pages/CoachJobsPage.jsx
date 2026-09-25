import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
    createAnalysisJob,
    listGames,
    listJobs,
    parseApiDetail,
} from '../services/module07Service.js'

const statusColor = (status) => {
    if (status === 'completed') return 'success'
    if (status === 'failed') return 'error'
    if (status === 'running') return 'warning'
    return 'default'
}

function uniquePlayerNames(games) {
    const names = new Set()
    for (const g of games) {
        if (g.white_player) names.add(g.white_player)
        if (g.black_player) names.add(g.black_player)
    }
    return [...names].sort()
}

function namesForGameIds(allGames, gameIds) {
    const names = new Set()
    const idSet = new Set(gameIds)
    for (const g of allGames) {
        if (!idSet.has(g.id)) continue
        if (g.white_player) names.add(g.white_player)
        if (g.black_player) names.add(g.black_player)
    }
    return [...names].sort()
}

function handleMatchesGame(handle, game) {
    const key = handle.trim().toLowerCase()
    const w = (game.white_player || '').trim().toLowerCase()
    const b = (game.black_player || '').trim().toLowerCase()
    return key === w || key === b
}

function jobStatusForGame(game, jobStatusById) {
    if (!game.analysis_job_id) return null
    return game.analysis_job_status ?? jobStatusById.get(game.analysis_job_id) ?? null
}

/** Sin job, o último job failed → se puede encolar de nuevo. */
function canQueueAnalysis(game, jobStatusById) {
    if (!game.analysis_job_id) return true
    const st = jobStatusForGame(game, jobStatusById)
    return st === 'failed'
}

function canOpenReview(game, jobStatusById) {
    return jobStatusForGame(game, jobStatusById) === 'completed'
}

export default function CoachJobsPage() {
    const location = useLocation()
    const navigate = useNavigate()
    const [jobs, setJobs] = useState([])
    const [games, setGames] = useState([])
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(location.state?.message || null)
    const [playerHandle, setPlayerHandle] = useState('')
    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [analyzing, setAnalyzing] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const jobStatusById = useMemo(() => {
        const m = new Map()
        for (const j of jobs) m.set(j.id, j.status)
        return m
    }, [jobs])

    const queueableGames = useMemo(
        () => games.filter((g) => canQueueAnalysis(g, jobStatusById)),
        [games, jobStatusById]
    )
    const failedJobCount = useMemo(
        () => jobs.filter((j) => j.status === 'failed').length,
        [jobs]
    )

    const targetGameIds = useMemo(() => {
        if (selectedIds.size > 0) return [...selectedIds]
        return queueableGames.map((g) => g.id)
    }, [selectedIds, queueableGames])

    const playerOptions = useMemo(
        () => namesForGameIds(games, targetGameIds),
        [games, targetGameIds]
    )

    useEffect(() => {
        if (playerHandle && playerOptions.includes(playerHandle)) return
        if (playerOptions.length === 1) {
            setPlayerHandle(playerOptions[0])
        }
    }, [playerOptions, playerHandle])

    const refresh = useCallback(async () => {
        setRefreshing(true)
        try {
            const [j, g] = await Promise.all([listJobs(), listGames()])
            setJobs(j)
            setGames(g)
            setError(null)
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 5000)
        return () => clearInterval(timer)
    }, [refresh])

    useEffect(() => {
        setSelectedIds(new Set(queueableGames.map((g) => g.id)))
    }, [queueableGames])

    const toggleGame = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllQueueable = () => {
        if (selectedIds.size === queueableGames.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(queueableGames.map((g) => g.id)))
        }
    }

    const runAnalysis = async (gameIds, fallbackHandle = '') => {
        const handle = (playerHandle || fallbackHandle || '').trim()
        if (!handle) {
            setError(
                'Elegí el jugador a analizar (debe ser [White] o [Black] del PGN, no el login).'
            )
            return
        }
        if (!gameIds.length) {
            setError('Seleccioná al menos una partida pendiente o con job fallido.')
            return
        }
        const selectedGames = games.filter((g) => gameIds.includes(g.id))
        const mismatched = selectedGames.filter((g) => !handleMatchesGame(handle, g))
        if (mismatched.length) {
            const sample = mismatched[0]
            setError(
                `"${handle}" no figura en esa partida (White=${sample.white_player}, Black=${sample.black_player}).`
            )
            return
        }
        setError(null)
        setAnalyzing(true)
        try {
            await createAnalysisJob(gameIds, handle)
            if (gameIds.length === 1) {
                setInfo('Análisis encolado. Abriendo vista de partida…')
                await refresh()
                navigate(`/coach/games/${gameIds[0]}/analysis`)
                return
            }
            setInfo(`Análisis encolado para ${gameIds.length} partida(s).`)
            await refresh()
        } catch (err) {
            setError(err.message || parseApiDetail(err))
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">Coach — Cola de análisis</Typography>
                <Button variant="outlined" onClick={refresh} disabled={refreshing}>
                    {refreshing ? 'Actualizando…' : 'Actualizar'}
                </Button>
            </Box>
            {failedJobCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Jobs en <strong>failed</strong> son historial; usá <strong>Reintentar</strong> en
                    Partidas (jugador = nombre del PGN).
                </Alert>
            )}
            {info && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo(null)}>
                    {info}
                </Alert>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {String(error)}
                </Alert>
            )}
            <Paper sx={{ mb: 3 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Job</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell>Depth</TableCell>
                            <TableCell>MultiPV</TableCell>
                            <TableCell>Partidas</TableCell>
                            <TableCell>Error</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {jobs.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                    {job.id.slice(0, 8)}…
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        size="small"
                                        label={job.status}
                                        color={statusColor(job.status)}
                                    />
                                </TableCell>
                                <TableCell>{job.stockfish_depth}</TableCell>
                                <TableCell>{job.stockfish_multipv}</TableCell>
                                <TableCell>{job.game_ids?.length ?? 0}</TableCell>
                                <TableCell sx={{ maxWidth: 360, wordBreak: 'break-word' }}>
                                    {job.error_message || '—'}
                                </TableCell>
                            </TableRow>
                        ))}
                        {!jobs.length && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Sin jobs. Importá PGN y encolá análisis abajo.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
            <Typography variant="h6" gutterBottom>
                Partidas
            </Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Encolar análisis (una o varias partidas)
                </Typography>
                {playerOptions.length > 0 ? (
                    <FormControl fullWidth sx={{ mb: 2 }} required>
                        <InputLabel id="coach-player-label">Jugador a analizar</InputLabel>
                        <Select
                            labelId="coach-player-label"
                            value={playerHandle}
                            label="Jugador a analizar"
                            onChange={(e) => setPlayerHandle(e.target.value)}
                        >
                            {playerOptions.map((name) => (
                                <MenuItem key={name} value={name}>
                                    {name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) : (
                    <Alert severity="info" sx={{ mb: 2 }}>
                        No hay partidas pendientes o con job fallido para analizar.
                    </Alert>
                )}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        disabled={
                            analyzing || !queueableGames.length || selectedIds.size === 0
                        }
                        onClick={() => runAnalysis([...selectedIds])}
                    >
                        {analyzing ? 'Encolando…' : `Analizar selección (${selectedIds.size})`}
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={analyzing || !queueableGames.length}
                        onClick={() => runAnalysis(queueableGames.map((g) => g.id))}
                    >
                        Analizar todas ({queueableGames.length})
                    </Button>
                </Box>
            </Paper>
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={
                                        selectedIds.size > 0 &&
                                        selectedIds.size < queueableGames.length
                                    }
                                    checked={
                                        queueableGames.length > 0 &&
                                        selectedIds.size === queueableGames.length
                                    }
                                    disabled={!queueableGames.length}
                                    onChange={toggleAllQueueable}
                                />
                            </TableCell>
                            <TableCell>Blancas</TableCell>
                            <TableCell>Negras</TableCell>
                            <TableCell>Jugador POV</TableCell>
                            <TableCell>Estado análisis</TableCell>
                            <TableCell>Resultado</TableCell>
                            <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {games.map((g) => {
                            const queueable = canQueueAnalysis(g, jobStatusById)
                            const status =
                                jobStatusForGame(g, jobStatusById) ||
                                (g.analysis_job_id ? '—' : 'sin job')
                            return (
                                <TableRow key={g.id}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedIds.has(g.id)}
                                            disabled={!queueable}
                                            onChange={() => toggleGame(g.id)}
                                        />
                                    </TableCell>
                                    <TableCell>{g.white_player}</TableCell>
                                    <TableCell>{g.black_player}</TableCell>
                                    <TableCell>
                                        {g.player_username
                                            ? `${g.player_username} (${g.player_color || '?'})`
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="small"
                                            label={status}
                                            color={statusColor(status)}
                                            variant={status === 'sin job' ? 'outlined' : 'filled'}
                                        />
                                    </TableCell>
                                    <TableCell>{g.result || '—'}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            component={RouterLink}
                                            to={`/coach/games/${g.id}/analysis`}
                                            disabled={!canOpenReview(g, jobStatusById)}
                                        >
                                            Análisis
                                        </Button>
                                        {queueable && (
                                            <Button
                                                size="small"
                                                sx={{ ml: 1 }}
                                                disabled={analyzing}
                                                onClick={() =>
                                                    runAnalysis(
                                                        [g.id],
                                                        g.player_username || ''
                                                    )
                                                }
                                            >
                                                {jobStatusForGame(g, jobStatusById) === 'failed'
                                                    ? 'Reintentar'
                                                    : 'Analizar'}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                        {!games.length && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">
                                    Sin partidas importadas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    )
}
