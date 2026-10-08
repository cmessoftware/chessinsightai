import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {

    Alert,

    Box,

    Button,

    CircularProgress,

    Grid,

    IconButton,

    List,

    ListItemButton,

    ListItemText,

    Paper,

    Tab,

    Tabs,

    Typography,

} from '@mui/material'

import { FirstPage, LastPage, NavigateBefore, NavigateNext } from '@mui/icons-material'

import { Chess } from 'chess.js'

import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'

import ChessinsightBoard from '../components/chess/ChessinsightBoard.jsx'

import CoachPgnMoveList from '../components/coach/CoachPgnMoveList.jsx'

import EngineMultipvPanel from '../components/coach/EngineMultipvPanel.jsx'

import AdvancedMoveAnalysisPanel from '../components/coach/AdvancedMoveAnalysisPanel.jsx'
import LiveEnginePanel from '../components/coach/LiveEnginePanel.jsx'

import { useLiveStockfishAnalysis } from '../hooks/useLiveStockfishAnalysis.js'
import { usePgnEvalCache } from '../hooks/usePgnEvalCache.js'
import { usePgnMoveClassification } from '../hooks/usePgnMoveClassification.js'
import { parseMoverEloFromGame } from '../utils/coachPlayerElo.js'

import { getDecision, getGame, listDecisions } from '../services/module07Service.js'

import {

    applyMoveAtPath,

    buildTreeFromMainLine,

    countMainLinePlies,

    createEmptyRoot,

    deleteVariationAtPath,
    getNodeAtPath,
    truncateLineForward,
    truncateTouchesImportedMoves,
    lastUciForPath,

    mainLineEndPath,

    pathStepBack,

    pathStepForward,

    pathToBranchEnd,

} from '../utils/coachVariationTree.js'



function MentalPanel({ mental }) {

    if (!mental) return null

    return (

        <Box>

            <Typography variant="subtitle2">

                Modo: {mental.mode} — pausa sugerida: {mental.pause_seconds}s

            </Typography>

            <List dense>

                {(mental.thinking_plan || []).map((step, i) => (

                    <ListItemText

                        key={i}

                        primary={`${step.node_id}: ${step.prompt_es}`}

                        secondary={step.phase}

                    />

                ))}

            </List>

        </Box>

    )

}



function buildReplayFromPgn(pgnText) {

    const chess = new Chess()

    try {

        chess.loadPgn(pgnText)

    } catch {

        return { fens: [new Chess().fen()], ucis: [], moves: [], moveCount: 0 }

    }

    const verbose = chess.history({ verbose: true })

    const walker = new Chess()

    const fens = [walker.fen()]

    const ucis = []

    const moves = []

    for (let i = 0; i < verbose.length; i += 1) {

        const m = verbose[i]

        const played = walker.move(m)

        if (!played) break

        ucis.push(played.from + played.to + (played.promotion || ''))

        fens.push(walker.fen())

        moves.push({

            ply: i + 1,

            san: played.san,

            color: played.color,

            moveNumber: Math.floor(i / 2) + 1,

        })

    }

    return { fens, ucis, moves, moveCount: verbose.length }

}



/** Análisis de una sola partida: tablero + MultiPV por punto crítico. */

export default function CoachGameAnalysisPage() {

    const { gameId } = useParams()

    const location = useLocation()

    const [gameMeta, setGameMeta] = useState(null)

    const [treeRoot, setTreeRoot] = useState(() => createEmptyRoot())

    const [cursorPath, setCursorPath] = useState([])

    const [decisions, setDecisions] = useState([])

    const [selectedId, setSelectedId] = useState(null)

    const [detail, setDetail] = useState(null)

    const [tab, setTab] = useState(0)

    const [error, setError] = useState(null)

    const [loading, setLoading] = useState(true)

    const [importBanner] = useState(() => location.state?.message || null)

    const boardColumnRef = useRef(null)

    const [boardWidth, setBoardWidth] = useState(420)



    useEffect(() => {

        const el = boardColumnRef.current

        if (!el || typeof ResizeObserver === 'undefined') {

            return undefined

        }

        const measure = () => {

            const columnW = el.clientWidth

            const vhCap =

                typeof window !== 'undefined' ? Math.floor(window.innerHeight * 0.52) : 480

            const w = Math.min(480, columnW - 16, vhCap)

            setBoardWidth(Math.max(280, w))

        }

        measure()

        const observer = new ResizeObserver(measure)

        observer.observe(el)

        window.addEventListener('resize', measure)

        return () => {

            observer.disconnect()

            window.removeEventListener('resize', measure)

        }

    }, [])



    const loadDecisions = useCallback(async () => {

        const rows = await listDecisions(gameId)

        setDecisions(rows)

        return rows

    }, [gameId])



    useEffect(() => {
        setTab(0)
        setSelectedId(null)
        setDetail(null)
        setTreeRoot(createEmptyRoot())
        setCursorPath([])

        getGame(gameId)
            .then((g) => {
                setGameMeta(g)
                if (g?.pgn) {
                    const built = buildReplayFromPgn(g.pgn)
                    const tree = buildTreeFromMainLine(built.fens, built.ucis, built.moves)
                    setTreeRoot(tree)
                    setCursorPath(mainLineEndPath(tree))
                }
            })
            .catch(() => {
                setGameMeta(null)
            })
    }, [gameId])



    useEffect(() => {

        let cancelled = false

        let timer



        const poll = async () => {

            try {

                const rows = await loadDecisions()

                if (cancelled) return

                setError(null)

                setSelectedId((prev) => prev ?? rows[0]?.id ?? null)

                setLoading(false)

                if (!rows.length) {

                    timer = setTimeout(poll, 4000)

                }

            } catch (err) {

                if (!cancelled) {

                    setError(err.message)

                    setLoading(false)

                }

            }

        }



        setLoading(true)

        poll()

        return () => {

            cancelled = true

            if (timer) clearTimeout(timer)

        }

    }, [gameId, loadDecisions])



    useEffect(() => {

        if (!selectedId) {

            setDetail(null)

            return

        }

        getDecision(selectedId)

            .then(setDetail)

            .catch((err) => setError(err.message))

    }, [selectedId])



    const pack = detail?.review_pack

    const playerColor =

        (pack?.player_color || gameMeta?.player_color || 'white').toLowerCase() === 'black'

            ? 'black'

            : 'white'

    const orientation = playerColor



    const criticalMode = Boolean(detail?.fen_before)

    const cursorNode = getNodeAtPath(treeRoot, cursorPath)

    const cursorSan = cursorPath?.length ? cursorNode?.san : null

    const cursorMoverElo = useMemo(() => {
        if (!cursorPath?.length) return null
        const parentPath = cursorPath.slice(0, -1)
        const parent = getNodeAtPath(treeRoot, parentPath)
        const stm = (parent?.fen?.split(/\s+/)[1] || 'w').toLowerCase()
        const mover = stm === 'b' ? 'black' : 'white'
        return parseMoverEloFromGame(gameMeta, mover)
    }, [cursorPath, treeRoot, gameMeta])

    const boardFen = criticalMode ? detail.fen_before : cursorNode.fen

    const lastMove = criticalMode

        ? pack?.played_move?.uci

        : lastUciForPath(treeRoot, cursorPath)



    const mainLinePlies = countMainLinePlies(treeRoot)

    const canStepForward = getNodeAtPath(treeRoot, cursorPath).children?.length > 0



    const moveLabel = useMemo(() => {

        if (criticalMode) return null

        return `Jugada ${cursorPath.length} / ${mainLinePlies}`

    }, [criticalMode, cursorPath.length, mainLinePlies])



    const exitCritical = useCallback(() => {

        setSelectedId(null)

        setDetail(null)

    }, [])



    const goToPath = useCallback(

        (path) => {

            exitCritical()

            setCursorPath(path)

        },

        [exitCritical],

    )



    const handleBoardMove = useCallback(

        ({ from, to }) => {

            if (criticalMode) return false

            const result = applyMoveAtPath(treeRoot, cursorPath, { from, to })

            if (!result) {
                alert('Jugada ilegal o límite de subvariantes (máx. 2 niveles).')
                return false
            }

            exitCritical()

            setTreeRoot(result.tree)

            setCursorPath(result.path)

            return true

        },

        [treeRoot, cursorPath, criticalMode, exitCritical],

    )



    const handleDeleteVariation = useCallback(
        (path) => {
            if (
                !window.confirm(
                    '¿Quitar esta variante (rama completa)?',
                )
            ) {
                return
            }
            const result = deleteVariationAtPath(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot],
    )

    const pathHasContinuations = useCallback(
        (path) => {
            if (!path?.length) return false
            const node = getNodeAtPath(treeRoot, path)
            return Boolean(node?.children?.length)
        },
        [treeRoot],
    )

    const handleTruncateForward = useCallback(
        (path) => {
            if (!path?.length || !pathHasContinuations(path)) return
            const touchesImport = truncateTouchesImportedMoves(treeRoot, path)
            const message = touchesImport
                ? '¿Borrar todas las jugadas desde aquí en adelante? Se eliminará parte de la partida importada y sus variantes.'
                : '¿Borrar todas las jugadas y subvariantes desde esta posición en adelante?'
            if (!window.confirm(message)) return
            const result = truncateLineForward(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot, pathHasContinuations],
    )

    const { evalByFen, setEvalForFen } = usePgnEvalCache(treeRoot, playerColor, {
        prefetchDepth: 10,
        prefetchEnabled: tab === 0,
    })

    const { classificationByPathKey, progress: classificationProgress } = usePgnMoveClassification(
        treeRoot,
        playerColor,
        {
            enabled: Boolean(treeRoot?.fen && countMainLinePlies(treeRoot) > 0),
            depth: 12,
            multipv: 3,
            cursorPath,
            gameMeta,
            gameId,
            persistSessionCache: true,
        },
    )

    const liveDepth = 14

    const liveMultipv = 2

    const liveEngine = useLiveStockfishAnalysis(boardFen, {

        enabled: tab === 0 && Boolean(boardFen),

        depth: liveDepth,

        multipv: liveMultipv,

        playerColor,

    })

    useEffect(() => {
        if (liveEngine.status === 'ready' && liveEngine.lines?.[0]?.player_score && boardFen) {
            setEvalForFen(boardFen, liveEngine.lines[0].player_score)
        }
    }, [liveEngine.status, liveEngine.lines, boardFen, setEvalForFen])

    const pgnResultLabel = useMemo(() => {

        if (!gameMeta?.result) return null

        const r = String(gameMeta.result).trim()

        if (r === '1-0') return '1-0 (blancas)'

        if (r === '0-1') return '0-1 (negras)'

        if (r === '1/2-1/2') return 'Tablas'

        if (r === '*') return 'En curso / sin resultado'

        return r

    }, [gameMeta?.result])



    return (

        <Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>

                <Box>

                    <Typography variant="h5">Coach — Análisis de partida</Typography>

                    {gameMeta && (

                        <Typography variant="body2" color="text.secondary">

                            {gameMeta.white_player} vs {gameMeta.black_player}

                            {gameMeta.player_username

                                ? ` · POV ${gameMeta.player_username}`

                                : ''}

                        </Typography>

                    )}

                </Box>

                <Button component={RouterLink} to="/coach/jobs" variant="outlined" size="small">

                    Cola (análisis masivo)

                </Button>

            </Box>

            {importBanner && (

                <Alert severity="success" sx={{ mb: 2 }}>

                    {importBanner}

                </Alert>

            )}

            {error && (

                <Alert severity="error" sx={{ mb: 2 }}>

                    {String(error)}

                </Alert>

            )}

            {loading && !decisions.length && (

                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>

                    {gameMeta?.analysis_job_id

                        ? 'Esperando decisiones del job (Stockfish)…'

                        : 'Partida importada. Revisá jugadas abajo o encolá Stockfish en la Cola.'}

                </Alert>

            )}

            <Grid
                container
                spacing={2}
                alignItems="flex-start"
                sx={{ flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
            >

                <Grid
                    item
                    xs={12}
                    sm={7}
                    md={7}
                    order={{ xs: 1, sm: 1 }}
                    sx={{ minWidth: 0, flex: { sm: '1 1 0' } }}
                >

                    <Paper

                        ref={boardColumnRef}

                        sx={{

                            p: 2,

                            display: 'flex',

                            flexDirection: 'column',

                            alignItems: 'center',

                            justifyContent: 'flex-start',

                        }}

                    >

                        <ChessinsightBoard

                            fen={boardFen}

                            orientation={orientation}

                            lastMove={lastMove}

                            viewOnly={criticalMode}

                            onMove={handleBoardMove}

                            boardWidth={boardWidth}

                        />

                        {!criticalMode && (

                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>

                                Arrastrá piezas para probar variantes (solo esta sesión). Coronar: dama.

                            </Typography>

                        )}

                        {!criticalMode && (

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>

                                <IconButton size="small" onClick={() => goToPath([])} aria-label="Inicio">

                                    <FirstPage />

                                </IconButton>

                                <IconButton

                                    size="small"

                                    onClick={() => goToPath(pathStepBack(cursorPath))}

                                    disabled={cursorPath.length <= 0}

                                    aria-label="Anterior"

                                >

                                    <NavigateBefore />

                                </IconButton>

                                <Typography variant="body2" sx={{ mx: 1, minWidth: 100, textAlign: 'center' }}>

                                    {moveLabel}

                                </Typography>

                                <IconButton

                                    size="small"

                                    onClick={() => goToPath(pathStepForward(treeRoot, cursorPath))}

                                    disabled={!canStepForward}

                                    aria-label="Siguiente"

                                >

                                    <NavigateNext />

                                </IconButton>

                                <IconButton

                                    size="small"

                                    onClick={() => goToPath(pathToBranchEnd(treeRoot, cursorPath))}

                                    aria-label="Final"

                                >

                                    <LastPage />

                                </IconButton>

                            </Box>

                        )}

                        {criticalMode && (

                            <Button size="small" sx={{ mt: 2 }} onClick={exitCritical}>

                                Volver al recorrido PGN

                            </Button>

                        )}

                    </Paper>

                </Grid>

                <Grid
                    item
                    xs={12}
                    sm={5}
                    md={5}
                    order={{ xs: 2, sm: 2 }}
                    sx={{
                        minWidth: 0,
                        flex: { sm: '0 0 auto' },
                        width: { sm: '41.666667%' },
                        maxWidth: '100%',
                    }}
                >

                    <Tabs
                        value={tab}
                        onChange={(_, v) => setTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{
                            mb: 1,
                            position: 'sticky',
                            top: 0,
                            zIndex: 2,
                            bgcolor: 'background.paper',
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >

                        <Tab label="Motor" />

                        <Tab label="Análisis avanzado" />

                        <Tab label="Mental 1600" />

                    </Tabs>

                    <Box sx={{ mb: 2, minHeight: 120 }}>

                    {tab === 0 && (

                        <>

                            <LiveEnginePanel

                                liveState={liveEngine}

                                targetDepth={liveDepth}

                                multipv={liveMultipv}

                            />

                            {pack && criticalMode && (

                                <>

                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>

                                        Análisis Coach (job)

                                    </Typography>

                                    <EngineMultipvPanel

                                        pack={pack}

                                        depth={gameMeta?.stockfish_depth}

                                        multipv={gameMeta?.stockfish_multipv}

                                    />

                                </>

                            )}

                            {pack && !criticalMode && (

                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>

                                    Elegí una jugada crítica para ver el review pack del job.

                                </Typography>

                            )}

                        </>

                    )}

                    {tab === 1 && (
                        <AdvancedMoveAnalysisPanel
                            cursorPath={cursorPath}
                            cursorSan={cursorSan}
                            classificationByPathKey={classificationByPathKey}
                            classificationProgress={classificationProgress}
                            moverElo={cursorMoverElo}
                        />
                    )}

                    {tab === 2 && (

                        <Paper variant="outlined" sx={{ p: 2 }}>

                            <MentalPanel mental={detail?.mental_model} />

                        </Paper>

                    )}

                    </Box>

                    <CoachPgnMoveList

                        treeRoot={treeRoot}

                        cursorPath={cursorPath}

                        onSelectPath={goToPath}

                        onDeleteVariation={handleDeleteVariation}

                        onTruncateForward={handleTruncateForward}

                        pathHasContinuations={pathHasContinuations}

                        evalByFen={evalByFen}

                        classificationByPathKey={classificationByPathKey}

                        classificationProgress={classificationProgress}

                        playerColor={playerColor}

                        resultLabel={pgnResultLabel}

                        maxHeight={320}

                    />

                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 0.5 }}>

                        Jugadas críticas

                    </Typography>

                    <Paper sx={{ maxHeight: 180, overflow: 'auto', mb: 2 }}>

                        <List dense>

                            {decisions.map((d) => (

                                <ListItemButton

                                    key={d.id}

                                    selected={d.id === selectedId}

                                    onClick={() => setSelectedId(d.id)}

                                >

                                    <ListItemText

                                        primary={`${d.review_pack?.move_number ?? '?'}. ${d.review_pack?.played_move?.san ?? `ply ${d.ply}`}`}

                                        secondary={`crit ${d.criticality?.toFixed?.(1) ?? d.criticality}`}

                                    />

                                </ListItemButton>

                            ))}

                            {!decisions.length && !loading && (

                                <ListItemText

                                    sx={{ p: 2 }}

                                    primary="Sin análisis Stockfish aún."

                                    secondary={

                                        <Button

                                            size="small"

                                            component={RouterLink}

                                            to="/coach/jobs"

                                            sx={{ mt: 1, p: 0 }}

                                        >

                                            Encolar en Cola

                                        </Button>

                                    }

                                />

                            )}

                        </List>

                    </Paper>

                </Grid>

            </Grid>

        </Box>

    )

}


