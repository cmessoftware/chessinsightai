import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Grid,
    IconButton,
    Paper,
    Tab,
    Tabs,
    Tooltip,
    Typography,
} from '@mui/material'
import {
    FirstPage,
    FlipCameraAndroid,
    LastPage,
    NavigateBefore,
    NavigateNext,
    PowerSettingsNew,
} from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import ChessinsightBoard from '../chess/ChessinsightBoard.jsx'
import CoachCurrentFenBar from './CoachCurrentFenBar.jsx'
import CoachPgnMoveList from './CoachPgnMoveList.jsx'
import CoachSubNav from './CoachSubNav.jsx'
import Mental1600Panel from './Mental1600Panel.jsx'
import EngineMultipvPanel from './EngineMultipvPanel.jsx'
import AdvancedMoveAnalysisPanel from './AdvancedMoveAnalysisPanel.jsx'
import LiveEnginePanel from './LiveEnginePanel.jsx'
import { useLiveStockfishAnalysis } from '../../hooks/useLiveStockfishAnalysis.js'
import { usePgnEvalCache } from '../../hooks/usePgnEvalCache.js'
import { usePgnMoveClassification } from '../../hooks/usePgnMoveClassification.js'
import {
    usePlyAnnotationsHydration,
    usePlyAnnotationsPersist,
} from '../../hooks/useSyncPlyClassificationPersistence.js'
import { useMental1600Assessment } from '../../hooks/useMental1600Assessment.js'
import { usePgnKeyboardNav } from '../../hooks/usePgnKeyboardNav.js'
import { parseMoverEloFromGame } from '../../utils/coachPlayerElo.js'
import { saveCoachAnalysisCursor } from '../../utils/coachLastGameSession.js'
import {
    applyMoveAtPath,
    countMainLinePlies,
    deleteVariationAtPath,
    getNodeAtPath,
    lastUciForPath,
    moveNumberFromPlyCount,
    pathStepBack,
    pathStepForward,
    pathToBranchEnd,
    truncateLineForward,
    truncateTouchesImportedMoves,
} from '../../utils/coachVariationTree.js'

/**
 * Tablero interactivo + motor live + clasificación CA + lista PGN (partida o posición FEN).
 */
export default function CoachStudyWorkspace({
    title,
    subtitle = null,
    treeRoot,
    setTreeRoot,
    cursorPath,
    setCursorPath,
    playerColor,
    boardOrientation = null,
    gameMeta = null,
    gameId = null,
    returnTo,
    importBanner = null,
    showCoachSubNav = false,
    backLabel = '← Volver',
    reviewCritical = null,
    showMentalTab = false,
    decisionsPanel = null,
    topAlerts = null,
    persistClassification = true,
    embedded = false,
    rootPositionLabel = 'Posición inicial',
}) {
    const [boardOrientationOverride, setBoardOrientationOverride] = useState(null)
    const orientation = boardOrientationOverride ?? boardOrientation ?? playerColor
    const [tab, setTab] = useState(0)
    const [lightClassificationOn, setLightClassificationOn] = useState(false)
    const boardColumnRef = useRef(null)
    const boardKeyboardRef = useRef(null)
    const [boardWidth, setBoardWidth] = useState(420)

    const pack = reviewCritical?.pack
    const criticalMode = Boolean(reviewCritical?.detail?.fen_before)

    useEffect(() => {
        setBoardOrientationOverride(null)
    }, [gameId, playerColor])

    useEffect(() => {
        if (gameId) saveCoachAnalysisCursor(gameId, cursorPath)
    }, [gameId, cursorPath])

    useEffect(() => {
        setLightClassificationOn(false)
    }, [gameId])

    const flipBoard = useCallback(() => {
        setBoardOrientationOverride((prev) => {
            const current = prev ?? boardOrientation ?? playerColor
            return current === 'white' ? 'black' : 'white'
        })
    }, [boardOrientation, playerColor])

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

    const exitCritical = useCallback(() => {
        reviewCritical?.onExit?.()
    }, [reviewCritical])

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

    const boardFen = criticalMode ? reviewCritical.detail.fen_before : cursorNode.fen
    const lastMove = criticalMode
        ? pack?.played_move?.uci
        : lastUciForPath(treeRoot, cursorPath)

    const mainLinePlies = countMainLinePlies(treeRoot)
    const canStepForward = getNodeAtPath(treeRoot, cursorPath).children?.length > 0

    const moveLabel = useMemo(() => {
        if (criticalMode) return null
        const current = moveNumberFromPlyCount(cursorPath.length)
        const total = moveNumberFromPlyCount(mainLinePlies)
        return `Jugada ${current} / ${total}`
    }, [criticalMode, cursorPath.length, mainLinePlies])

    const goToPath = useCallback(
        (path) => {
            exitCritical()
            setCursorPath(path)
        },
        [exitCritical, setCursorPath],
    )

    const stepBack = useCallback(() => {
        if (cursorPath.length <= 0) return
        goToPath(pathStepBack(cursorPath))
    }, [cursorPath, goToPath])

    const stepForward = useCallback(() => {
        if (!canStepForward) return
        goToPath(pathStepForward(treeRoot, cursorPath))
    }, [canStepForward, cursorPath, goToPath, treeRoot])

    const stepFirst = useCallback(() => {
        goToPath([])
    }, [goToPath])

    const stepLast = useCallback(() => {
        goToPath(pathToBranchEnd(treeRoot, cursorPath))
    }, [cursorPath, goToPath, treeRoot])

    usePgnKeyboardNav({
        enabled: !criticalMode,
        targetRef: boardKeyboardRef,
        onPrev: stepBack,
        onNext: stepForward,
        onFirst: stepFirst,
        onLast: stepLast,
    })

    const focusBoardRegion = useCallback(() => {
        boardKeyboardRef.current?.focus({ preventScroll: true })
    }, [])

    const handleBoardMove = useCallback(
        ({ from, to }) => {
            if (criticalMode) return false
            const result = applyMoveAtPath(treeRoot, cursorPath, { from, to })
            if (!result) {
                return false
            }
            exitCritical()
            setTreeRoot(result.tree)
            setCursorPath(result.path)
            return true
        },
        [treeRoot, cursorPath, criticalMode, exitCritical, setTreeRoot, setCursorPath],
    )

    const handleDeleteVariation = useCallback(
        (path) => {
            if (!window.confirm('¿Quitar esta variante (rama completa)?')) {
                return
            }
            const result = deleteVariationAtPath(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot, setTreeRoot, setCursorPath],
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
        [treeRoot, pathHasContinuations, setTreeRoot, setCursorPath],
    )

    const { evalByFen, setEvalForFen } = usePgnEvalCache(treeRoot, playerColor, {
        prefetchDepth: 10,
        prefetchEnabled: tab === 0 && lightClassificationOn,
    })

    const classificationDepth = 12
    const classificationMultipv = 3

    const classificationEloKey = useMemo(
        () => `${gameMeta?.white_elo ?? ''}|${gameMeta?.black_elo ?? ''}`,
        [gameMeta?.white_elo, gameMeta?.black_elo],
    )

    const classificationEnabled = Boolean(treeRoot?.fen && countMainLinePlies(treeRoot) > 0)

    const { hydrateReady: classificationHydrateReady } = usePlyAnnotationsHydration(treeRoot, {
        gameId,
        depth: classificationDepth,
        multipv: classificationMultipv,
        eloKey: classificationEloKey,
        enabled: Boolean(gameId && treeRoot?.fen),
    })

    const { classificationByPathKey, progress: classificationProgress } = usePgnMoveClassification(
        treeRoot,
        playerColor,
        {
            enabled: classificationHydrateReady && classificationEnabled && lightClassificationOn,
            depth: classificationDepth,
            multipv: classificationMultipv,
            cursorPath,
            gameMeta,
            gameId,
            persistSessionCache: persistClassification && Boolean(gameId),
        },
    )

    usePlyAnnotationsPersist(treeRoot, {
        gameId,
        depth: classificationDepth,
        multipv: classificationMultipv,
        byPathKey: classificationByPathKey,
        progress: classificationProgress,
        enabled: Boolean(gameId && treeRoot?.fen && lightClassificationOn),
    })

    const liveDepth = 14
    const liveMultipv = 2

    const liveEngine = useLiveStockfishAnalysis(boardFen, {
        enabled: tab === 0 && Boolean(boardFen) && lightClassificationOn,
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

    const mental1600View = useMental1600Assessment({
        treeRoot,
        cursorPath,
        playerColor,
        classificationByPathKey,
        gameMeta,
        cursorMoverElo,
        criticalMode,
        serverMentalModel: reviewCritical?.detail?.mental_model ?? null,
    })

    const tabLabels = showMentalTab
        ? ['Motor', 'Análisis avanzado', 'Mental 1600']
        : ['Motor', 'Análisis avanzado']

    return (
        <Box>
            {!embedded && title && (
                <Typography variant="h5" gutterBottom>
                    {title}
                </Typography>
            )}
            {!embedded && subtitle}
            {!embedded && showCoachSubNav && <CoachSubNav />}
            {!embedded && returnTo && (
                <Button
                    component={RouterLink}
                    to={returnTo}
                    variant="outlined"
                    size="small"
                    sx={{ mb: 2 }}
                >
                    {backLabel}
                </Button>
            )}

            {importBanner && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {importBanner}
                </Alert>
            )}
            {topAlerts}

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
                        <Box
                            ref={boardKeyboardRef}
                            tabIndex={criticalMode ? -1 : 0}
                            role="group"
                            aria-label="Tablero. Flechas izquierda y derecha para retroceder o avanzar en la línea."
                            onPointerDown={criticalMode ? undefined : focusBoardRegion}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '100%',
                                outline: 'none',
                                borderRadius: 1,
                                '&:focus-visible': {
                                    boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}`,
                                },
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
                        <Box
                            sx={{
                                width: boardWidth,
                                maxWidth: '100%',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                mt: 0.5,
                            }}
                        >
                            <IconButton
                                size="small"
                                onClick={flipBoard}
                                aria-label="Girar tablero"
                                title="Girar tablero"
                            >
                                <FlipCameraAndroid fontSize="small" />
                            </IconButton>
                        </Box>
                        <CoachCurrentFenBar fen={boardFen} maxWidth={boardWidth} />
                        {!criticalMode && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, textAlign: 'center' }}
                            >
                                Arrastrá piezas para probar variantes (solo esta sesión). Coronar: dama.
                            </Typography>
                        )}
                        {!criticalMode && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
                                <IconButton size="small" onClick={stepFirst} aria-label="Primera posición">
                                    <FirstPage />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={stepBack}
                                    disabled={cursorPath.length <= 0}
                                    aria-label="Jugada anterior"
                                >
                                    <NavigateBefore />
                                </IconButton>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{
                                        mx: 1,
                                        minWidth: 100,
                                        textAlign: 'center',
                                        userSelect: 'none',
                                    }}
                                >
                                    {moveLabel}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={stepForward}
                                    disabled={!canStepForward}
                                    aria-label="Jugada siguiente"
                                >
                                    <NavigateNext />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={stepLast}
                                    aria-label="Última posición de la rama"
                                >
                                    <LastPage />
                                </IconButton>
                            </Box>
                        )}
                        </Box>
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
                        {tabLabels.map((label) => (
                            <Tab key={label} label={label} />
                        ))}
                    </Tabs>

                    <Box sx={{ mb: 2, minHeight: 120 }}>
                        {tab === 0 && (
                            <>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Tooltip
                                        title={
                                            lightClassificationOn
                                                ? 'Desactivar análisis liviano (Stockfish WASM)'
                                                : 'Activar análisis liviano (Stockfish WASM)'
                                        }
                                    >
                                        <IconButton
                                            onClick={() => setLightClassificationOn((on) => !on)}
                                            color={lightClassificationOn ? 'primary' : 'default'}
                                            aria-pressed={lightClassificationOn}
                                            aria-label={
                                                lightClassificationOn
                                                    ? 'Desactivar análisis liviano'
                                                    : 'Activar análisis liviano'
                                            }
                                            size="small"
                                        >
                                            <PowerSettingsNew />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                {lightClassificationOn && (
                                    <LiveEnginePanel
                                        liveState={liveEngine}
                                        targetDepth={liveDepth}
                                        multipv={liveMultipv}
                                    />
                                )}
                                {pack && criticalMode && (
                                    <>
                                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                            Análisis Coach (job)
                                        </Typography>
                                        <EngineMultipvPanel
                                            pack={pack}
                                            depth={reviewCritical.stockfishDepth}
                                            multipv={reviewCritical.stockfishMultipv}
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
                                targetDepth={classificationDepth}
                                multipv={classificationMultipv}
                                coachPlayerColor={playerColor}
                            />
                        )}
                        {showMentalTab && tab === 2 && (
                            <Paper variant="outlined" sx={{ p: 2 }}>
                                <Mental1600Panel
                                    assessment={mental1600View.assessment}
                                    emptyMessage={mental1600View.emptyMessage}
                                    source={mental1600View.source}
                                />
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
                        rootPositionLabel={rootPositionLabel}
                    />

                    {decisionsPanel}
                </Grid>
            </Grid>
        </Box>
    )
}
