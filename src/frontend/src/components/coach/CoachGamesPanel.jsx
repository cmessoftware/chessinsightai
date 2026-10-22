import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
} from '@mui/material'
import { Analytics, Check, Close, DeleteOutline, EditOutlined, Visibility } from '@mui/icons-material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
    createAnalysisJob,
    deleteCoachGame,
    deleteCoachGames,
    listGames,
    listJobs,
    parseApiDetail,
    patchCoachGameResult,
    patchCoachGameTitle,
} from '../../services/module07Service.js'
import { COACH_RETURN_PARTIDAS } from './CoachSubNav.jsx'
import {
    CoachConfirmBadge,
    CoachStatusBadge,
    CoachStatusBadgeRow,
} from './coachPanelStatus.jsx'
import {
    coachGamePlayersLabel,
    formatCoachCatalogSource,
    formatCoachDatePlayed,
    formatCoachGameDescription,
} from '../../utils/coachGameDisplay.js'

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

function viewGameActionLabel(game, jobStatusById, clientDone) {
    if (canOpenReview(game, jobStatusById)) return 'Review job'
    if (clientDone) return 'Revisar'
    return 'Ver partida'
}

function analyzeGameActionLabel(game, jobStatusById) {
    return jobStatusForGame(game, jobStatusById) === 'failed' ? 'Reintentar' : 'Analizar'
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

const RESULT_OPTIONS = [
    { value: '1-0', label: '1-0' },
    { value: '0-1', label: '0-1' },
    { value: '1/2-1/2', label: '1/2-1/2' },
    { value: '*', label: 'Sin resultado' },
]

function ResultadoCell({ game, onSaved, onError }) {
    const [editing, setEditing] = useState(false)
    const current = !game.result || game.result === '*' ? '*' : game.result
    const [draft, setDraft] = useState(current)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!editing) setDraft(!game.result || game.result === '*' ? '*' : game.result)
    }, [game, editing])

    const save = async () => {
        setSaving(true)
        try {
            const updated = await patchCoachGameResult(game.id, draft)
            onSaved(updated)
            setEditing(false)
        } catch (err) {
            onError(parseApiDetail(err))
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 160 }}>
                <Select
                    size="small"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={saving}
                    sx={{ minWidth: 120 }}
                >
                    {RESULT_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </MenuItem>
                    ))}
                </Select>
                <IconButton size="small" onClick={save} disabled={saving} aria-label="Guardar resultado">
                    <Check fontSize="small" />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    aria-label="Cancelar"
                >
                    <Close fontSize="small" />
                </IconButton>
            </Box>
        )
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" component="span">
                {formatResult(game.result)}
            </Typography>
            <Tooltip title="Cambiar resultado">
                <IconButton
                    size="small"
                    onClick={() => setEditing(true)}
                    aria-label="Editar resultado"
                >
                    <EditOutlined fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
    )
}

function PartidaTitleCell({ game, importTag, onSaved, onError }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(() => coachGamePlayersLabel(game))
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!editing) setDraft(coachGamePlayersLabel(game))
    }, [game, editing])

    const save = async () => {
        const title = draft.trim()
        if (!title) {
            onError('La descripción no puede estar vacía.')
            return
        }
        setSaving(true)
        try {
            const updated = await patchCoachGameTitle(game.id, title)
            onSaved(updated)
            setEditing(false)
        } catch (err) {
            onError(parseApiDetail(err))
        } finally {
            setSaving(false)
        }
    }

    if (editing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 220 }}>
                <TextField
                    size="small"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') save()
                        if (e.key === 'Escape') setEditing(false)
                    }}
                    disabled={saving}
                    fullWidth
                    autoFocus
                    placeholder="Blancas vs Negras"
                />
                <IconButton size="small" onClick={save} disabled={saving} aria-label="Guardar descripción">
                    <Check fontSize="small" />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    aria-label="Cancelar"
                >
                    <Close fontSize="small" />
                </IconButton>
            </Box>
        )
    }

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" component="span">
                {formatCoachGameDescription(game)}
            </Typography>
            <Tooltip title="Cambiar descripción">
                <IconButton
                    size="small"
                    onClick={() => {
                        setDraft(coachGamePlayersLabel(game))
                        setEditing(true)
                    }}
                    aria-label="Editar descripción de la partida"
                >
                    <EditOutlined fontSize="small" />
                </IconButton>
            </Tooltip>
            {importTag !== undefined && (
                <Chip
                    size="small"
                    label={importTag ? 'Nueva' : 'Ya existía'}
                    color={importTag ? 'success' : 'default'}
                    variant="outlined"
                />
            )}
        </Box>
    )
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
    const [pendingDelete, setPendingDelete] = useState(null)
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

    const initialSelectionDone = useRef(false)
    const importHighlightKey = useRef(null)

    useEffect(() => {
        const fromImport = location.state?.highlightGameIds
        const highlightKey =
            fromImport?.length > 0 ? fromImport.slice().sort().join(',') : null
        if (highlightKey && importHighlightKey.current !== highlightKey) {
            importHighlightKey.current = highlightKey
            initialSelectionDone.current = true
            const queueable = new Set(queueableGames.map((g) => g.id))
            setSelectedIds(new Set(fromImport.filter((id) => queueable.has(id))))
            return
        }
        if (initialSelectionDone.current || !games.length) return
        initialSelectionDone.current = true
        setSelectedIds(new Set(queueableGames.map((g) => g.id)))
    }, [queueableGames, games.length, location.state?.highlightGameIds])

    useEffect(() => {
        const valid = new Set(games.map((g) => g.id))
        setSelectedIds((prev) => {
            if (!prev.size) return prev
            const next = new Set([...prev].filter((id) => valid.has(id)))
            return next.size === prev.size ? prev : next
        })
    }, [games])

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

    const executeDeleteGames = async (ids) => {
        const unique = [...new Set(ids)].filter(Boolean)
        if (!unique.length) return
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

    const requestDeleteGames = (ids) => {
        const unique = [...new Set(ids)].filter(Boolean)
        if (!unique.length) return
        const message =
            unique.length === 1
                ? '¿Eliminar esta partida de tu biblioteca Coach? Se borran análisis liviano y decisiones asociadas.'
                : `¿Eliminar ${unique.length} partidas de tu biblioteca Coach?`
        setPendingDelete({
            ids: unique,
            message,
            confirmLabel: unique.length === 1 ? 'Eliminar partida' : 'Eliminar selección',
        })
    }

    const confirmPendingDelete = () => {
        if (!pendingDelete?.ids?.length) return
        const ids = pendingDelete.ids
        setPendingDelete(null)
        void executeDeleteGames(ids)
    }

    const cancelPendingDelete = () => setPendingDelete(null)

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
            {pendingDelete && (
                <Box sx={{ mb: 2 }}>
                    <CoachConfirmBadge
                        message={pendingDelete.message}
                        confirmLabel={pendingDelete.confirmLabel}
                        onConfirm={confirmPendingDelete}
                        onCancel={cancelPendingDelete}
                    />
                </Box>
            )}
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
                        onClick={() => requestDeleteGames([...selectedIds])}
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
                            <TableCell>Partida</TableCell>
                            <TableCell>Jugador POV</TableCell>
                            <TableCell>ECO</TableCell>
                            <TableCell>Elo B</TableCell>
                            <TableCell>Elo N</TableCell>
                            <TableCell>Apertura</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Fuente</TableCell>
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
                                        <PartidaTitleCell
                                            game={g}
                                            importTag={importTag}
                                            onSaved={(updated) => {
                                                setGames((prev) =>
                                                    prev.map((row) =>
                                                        row.id === updated.id
                                                            ? { ...row, ...updated }
                                                            : row,
                                                    ),
                                                )
                                            }}
                                            onError={setError}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {g.player_username
                                            ? `${g.player_username} (${g.player_color || '?'})`
                                            : '—'}
                                    </TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                                        {g.eco || '—'}
                                    </TableCell>
                                    <TableCell>{g.white_elo || '—'}</TableCell>
                                    <TableCell>{g.black_elo || '—'}</TableCell>
                                    <TableCell
                                        sx={{
                                            maxWidth: 160,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {g.opening || '—'}
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {formatCoachDatePlayed(g.date_played)}
                                    </TableCell>
                                    <TableCell>{formatCoachCatalogSource(g)}</TableCell>
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
                                    <TableCell>
                                        <ResultadoCell
                                            game={g}
                                            onSaved={(updated) => {
                                                setGames((prev) =>
                                                    prev.map((row) =>
                                                        row.id === updated.id
                                                            ? { ...row, ...updated }
                                                            : row,
                                                    ),
                                                )
                                            }}
                                            onError={setError}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.25,
                                            }}
                                        >
                                            <Tooltip
                                                title={viewGameActionLabel(
                                                    g,
                                                    jobStatusById,
                                                    clientDone,
                                                )}
                                            >
                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    component={RouterLink}
                                                    to={`/coach/games/${g.id}/analysis`}
                                                    state={analysisLinkState}
                                                    aria-label={viewGameActionLabel(
                                                        g,
                                                        jobStatusById,
                                                        clientDone,
                                                    )}
                                                >
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {queueable && (
                                                <Tooltip
                                                    title={analyzeGameActionLabel(
                                                        g,
                                                        jobStatusById,
                                                    )}
                                                >
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            disabled={analyzing}
                                                            aria-label={analyzeGameActionLabel(
                                                                g,
                                                                jobStatusById,
                                                            )}
                                                            onClick={() =>
                                                                runAnalysis(
                                                                    [g.id],
                                                                    g.player_username || '',
                                                                )
                                                            }
                                                        >
                                                            <Analytics fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Eliminar">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        disabled={
                                                            deleting ||
                                                            !canDeleteGame(g, jobStatusById)
                                                        }
                                                        aria-label="Eliminar"
                                                        onClick={() =>
                                                            requestDeleteGames([g.id])
                                                        }
                                                    >
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </Box>
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
