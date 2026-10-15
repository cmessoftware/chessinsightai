import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
    deleteCoachGame,
    deleteCoachGames,
    listGames,
    listJobs,
    parseApiDetail,
} from '../../services/module07Service.js'
import { COACH_RETURN_PARTIDAS } from './CoachSubNav.jsx'
import { CoachStatusBadge, CoachStatusBadgeRow } from './coachPanelStatus.jsx'

const statusColor = (status) => {
    if (status === 'completed') return 'success'
    if (status === 'failed') return 'error'
    if (status === 'running') return 'warning'
    return 'default'
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

function canQueueAnalysis(game, jobStatusById) {
    if (!game.analysis_job_id) return true
    const st = jobStatusForGame(game, jobStatusById)
    return st === 'failed'
}

function canOpenReview(game, jobStatusById) {
    return jobStatusForGame(game, jobStatusById) === 'completed'
}

function canDeleteGame(game, jobStatusById) {
    const st = jobStatusForGame(game, jobStatusById)
    return st !== 'pending' && st !== 'running'
}

function isClientAnalyzed(game) {
    return Boolean(game.client_analyzed || (game.client_analysis_ply_count ?? 0) > 0)
}

function serverStatusLabel(game, jobStatusById) {
    if (!game.analysis_job_id) return null
    return jobStatusForGame(game, jobStatusById) || '—'
}

function formatResult(result) {
    if (!result || result === '*') return 'Sin resultado'
    return result
}

const analysisLinkState = { returnTo: COACH_RETURN_PARTIDAS }

/** Cola module07 + tabla de partidas importadas (tab Coach → Partidas). */
export default function CoachGamesPanel() {
    const location = useLocation()
    const navigate = useNavigate()
    const [jobs, setJobs] = useState([])
    const [games, setGames] = useState([])
    const [error, setError] = useState(null)
    const [info, setInfo] = useState(location.state?.message || null)
    const [playerHandle, setPlayerHandle] = useState('')
    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [analyzing, setAnalyzing] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    const jobStatusById = useMemo(() => {
        const m = new Map()
        for (const j of jobs) m.set(j.id, j.status)
        return m
    }, [jobs])

    const queueableGames = useMemo(
        () => games.filter((g) => canQueueAnalysis(g, jobStatusById)),
        [games, jobStatusById],
    )

    const highlightGameIds = useMemo(
        () => new Set(location.state?.highlightGameIds || []),
        [location.state?.highlightGameIds],
    )

    const importedMetaById = useMemo(() => {
        const m = new Map()
        for (const g of location.state?.importedGames || []) {
            m.set(g.id, g.is_new)
        }
        return m
    }, [location.state?.importedGames])

    const failedJobCount = useMemo(
        () => jobs.filter((j) => j.status === 'failed').length,
        [jobs],
    )

    const targetGameIds = useMemo(() => {
        if (selectedIds.size > 0) return [...selectedIds]
        return queueableGames.map((g) => g.id)
    }, [selectedIds, queueableGames])

    const playerOptions = useMemo(
        () => namesForGameIds(games, targetGameIds),
        [games, targetGameIds],
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
        const fromImport = location.state?.highlightGameIds
        if (fromImport?.length) {
            const queueable = new Set(queueableGames.map((g) => g.id))
            setSelectedIds(new Set(fromImport.filter((id) => queueable.has(id))))
            return
        }
        setSelectedIds(new Set(queueableGames.map((g) => g.id)))
    }, [queueableGames, location.state?.highlightGameIds])

    const toggleGame = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllGames = () => {
        if (selectedIds.size === games.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(games.map((g) => g.id)))
        }
    }

    const selectedQueueableIds = useMemo(
        () => [...selectedIds].filter((id) => queueableGames.some((g) => g.id === id)),
        [selectedIds, queueableGames],
    )

    const handleDeleteGames = async (ids) => {
        const unique = [...new Set(ids)].filter(Boolean)
        if (!unique.length) return
        const msg =
            unique.length === 1
                ? '¿Eliminar esta partida de tu biblioteca Coach? Se borran análisis liviano y decisiones asociadas.'
                : `¿Eliminar ${unique.length} partidas de tu biblioteca Coach?`
        if (!window.confirm(msg)) return
        setDeleting(true)
        try {
            let deletedCount = unique.length
            let bulkResult = null
            if (unique.length === 1) {
                await deleteCoachGame(unique[0])
            } else {
                bulkResult = await deleteCoachGames(unique)
                deletedCount = bulkResult.deleted?.length ?? 0
                if (bulkResult.blocked?.length) {
                    setError(
                        `${deletedCount} eliminada(s); ${bulkResult.blocked.length} con job activo (pendiente/en ejecución).`,
                    )
                }
            }
            setSelectedIds((prev) => {
                const next = new Set(prev)
                for (const id of unique) next.delete(id)
                return next
            })
            await refresh()
            if (deletedCount > 0 && (unique.length === 1 || !bulkResult?.blocked?.length)) {
                setInfo(
                    deletedCount === 1
                        ? 'Partida eliminada.'
                        : `${deletedCount} partida(s) eliminada(s).`,
                )
            }
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setDeleting(false)
        }
    }

    const runAnalysis = async (gameIds, fallbackHandle = '') => {
        const handle = (playerHandle || fallbackHandle || '').trim()
        if (!handle) {
            setError(
                'Elegí el jugador a analizar (debe ser [White] o [Black] del PGN, no el login).',
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
                `"${handle}" no figura en esa partida (White=${sample.white_player}, Black=${sample.black_player}).`,
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
                navigate(`/coach/games/${gameIds[0]}/analysis`, { state: analysisLinkState })
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
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 1,
                    flexWrap: 'wrap',
                    mb: 2,
                }}
            >
                <CoachStatusBadgeRow
                    badges={[
                        failedJobCount > 0 ? (
                            <CoachStatusBadge key="failed-jobs" severity="warning">
                                Jobs en <strong>failed</strong> son historial; usá{' '}
                                <strong>Reintentar</strong> (jugador = nombre del PGN).
                            </CoachStatusBadge>
                        ) : null,
                        info ? (
                            <CoachStatusBadge
                                key="info"
                                severity="success"
                                onDismiss={() => setInfo(null)}
                            >
                                {info}
                            </CoachStatusBadge>
                        ) : null,
                        error ? (
                            <CoachStatusBadge
                                key="error"
                                severity="error"
                                onDismiss={() => setError(null)}
                            >
                                {String(error)}
                            </CoachStatusBadge>
                        ) : null,
                        !games.length ? (
                            <CoachStatusBadge key="empty-library" severity="info">
                                Importá partidas en <strong>Importar Partidas</strong> o analizá con{' '}
                                <strong>Posición (FEN)</strong>.
                            </CoachStatusBadge>
                        ) : null,
                    ]}
                />
                <Button variant="outlined" size="small" onClick={refresh} disabled={refreshing}>
                    {refreshing ? 'Actualizando…' : 'Actualizar'}
                </Button>
            </Box>
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
                Biblioteca de partidas
            </Typography>
            <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Encolar análisis en servidor (Stockfish)
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
                    <Box sx={{ mb: 2 }}>
                        <CoachStatusBadge severity="info">
                            No hay partidas pendientes o con job fallido para analizar.
                        </CoachStatusBadge>
                    </Box>
                )}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        disabled={
                            analyzing || !queueableGames.length || selectedIds.size === 0
                        }
                        onClick={() => runAnalysis(selectedQueueableIds)}
                    >
                        {analyzing
                            ? 'Encolando…'
                            : `Analizar selección (${selectedQueueableIds.length})`}
                    </Button>
                    <Button
                        variant="outlined"
                        disabled={analyzing || !queueableGames.length}
                        onClick={() => runAnalysis(queueableGames.map((g) => g.id))}
                    >
                        Analizar todas ({queueableGames.length})
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        disabled={deleting || selectedIds.size === 0}
                        onClick={() => handleDeleteGames([...selectedIds])}
                    >
                        {deleting
                            ? 'Eliminando…'
                            : `Eliminar selección (${selectedIds.size})`}
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
                                        selectedIds.size < games.length
                                    }
                                    checked={
                                        games.length > 0 &&
                                        selectedIds.size === games.length
                                    }
                                    disabled={!games.length}
                                    onChange={toggleAllGames}
                                />
                            </TableCell>
                            <TableCell>Blancas</TableCell>
                            <TableCell>Negras</TableCell>
                            <TableCell>Jugador POV</TableCell>
                            <TableCell>Análisis</TableCell>
                            <TableCell>Resultado</TableCell>
                            <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {games.map((g) => {
                            const queueable = canQueueAnalysis(g, jobStatusById)
                            const serverStatus = serverStatusLabel(g, jobStatusById)
                            const clientDone = isClientAnalyzed(g)
                            const importTag = importedMetaById.get(g.id)
                            return (
                                <TableRow
                                    key={g.id}
                                    selected={highlightGameIds.has(g.id)}
                                    sx={
                                        highlightGameIds.has(g.id)
                                            ? { bgcolor: 'action.hover' }
                                            : undefined
                                    }
                                >
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            checked={selectedIds.has(g.id)}
                                            onChange={() => toggleGame(g.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {g.white_player}
                                        {importTag !== undefined && (
                                            <Chip
                                                size="small"
                                                label={importTag ? 'Nueva' : 'Ya existía'}
                                                color={importTag ? 'success' : 'default'}
                                                variant="outlined"
                                                sx={{ ml: 1 }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>{g.black_player}</TableCell>
                                    <TableCell>
                                        {g.player_username
                                            ? `${g.player_username} (${g.player_color || '?'})`
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: 0.5,
                                            }}
                                        >
                                            {clientDone && (
                                                <Chip
                                                    size="small"
                                                    label={`Analizado liviano (${g.client_analysis_ply_count} jug.)`}
                                                    color="success"
                                                    variant="filled"
                                                />
                                            )}
                                            {serverStatus ? (
                                                <Chip
                                                    size="small"
                                                    label={`Stockfish: ${serverStatus}`}
                                                    color={statusColor(serverStatus)}
                                                    variant="filled"
                                                />
                                            ) : (
                                                !clientDone && (
                                                    <Chip
                                                        size="small"
                                                        label="Sin análisis"
                                                        variant="outlined"
                                                    />
                                                )
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>{formatResult(g.result)}</TableCell>
                                    <TableCell>
                                        <Button
                                            size="small"
                                            component={RouterLink}
                                            to={`/coach/games/${g.id}/analysis`}
                                            state={analysisLinkState}
                                        >
                                            {canOpenReview(g, jobStatusById)
                                                ? 'Review job'
                                                : clientDone
                                                  ? 'Revisar'
                                                  : 'Ver partida'}
                                        </Button>
                                        {queueable && (
                                            <Button
                                                size="small"
                                                sx={{ ml: 1 }}
                                                disabled={analyzing}
                                                onClick={() =>
                                                    runAnalysis(
                                                        [g.id],
                                                        g.player_username || '',
                                                    )
                                                }
                                            >
                                                {jobStatusForGame(g, jobStatusById) === 'failed'
                                                    ? 'Reintentar'
                                                    : 'Analizar'}
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            color="error"
                                            sx={{ ml: 1 }}
                                            disabled={
                                                deleting || !canDeleteGame(g, jobStatusById)
                                            }
                                            onClick={() => handleDeleteGames([g.id])}
                                        >
                                            Eliminar
                                        </Button>
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
