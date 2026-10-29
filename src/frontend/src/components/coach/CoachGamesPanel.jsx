import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Autocomplete,
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
    TablePagination,
    TableRow,
    TableSortLabel,
    Tooltip,
    Typography,
} from '@mui/material'
import {
    Analytics,
    Check,
    Close,
    DeleteOutline,
    EditOutlined,
    FileDownload,
    Visibility,
} from '@mui/icons-material'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
    createAnalysisJob,
    deleteCoachGame,
    deleteCoachGames,
    getGame,
    listCoachCorpusTypes,
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
    formatCoachCatalogSource,
    formatCoachCorpusType,
    formatCoachDatePlayed,
    formatCoachEcoForDisplay,
    formatCoachPartidaTableLabel,
    formatCoachRhythmDisplay,
} from '../../utils/coachGameDisplay.js'
import { sortCoachGames } from '../../utils/coachGamesSort.js'
import {
    coachGameMatchesCategoryFilter,
    listCoachGameCategoryFilters,
    resolveCoachGameCategory,
} from '../../utils/coachGameCategory.js'
import { loadCoachGameCategories } from '../../utils/coachGameCategoriesConfig.js'
import {
    loadCoachGameCategoryOverrides,
    setCoachGameCategoryOverride,
    setCoachGameCategoryOverridesBulk,
} from '../../utils/coachGameCategoryOverrides.js'
import { COACH_PARTIDAS_CATEGORIES_CHANGED } from '../../utils/coachPartidasCategoriesSync.js'
import {
    coachGamesTableColSpan,
    loadVisibleCoachGamesColumns,
} from '../../utils/coachGamesTableColumns.js'
import { COACH_PARTIDAS_COLUMNS_CHANGED } from '../../utils/coachPartidasColumnsSync.js'
import CoachConfigSectionAccordion from './CoachConfigSectionAccordion.jsx'
import {
    buildCoachPartidasListQuery,
    COACH_RESULT_FILTER_OPTIONS,
    coachPartidasAdvancedFiltersActive,
    EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
} from '../../utils/coachPartidasAdvancedFilters.js'
import {
    formatOpeningCatalogLabel,
    loadEcoOpeningsCatalog,
    searchEcoOpeningsCatalog,
} from '../../utils/coachOpeningCatalog.js'
import {
    coachGamesExportFilename,
    downloadTextFile,
    joinGamePgnsForExport,
} from '../../utils/coachGamesPgnExport.js'

const COACH_JOBS_PAGE_SIZE = 5
const COACH_GAMES_PAGE_SIZE = 20

const paginationLabelRows = ({ from, to, count }) =>
    `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`

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

const COACH_CATEGORY_AUTO = '__auto__'

const RESULT_OPTIONS = [
    { value: '1-0', label: '1-0' },
    { value: '0-1', label: '0-1' },
    { value: '1/2-1/2', label: '1/2-1/2' },
    { value: '*', label: 'Sin resultado' },
]

/** Columnas numéricas/código: ocupan solo el ancho del contenido (no reparten espacio extra). */
const compactTableColSx = { width: '1%', whiteSpace: 'nowrap', px: 1 }
const ecoTableColSx = {
    ...compactTableColSx,
    maxWidth: 52,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: 'monospace',
    fontSize: 12,
}

const playerNameColSx = {
    maxWidth: 120,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
}

function SortableGamesHeader({ children, field, sortBy, sortDirection, onSort, sx }) {
    const active = sortBy === field
    return (
        <TableCell sx={sx} sortDirection={active ? sortDirection : false}>
            <TableSortLabel
                active={active}
                direction={active ? sortDirection : 'asc'}
                onClick={() => onSort(field)}
            >
                {children}
            </TableSortLabel>
        </TableCell>
    )
}

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

function PartidaCategoryCell({ game, categories, overrides, onOverridesChange }) {
    const effective = resolveCoachGameCategory(game, categories, overrides)
    const automatic = resolveCoachGameCategory(game, categories, {})
    const selectValue = effective.manual ? effective.id : COACH_CATEGORY_AUTO
    const enabledCategories = useMemo(
        () =>
            [...(categories || [])]
                .filter((c) => c.enabled !== false)
                .sort((a, b) => a.label.localeCompare(b.label, 'es')),
        [categories],
    )

    const apply = (value) => {
        const next = setCoachGameCategoryOverride(
            game.id,
            value === COACH_CATEGORY_AUTO ? null : value,
            overrides,
        )
        onOverridesChange(next)
    }

    return (
        <Select
            size="small"
            value={selectValue}
            onChange={(e) => apply(e.target.value)}
            displayEmpty
            sx={{ minWidth: 148, maxWidth: 200 }}
            renderValue={(v) => {
                if (v === COACH_CATEGORY_AUTO) return effective.label
                const cat = enabledCategories.find((c) => c.id === v)
                return cat?.label || effective.label
            }}
        >
            <MenuItem value={COACH_CATEGORY_AUTO}>Automática ({automatic.label})</MenuItem>
            {enabledCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                    {cat.label}
                </MenuItem>
            ))}
        </Select>
    )
}

function PartidaTitleCell({ game, importTag, onSaved, onError }) {
    const [editing, setEditing] = useState(false)
    const [draft, setDraft] = useState(() => formatCoachPartidaTableLabel(game))
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!editing) setDraft(formatCoachPartidaTableLabel(game))
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
                {formatCoachPartidaTableLabel(game)}
            </Typography>
            <Tooltip title="Cambiar descripción">
                <IconButton
                    size="small"
                    onClick={() => {
                        setDraft(formatCoachPartidaTableLabel(game))
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
    const [exportingPgns, setExportingPgns] = useState(false)
    const [pendingDelete, setPendingDelete] = useState(null)
    const [refreshing, setRefreshing] = useState(false)
    const [sortBy, setSortBy] = useState(null)
    const [sortDirection, setSortDirection] = useState('asc')
    const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleCoachGamesColumns())
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [gameCategories, setGameCategories] = useState(() => loadCoachGameCategories())
    const [categoryOverrides, setCategoryOverrides] = useState(() =>
        loadCoachGameCategoryOverrides(),
    )
    const [bulkCategoryAssign, setBulkCategoryAssign] = useState('')
    const [jobsPage, setJobsPage] = useState(0)
    const [gamesPage, setGamesPage] = useState(0)
    const [advancedDraft, setAdvancedDraft] = useState(() => ({
        ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
    }))
    const [advancedApplied, setAdvancedApplied] = useState(() => ({
        ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS,
    }))
    const [corpusTypeOptions, setCorpusTypeOptions] = useState([])
    const [ecoOpeningsCatalog, setEcoOpeningsCatalog] = useState([])
    const [openingCatalogSearch, setOpeningCatalogSearch] = useState('')

    const advancedListQuery = useMemo(
        () => buildCoachPartidasListQuery(advancedApplied),
        [advancedApplied],
    )

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

    const handleRequestSort = useCallback(
        (field) => {
            if (sortBy === field) {
                setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
            } else {
                setSortBy(field)
                setSortDirection('asc')
            }
        },
        [sortBy],
    )

    const sortContext = useMemo(
        () => ({
            jobStatusForGame: (game) => jobStatusForGame(game, jobStatusById),
        }),
        [jobStatusById],
    )

    const assignableCategories = useMemo(
        () =>
            [...gameCategories]
                .filter((c) => c.enabled !== false)
                .sort((a, b) => a.label.localeCompare(b.label, 'es')),
        [gameCategories],
    )

    const categoryOptions = useMemo(
        () => listCoachGameCategoryFilters(games, gameCategories, categoryOverrides),
        [games, gameCategories, categoryOverrides],
    )

    const filteredGames = useMemo(
        () =>
            games.filter((g) =>
                coachGameMatchesCategoryFilter(g, categoryFilter, gameCategories, categoryOverrides),
            ),
        [games, categoryFilter, gameCategories, categoryOverrides],
    )

    const sortedGames = useMemo(
        () => sortCoachGames(filteredGames, sortBy, sortDirection, sortContext),
        [filteredGames, sortBy, sortDirection, sortContext],
    )

    const paginatedJobs = useMemo(() => {
        const start = jobsPage * COACH_JOBS_PAGE_SIZE
        return jobs.slice(start, start + COACH_JOBS_PAGE_SIZE)
    }, [jobs, jobsPage])

    const paginatedGames = useMemo(() => {
        const start = gamesPage * COACH_GAMES_PAGE_SIZE
        return sortedGames.slice(start, start + COACH_GAMES_PAGE_SIZE)
    }, [sortedGames, gamesPage])

    const selectedOnPageCount = useMemo(() => {
        let n = 0
        for (const g of paginatedGames) {
            if (selectedIds.has(g.id)) n += 1
        }
        return n
    }, [paginatedGames, selectedIds])

    useEffect(() => {
        setJobsPage(0)
    }, [jobs.length])

    useEffect(() => {
        setGamesPage(0)
    }, [categoryFilter, sortBy, sortDirection, games.length, filteredGames.length, advancedApplied])

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(sortedGames.length / COACH_GAMES_PAGE_SIZE) - 1)
        if (gamesPage > maxPage) setGamesPage(maxPage)
    }, [sortedGames.length, gamesPage])

    useEffect(() => {
        const maxPage = Math.max(0, Math.ceil(jobs.length / COACH_JOBS_PAGE_SIZE) - 1)
        if (jobsPage > maxPage) setJobsPage(maxPage)
    }, [jobs.length, jobsPage])

    const showCol = useCallback((id) => visibleColumns.has(id), [visibleColumns])

    useEffect(() => {
        const syncColumns = () => setVisibleColumns(loadVisibleCoachGamesColumns())
        window.addEventListener(COACH_PARTIDAS_COLUMNS_CHANGED, syncColumns)
        return () => window.removeEventListener(COACH_PARTIDAS_COLUMNS_CHANGED, syncColumns)
    }, [])

    useEffect(() => {
        const syncCategories = () => {
            setGameCategories(loadCoachGameCategories())
            setCategoryOverrides(loadCoachGameCategoryOverrides())
        }
        window.addEventListener(COACH_PARTIDAS_CATEGORIES_CHANGED, syncCategories)
        return () => window.removeEventListener(COACH_PARTIDAS_CATEGORIES_CHANGED, syncCategories)
    }, [])

    const applyBulkCategoryAssign = (value) => {
        if (!value || selectedIds.size === 0) return
        const ids = [...selectedIds]
        const categoryId = value === COACH_CATEGORY_AUTO ? null : value
        const next = setCoachGameCategoryOverridesBulk(ids, categoryId, categoryOverrides)
        setCategoryOverrides(next)
        setBulkCategoryAssign('')
        setInfo(
            categoryId
                ? `Categoría asignada a ${ids.length} partida(s).`
                : `Categoría automática restaurada en ${ids.length} partida(s).`,
        )
    }

    useEffect(() => {
        if (playerHandle && playerOptions.includes(playerHandle)) return
        if (playerOptions.length === 1) {
            setPlayerHandle(playerOptions[0])
        }
    }, [playerOptions, playerHandle])

    const refresh = useCallback(async () => {
        setRefreshing(true)
        try {
            const [j, g] = await Promise.all([listJobs(), listGames(advancedListQuery)])
            setJobs(j)
            setGames(g)
            setError(null)
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setRefreshing(false)
        }
    }, [advancedListQuery])

    useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 5000)
        return () => clearInterval(timer)
    }, [refresh])

    useEffect(() => {
        let cancelled = false
        listCoachCorpusTypes()
            .then((types) => {
                if (!cancelled) setCorpusTypeOptions(types)
            })
            .catch(() => {})
        loadEcoOpeningsCatalog()
            .then(({ openings }) => {
                if (!cancelled) setEcoOpeningsCatalog(openings)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [])

    const openingCatalogOptions = useMemo(
        () => searchEcoOpeningsCatalog(ecoOpeningsCatalog, openingCatalogSearch, 50),
        [ecoOpeningsCatalog, openingCatalogSearch],
    )

    const applyAdvancedFilters = () => {
        setAdvancedApplied({ ...advancedDraft })
        setGamesPage(0)
    }

    const clearAdvancedFilters = () => {
        const empty = { ...EMPTY_COACH_PARTIDAS_ADVANCED_FILTERS }
        setAdvancedDraft(empty)
        setAdvancedApplied(empty)
        setOpeningCatalogSearch('')
        setGamesPage(0)
    }

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

    const toggleAllGamesOnPage = () => {
        if (!paginatedGames.length) return
        const allPageSelected =
            selectedOnPageCount === paginatedGames.length && paginatedGames.length > 0
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (allPageSelected) {
                for (const g of paginatedGames) next.delete(g.id)
            } else {
                for (const g of paginatedGames) next.add(g.id)
            }
            return next
        })
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

    const exportSelectedGamesPgns = async () => {
        const ids = [...selectedIds]
        if (!ids.length) return
        setExportingPgns(true)
        setError(null)
        try {
            const rows = await Promise.all(ids.map((id) => getGame(id)))
            const pgns = []
            const missing = []
            for (const row of rows) {
                const pgn = row?.pgn
                if (pgn && String(pgn).trim()) pgns.push(pgn)
                else missing.push(row?.id ?? '?')
            }
            if (!pgns.length) {
                setError('Las partidas seleccionadas no tienen PGN almacenado para exportar.')
                return
            }
            const body = joinGamePgnsForExport(pgns)
            const filename = coachGamesExportFilename(ids.length === 1 ? ids[0] : null)
            downloadTextFile(filename, body)
            if (missing.length) {
                setInfo(
                    `Exportadas ${pgns.length} partida(s); sin PGN: ${missing.length} id(s).`,
                )
            } else {
                setInfo(
                    ids.length === 1
                        ? 'PGN exportado (incluye variantes guardadas en el catálogo).'
                        : `${ids.length} partidas exportadas en un archivo PGN.`,
                )
            }
        } catch (err) {
            setError(parseApiDetail(err) || 'No se pudo exportar el PGN.')
        } finally {
            setExportingPgns(false)
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
            <Box sx={{ mb: 3 }}>
            <CoachConfigSectionAccordion
                id="coach-analysis-jobs"
                title={`Cola de jobs Stockfish (${jobs.length})`}
                defaultExpanded={false}
            >
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
                        {paginatedJobs.map((job) => (
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
                {jobs.length > 0 && (
                    <TablePagination
                        component="div"
                        count={jobs.length}
                        page={jobsPage}
                        onPageChange={(_, p) => setJobsPage(p)}
                        rowsPerPage={COACH_JOBS_PAGE_SIZE}
                        rowsPerPageOptions={[COACH_JOBS_PAGE_SIZE]}
                        labelDisplayedRows={paginationLabelRows}
                        labelRowsPerPage="Jobs por página:"
                    />
                )}
            </CoachConfigSectionAccordion>
            </Box>
            <Typography variant="h6" gutterBottom>
                Biblioteca de partidas
            </Typography>
            <CoachConfigSectionAccordion
                id="coach-partidas-advanced-filters"
                title={
                    coachPartidasAdvancedFiltersActive(advancedApplied)
                        ? 'Filtros avanzados (activos)'
                        : 'Filtros avanzados'
                }
                defaultExpanded={coachPartidasAdvancedFiltersActive(advancedApplied)}
            >
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                        gap: 2,
                    }}
                >
                    <FormControl size="small" fullWidth>
                        <InputLabel id="coach-adv-corpus-label">Fuente (corpus)</InputLabel>
                        <Select
                            labelId="coach-adv-corpus-label"
                            multiple
                            label="Fuente (corpus)"
                            value={advancedDraft.corpusTypes}
                            onChange={(e) => {
                                const value = e.target.value
                                setAdvancedDraft((prev) => ({
                                    ...prev,
                                    corpusTypes:
                                        typeof value === 'string' ? value.split(',') : value,
                                }))
                            }}
                            renderValue={(selected) =>
                                selected.length
                                    ? selected.map((v) => formatCoachCorpusType(v)).join(', ')
                                    : 'Todas'
                            }
                        >
                            {corpusTypeOptions.map((corpus) => (
                                <MenuItem key={corpus} value={corpus}>
                                    <Checkbox
                                        checked={advancedDraft.corpusTypes.indexOf(corpus) > -1}
                                    />
                                    {formatCoachCorpusType(corpus)}
                                </MenuItem>
                            ))}
                            {!corpusTypeOptions.length && (
                                <MenuItem disabled value="">
                                    Sin corpus en biblioteca
                                </MenuItem>
                            )}
                        </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                        <InputLabel id="coach-adv-results-label">Resultado</InputLabel>
                        <Select
                            labelId="coach-adv-results-label"
                            multiple
                            label="Resultado"
                            value={advancedDraft.results}
                            onChange={(e) => {
                                const value = e.target.value
                                setAdvancedDraft((prev) => ({
                                    ...prev,
                                    results:
                                        typeof value === 'string' ? value.split(',') : value,
                                }))
                            }}
                            renderValue={(selected) =>
                                selected.length ? selected.join(', ') : 'Cualquiera'
                            }
                        >
                            {COACH_RESULT_FILTER_OPTIONS.map((res) => (
                                <MenuItem key={res} value={res}>
                                    <Checkbox checked={advancedDraft.results.indexOf(res) > -1} />
                                    {res}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        size="small"
                        label="Jugador blancas"
                        placeholder="Ej. Carlsen o *club*"
                        value={advancedDraft.whitePlayer}
                        onChange={(e) =>
                            setAdvancedDraft((prev) => ({
                                ...prev,
                                whitePlayer: e.target.value,
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        size="small"
                        label="Jugador negras"
                        placeholder="Comodín *"
                        value={advancedDraft.blackPlayer}
                        onChange={(e) =>
                            setAdvancedDraft((prev) => ({
                                ...prev,
                                blackPlayer: e.target.value,
                            }))
                        }
                        fullWidth
                    />
                    <Autocomplete
                        size="small"
                        sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
                        options={openingCatalogOptions}
                        value={advancedDraft.openingCatalog}
                        inputValue={openingCatalogSearch}
                        onInputChange={(_, value) => setOpeningCatalogSearch(value)}
                        onChange={(_, value) => {
                            setAdvancedDraft((prev) => ({
                                ...prev,
                                openingCatalog: value,
                                eco: value ? '' : prev.eco,
                            }))
                            if (value) {
                                setOpeningCatalogSearch(formatOpeningCatalogLabel(value))
                            }
                        }}
                        getOptionLabel={(option) => formatOpeningCatalogLabel(option)}
                        isOptionEqualToValue={(a, b) =>
                            a?.eco === b?.eco && a?.name === b?.name
                        }
                        filterOptions={(options) => options}
                        noOptionsText={
                            ecoOpeningsCatalog.length
                                ? 'Sin coincidencias'
                                : 'Cargando catálogo…'
                        }
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Apertura (catálogo ECO — nombre)"
                                placeholder="B90 o *sicilian*"
                            />
                        )}
                    />
                    <TextField
                        size="small"
                        label="ECO (manual)"
                        placeholder="B90 o C5*"
                        value={advancedDraft.eco}
                        disabled={Boolean(advancedDraft.openingCatalog)}
                        onChange={(e) =>
                            setAdvancedDraft((prev) => ({
                                ...prev,
                                eco: e.target.value,
                                openingCatalog: null,
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        size="small"
                        label="Fecha desde"
                        placeholder="2024-01-01"
                        value={advancedDraft.dateFrom}
                        onChange={(e) =>
                            setAdvancedDraft((prev) => ({ ...prev, dateFrom: e.target.value }))
                        }
                        fullWidth
                    />
                    <TextField
                        size="small"
                        label="Fecha hasta"
                        placeholder="2024-12-31"
                        value={advancedDraft.dateTo}
                        onChange={(e) =>
                            setAdvancedDraft((prev) => ({ ...prev, dateTo: e.target.value }))
                        }
                        fullWidth
                    />
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                    <Button variant="contained" size="small" onClick={applyAdvancedFilters}>
                        Aplicar filtros
                    </Button>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={clearAdvancedFilters}
                        disabled={
                            !coachPartidasAdvancedFiltersActive(advancedDraft) &&
                            !coachPartidasAdvancedFiltersActive(advancedApplied)
                        }
                    >
                        Limpiar
                    </Button>
                    {coachPartidasAdvancedFiltersActive(advancedApplied) && (
                        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
                            Los chips de categoría se aplican además (AND).
                        </Typography>
                    )}
                </Box>
            </CoachConfigSectionAccordion>
            {games.length > 0 && (
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 1,
                        alignItems: 'center',
                        mb: 2,
                    }}
                >
                    <Typography variant="subtitle2" component="span" sx={{ mr: 0.5 }}>
                        Categoría
                    </Typography>
                    <Chip
                        size="small"
                        label={`Todas (${games.length})`}
                        clickable
                        color={categoryFilter === 'all' ? 'primary' : 'default'}
                        variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
                        onClick={() => setCategoryFilter('all')}
                    />
                    {categoryOptions.map((cat) => (
                        <Chip
                            key={cat.id}
                            size="small"
                            label={`${cat.label} (${cat.count})`}
                            clickable
                            color={categoryFilter === cat.id ? 'primary' : 'default'}
                            variant={categoryFilter === cat.id ? 'filled' : 'outlined'}
                            onClick={() => setCategoryFilter(cat.id)}
                        />
                    ))}
                </Box>
            )}
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
                    <Button
                        variant="outlined"
                        startIcon={<FileDownload />}
                        disabled={exportingPgns || selectedIds.size === 0}
                        onClick={exportSelectedGamesPgns}
                    >
                        {exportingPgns
                            ? 'Exportando…'
                            : `Exportar PGN (${selectedIds.size})`}
                    </Button>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 2,
                        alignItems: 'center',
                        mt: 2,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Typography variant="subtitle2" component="span">
                        Categoría de partidas
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 260 }} disabled={selectedIds.size === 0}>
                        <InputLabel id="coach-bulk-category-label">Asignar a selección</InputLabel>
                        <Select
                            labelId="coach-bulk-category-label"
                            label="Asignar a selección"
                            value={bulkCategoryAssign}
                            onChange={(e) => {
                                const v = e.target.value
                                setBulkCategoryAssign(v)
                                applyBulkCategoryAssign(v)
                            }}
                        >
                            <MenuItem value="">
                                <em>Elegir categoría…</em>
                            </MenuItem>
                            <MenuItem value={COACH_CATEGORY_AUTO}>Automática (reglas)</MenuItem>
                            {assignableCategories.map((cat) => (
                                <MenuItem key={cat.id} value={cat.id}>
                                    {cat.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography variant="body2" color="text.secondary">
                        {selectedIds.size === 0
                            ? 'Seleccioná filas en la tabla.'
                            : `${selectedIds.size} partida(s) seleccionada(s).`}
                    </Typography>
                </Box>
            </Paper>
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={
                                        selectedOnPageCount > 0 &&
                                        selectedOnPageCount < paginatedGames.length
                                    }
                                    checked={
                                        paginatedGames.length > 0 &&
                                        selectedOnPageCount === paginatedGames.length
                                    }
                                    disabled={!paginatedGames.length}
                                    onChange={toggleAllGamesOnPage}
                                />
                            </TableCell>
                            {showCol('partida') && <TableCell>Partida</TableCell>}
                            {showCol('white_player') && (
                                <SortableGamesHeader
                                    field="white_player"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                    sx={playerNameColSx}
                                >
                                    Blancas
                                </SortableGamesHeader>
                            )}
                            {showCol('black_player') && (
                                <SortableGamesHeader
                                    field="black_player"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                    sx={playerNameColSx}
                                >
                                    Negras
                                </SortableGamesHeader>
                            )}
                            {showCol('player_pov') && <TableCell>Jugador POV</TableCell>}
                            {showCol('rhythm') && (
                                <SortableGamesHeader
                                    field="rhythm"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Ritmo
                                </SortableGamesHeader>
                            )}
                            {showCol('eco') && (
                                <SortableGamesHeader
                                    field="eco"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                    sx={compactTableColSx}
                                >
                                    ECO
                                </SortableGamesHeader>
                            )}
                            {showCol('white_elo') && (
                                <SortableGamesHeader
                                    field="white_elo"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                    sx={compactTableColSx}
                                >
                                    Elo B
                                </SortableGamesHeader>
                            )}
                            {showCol('black_elo') && (
                                <SortableGamesHeader
                                    field="black_elo"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                    sx={compactTableColSx}
                                >
                                    Elo N
                                </SortableGamesHeader>
                            )}
                            {showCol('opening') && (
                                <SortableGamesHeader
                                    field="opening"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Apertura
                                </SortableGamesHeader>
                            )}
                            {showCol('date_played') && (
                                <SortableGamesHeader
                                    field="date_played"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Fecha
                                </SortableGamesHeader>
                            )}
                            {showCol('source') && (
                                <SortableGamesHeader
                                    field="source"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Fuente
                                </SortableGamesHeader>
                            )}
                            {showCol('analysis') && (
                                <SortableGamesHeader
                                    field="analysis"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Análisis
                                </SortableGamesHeader>
                            )}
                            {showCol('result') && (
                                <SortableGamesHeader
                                    field="result"
                                    sortBy={sortBy}
                                    sortDirection={sortDirection}
                                    onSort={handleRequestSort}
                                >
                                    Resultado
                                </SortableGamesHeader>
                            )}
                            {showCol('actions') && <TableCell>Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedGames.map((g) => {
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
                                    {showCol('partida') && (
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
                                    )}
                                    {showCol('white_player') && (
                                        <TableCell sx={playerNameColSx}>
                                            {g.white_player || '—'}
                                        </TableCell>
                                    )}
                                    {showCol('black_player') && (
                                        <TableCell sx={playerNameColSx}>
                                            {g.black_player || '—'}
                                        </TableCell>
                                    )}
                                    {showCol('player_pov') && (
                                        <TableCell>
                                            {g.player_username
                                                ? `${g.player_username} (${g.player_color || '?'})`
                                                : '—'}
                                        </TableCell>
                                    )}
                                    {showCol('rhythm') && (
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {formatCoachRhythmDisplay(g)}
                                        </TableCell>
                                    )}
                                    {showCol('eco') && (
                                        <TableCell sx={ecoTableColSx}>
                                            {(() => {
                                                const eco = formatCoachEcoForDisplay(g.eco)
                                                const label = (
                                                    <Box component="span" sx={{ display: 'block' }}>
                                                        {eco.display}
                                                    </Box>
                                                )
                                                return eco.tooltip ? (
                                                    <Tooltip title={eco.tooltip}>
                                                        {label}
                                                    </Tooltip>
                                                ) : (
                                                    label
                                                )
                                            })()}
                                        </TableCell>
                                    )}
                                    {showCol('white_elo') && (
                                        <TableCell sx={compactTableColSx}>
                                            {g.white_elo || '—'}
                                        </TableCell>
                                    )}
                                    {showCol('black_elo') && (
                                        <TableCell sx={compactTableColSx}>
                                            {g.black_elo || '—'}
                                        </TableCell>
                                    )}
                                    {showCol('opening') && (
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
                                    )}
                                    {showCol('date_played') && (
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            {formatCoachDatePlayed(g.date_played)}
                                        </TableCell>
                                    )}
                                    {showCol('source') && (
                                        <TableCell>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    gap: 0.5,
                                                }}
                                            >
                                                <Typography variant="body2" component="span">
                                                    {formatCoachCatalogSource(g)}
                                                </Typography>
                                                <PartidaCategoryCell
                                                    game={g}
                                                    categories={gameCategories}
                                                    overrides={categoryOverrides}
                                                    onOverridesChange={setCategoryOverrides}
                                                />
                                                {resolveCoachGameCategory(g, gameCategories, categoryOverrides)
                                                    .manual && (
                                                    <Chip
                                                        size="small"
                                                        label="Manual"
                                                        variant="outlined"
                                                        color="primary"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                    )}
                                    {showCol('analysis') && (
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
                                    )}
                                    {showCol('result') && (
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
                                    )}
                                    {showCol('actions') && (
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
                                    )}
                                </TableRow>
                            )
                        })}
                        {!games.length && (
                            <TableRow>
                                <TableCell colSpan={coachGamesTableColSpan(visibleColumns)} align="center">
                                    Sin partidas importadas.
                                </TableCell>
                            </TableRow>
                        )}
                        {games.length > 0 && !filteredGames.length && (
                            <TableRow>
                                <TableCell colSpan={coachGamesTableColSpan(visibleColumns)} align="center">
                                    Ninguna partida en esta categoría.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                {sortedGames.length > 0 && (
                    <TablePagination
                        component="div"
                        count={sortedGames.length}
                        page={gamesPage}
                        onPageChange={(_, p) => setGamesPage(p)}
                        rowsPerPage={COACH_GAMES_PAGE_SIZE}
                        rowsPerPageOptions={[COACH_GAMES_PAGE_SIZE]}
                        labelDisplayedRows={paginationLabelRows}
                        labelRowsPerPage="Partidas por página:"
                    />
                )}
            </Paper>
        </Box>
    )
}
