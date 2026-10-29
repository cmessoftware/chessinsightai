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
    Fullscreen,
    LastPage,
    NavigateBefore,
    NavigateNext,
    PowerSettingsNew,
} from '@mui/icons-material'
import CoachBoardFullscreenOverlay from './CoachBoardFullscreenOverlay.jsx'
import { Link as RouterLink } from 'react-router-dom'
import ChessinsightBoard from '../chess/ChessinsightBoard.jsx'
import CoachCapturedPiecesStack from './CoachCapturedPiecesBar.jsx'
import CoachCurrentFenBar from './CoachCurrentFenBar.jsx'
import CoachPgnMoveList from './CoachPgnMoveList.jsx'
import { CoachConfirmBadge } from './coachPanelStatus.jsx'
import Mental1600Panel from './Mental1600Panel.jsx'
import EngineMultipvPanel from './EngineMultipvPanel.jsx'
import AdvancedMoveAnalysisPanel from './AdvancedMoveAnalysisPanel.jsx'
import LiveEnginePanel from './LiveEnginePanel.jsx'
import CoachEvalChartCollapsible from './CoachEvalChartCollapsible.jsx'
import CoachPlyAnnotationPanel from './CoachPlyAnnotationPanel.jsx'
import CoachPromotionPicker from './CoachPromotionPicker.jsx'
import { promotionChoicesForMove } from '../../utils/coachPromotion.js'
import { buildMainLineEvalCpSeries, mainLinePlyFromCursorPath } from '../../utils/coachEvalCpSeries.js'
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
import { mainLineSignature } from '../../utils/coachClassificationSessionCache.js'
import {
    applyPlyUserAnnotationPatch,
    loadPlyUserAnnotationsForScope,
    savePlyUserAnnotationsForScope,
} from '../../utils/coachPlyUserAnnotations.js'
import { saveCoachAnalysisCursor } from '../../utils/coachLastGameSession.js'
import {
    buildStudyPgnFromTree,
    studyPgnMatchesTree,
} from '../../utils/coachPgnTreeParse.js'
import { patchCoachGameStudyPgn, parseApiDetail } from '../../services/module07Service.js'
import { useCoachStudyPersistence } from '../../hooks/useCoachStudyPersistence.js'
import { clearCoachStudyDraft } from '../../utils/coachStudyDraftSession.js'
import { computeCapturedPiecesFromTree } from '../../utils/coachCapturedPieces.js'
import {
    applyMoveAtPath,
    countMainLinePlies,
    deleteLeafMoveAtPath,
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
    sourcePgn = null,
    onGameMetaChange = null,
}) {
    const [boardOrientationOverride, setBoardOrientationOverride] = useState(null)
    const orientation = boardOrientationOverride ?? boardOrientation ?? playerColor
    const [tab, setTab] = useState(0)
    const [lightClassificationOn, setLightClassificationOn] = useState(false)
    const boardColumnRef = useRef(null)
    const boardKeyboardRef = useRef(null)
    const [boardWidth, setBoardWidth] = useState(420)
    const [pendingPgnAction, setPendingPgnAction] = useState(null)
    const [pendingPromotion, setPendingPromotion] = useState(null)
    const pendingPromotionRef = useRef(null)
    const [plyUserByPathKey, setPlyUserByPathKey] = useState({})
    const [saveStudyBusy, setSaveStudyBusy] = useState(false)
    const [saveStudyMessage, setSaveStudyMessage] = useState(null)
    const [boardFullscreen, setBoardFullscreen] = useState(false)
    const [fullscreenPgnVisible, setFullscreenPgnVisible] = useState(true)
    const [pgnMovetextVisible, setPgnMovetextVisible] = useState(true)

    const effectiveSourcePgn = sourcePgn ?? gameMeta?.pgn ?? null

    const studyDirty = useMemo(() => {
        if (!gameId || !effectiveSourcePgn || !treeRoot?.children?.length) {
            return false
        }
        return !studyPgnMatchesTree(effectiveSourcePgn, treeRoot, effectiveSourcePgn, {
            result: gameMeta?.result ?? null,
            plyUserByPathKey,
        })
    }, [gameId, effectiveSourcePgn, treeRoot, gameMeta?.result, plyUserByPathKey])

    const handleSaveStudy = useCallback(async () => {
        if (!gameId || !effectiveSourcePgn || saveStudyBusy) return
        setSaveStudyBusy(true)
        setSaveStudyMessage(null)
        try {
            const pgnText = buildStudyPgnFromTree(treeRoot, effectiveSourcePgn, {
                result: gameMeta?.result ?? null,
                plyUserByPathKey,
            })
            const updated = await patchCoachGameStudyPgn(gameId, pgnText)
            if (onGameMetaChange) {
                onGameMetaChange({
                    ...(gameMeta || {}),
                    ...updated,
                    pgn: updated?.pgn ?? pgnText,
                })
            }
            clearCoachStudyDraft(gameId)
            setSaveStudyMessage('Estudio guardado en la partida.')
        } catch (err) {
            setSaveStudyMessage(parseApiDetail(err))
        } finally {
            setSaveStudyBusy(false)
        }
    }, [
        gameId,
        effectiveSourcePgn,
        saveStudyBusy,
        treeRoot,
        gameMeta?.result,
        plyUserByPathKey,
        onGameMetaChange,
        gameMeta,
    ])

    useCoachStudyPersistence({
        gameId,
        treeRoot,
        effectiveSourcePgn,
        gameMeta,
        plyUserByPathKey,
        onGameMetaChange,
    })

    const plyUserAnnotationScopeKey = useMemo(() => {
        if (gameId) return String(gameId)
        if (!treeRoot?.fen) return null
        return `local:${mainLineSignature(treeRoot)}`
    }, [gameId, treeRoot])

    useEffect(() => {
        if (!plyUserAnnotationScopeKey) {
            setPlyUserByPathKey({})
            return
        }
        setPlyUserByPathKey(loadPlyUserAnnotationsForScope(plyUserAnnotationScopeKey))
    }, [plyUserAnnotationScopeKey])

    const handlePlyUserAnnotationChange = useCallback(
        (path, patch) => {
            if (!plyUserAnnotationScopeKey || !path?.length) return
            setPlyUserByPathKey((prev) => {
                const next = applyPlyUserAnnotationPatch(prev, path, patch)
                savePlyUserAnnotationsForScope(plyUserAnnotationScopeKey, next)
                return next
            })
        },
        [plyUserAnnotationScopeKey],
    )

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
            const widthCap = pgnMovetextVisible ? 480 : 640
            const w = Math.min(widthCap, columnW - 16, vhCap)
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
    }, [pgnMovetextVisible])

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
    const capturedPieces = useMemo(
        () => computeCapturedPiecesFromTree(treeRoot, cursorPath),
        [treeRoot, cursorPath],
    )
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

    const applyBoardMove = useCallback(
        (from, to, promotion) => {
            const result = applyMoveAtPath(treeRoot, cursorPath, { from, to, promotion })
            if (!result) return false
            exitCritical()
            setTreeRoot(result.tree)
            setCursorPath(result.path)
            return true
        },
        [treeRoot, cursorPath, exitCritical, setTreeRoot, setCursorPath],
    )

    const handleBoardMove = useCallback(
        ({ from, to }) => {
            if (criticalMode) return false
            const choices = promotionChoicesForMove(boardFen, from, to)
            if (choices.length > 0) {
                const pending = { from, to, choices }
                pendingPromotionRef.current = pending
                setPendingPromotion(pending)
                return false
            }
            return applyBoardMove(from, to)
        },
        [boardFen, criticalMode, applyBoardMove],
    )

    const handlePromotionSelect = useCallback(
        (piece) => {
            const pending = pendingPromotionRef.current
            if (!pending) return
            applyBoardMove(pending.from, pending.to, piece)
            pendingPromotionRef.current = null
            setPendingPromotion(null)
        },
        [applyBoardMove],
    )

    const cancelPendingPromotion = useCallback(() => {
        pendingPromotionRef.current = null
        setPendingPromotion(null)
    }, [])

    useEffect(() => {
        pendingPromotionRef.current = null
        setPendingPromotion(null)
    }, [cursorPath, gameId])

    const executeDeleteVariation = useCallback(
        (path) => {
            const result = deleteVariationAtPath(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot, setTreeRoot, setCursorPath],
    )

    const requestDeleteVariation = useCallback((path) => {
        if (!path?.length) return
        setPendingPgnAction({
            kind: 'deleteVariation',
            path,
            message: '¿Quitar esta variante (rama completa)?',
            confirmLabel: 'Quitar variante',
        })
    }, [])

    const pathHasContinuations = useCallback(
        (path) => {
            if (!path?.length) return false
            const node = getNodeAtPath(treeRoot, path)
            return Boolean(node?.children?.length)
        },
        [treeRoot],
    )

    const executeTruncateForward = useCallback(
        (path) => {
            if (!path?.length) return
            const result = truncateLineForward(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot, setTreeRoot, setCursorPath],
    )

    const requestTruncateForward = useCallback(
        (path) => {
            if (!path?.length || !pathHasContinuations(path)) return
            const inVariation = path.some((idx) => idx > 0)
            const touchesImport = truncateTouchesImportedMoves(treeRoot, path)
            let message
            if (inVariation) {
                message =
                    '¿Borrar las jugadas restantes de esta rama (y subvariantes) desde aquí?'
            } else if (touchesImport) {
                message =
                    '¿Borrar todas las jugadas desde aquí en adelante? Se eliminará parte de la partida importada y sus variantes.'
            } else {
                message =
                    '¿Borrar todas las jugadas y subvariantes desde esta posición en adelante?'
            }
            setPendingPgnAction({
                kind: 'truncate',
                path,
                message,
                confirmLabel: 'Sí, borrar',
            })
        },
        [treeRoot, pathHasContinuations],
    )

    const executeDeleteVariationMove = useCallback(
        (path) => {
            const result = deleteLeafMoveAtPath(treeRoot, path)
            if (!result) return
            setTreeRoot(result.tree)
            setCursorPath(result.path)
        },
        [treeRoot, setTreeRoot, setCursorPath],
    )

    const requestDeleteVariationMove = useCallback((path) => {
        if (!path?.length) return
        setPendingPgnAction({
            kind: 'deleteVariationMove',
            path,
            message: '¿Borrar esta jugada de la variante?',
            confirmLabel: 'Borrar jugada',
        })
    }, [])

    const confirmPendingPgnAction = useCallback(() => {
        if (!pendingPgnAction) return
        const { kind, path } = pendingPgnAction
        if (kind === 'deleteVariation') executeDeleteVariation(path)
        else if (kind === 'deleteVariationMove') executeDeleteVariationMove(path)
        else executeTruncateForward(path)
        setPendingPgnAction(null)
    }, [
        pendingPgnAction,
        executeDeleteVariation,
        executeDeleteVariationMove,
        executeTruncateForward,
    ])

    const cancelPendingPgnAction = useCallback(() => {
        setPendingPgnAction(null)
    }, [])

    const { evalByFen, scoreByFen, setEvalForFen } = usePgnEvalCache(treeRoot, playerColor, {
        prefetchDepth: 10,
        prefetchEnabled: tab === 0 && lightClassificationOn,
        gameId,
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
    })

    useEffect(() => {
        if (liveEngine.status === 'ready' && liveEngine.lines?.[0]?.player_score && boardFen) {
            setEvalForFen(boardFen, liveEngine.lines[0].player_score)
        }
    }, [liveEngine.status, liveEngine.lines, boardFen, setEvalForFen])

    const evalCpSeries = useMemo(
        () => buildMainLineEvalCpSeries(treeRoot, scoreByFen),
        [treeRoot, scoreByFen],
    )
    const evalChartCursorPly = useMemo(() => mainLinePlyFromCursorPath(cursorPath), [cursorPath])

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

    const pgnMoveListProps = {
        treeRoot,
        cursorPath,
        onSelectPath: goToPath,
        onDeleteVariation: requestDeleteVariation,
        onTruncateForward: requestTruncateForward,
        onDeleteVariationMove: requestDeleteVariationMove,
        pathHasContinuations,
        evalByFen,
        classificationByPathKey,
        classificationProgress,
        playerColor,
        resultLabel: pgnResultLabel,
        mainLineResult: gameMeta?.result ?? null,
        rootPositionLabel,
        sourcePgn: effectiveSourcePgn,
        plyUserByPathKey,
        onSaveStudy: gameId ? handleSaveStudy : null,
        studyDirty,
        saveStudyBusy,
        saveStudyMessage,
        movetextVisible: pgnMovetextVisible,
        onToggleMovetext: () => setPgnMovetextVisible((v) => !v),
    }

    const renderBoardAtWidth = (width) => (
        <CoachCapturedPiecesStack
            orientation={orientation}
            capturedByWhite={capturedPieces.capturedByWhite}
            capturedByBlack={capturedPieces.capturedByBlack}
            boardWidth={width}
        >
            <Box sx={{ position: 'relative', width, maxWidth: '100%' }}>
                <ChessinsightBoard
                    fen={boardFen}
                    orientation={orientation}
                    lastMove={lastMove}
                    viewOnly={criticalMode}
                    onMove={handleBoardMove}
                    boardWidth={width}
                />
                {pendingPromotion && !criticalMode && (
                    <CoachPromotionPicker
                        pending={pendingPromotion}
                        boardWidth={width}
                        orientation={orientation}
                        moverColor={boardFen.split(/\s+/)[1] === 'b' ? 'black' : 'white'}
                        onSelect={handlePromotionSelect}
                        onCancel={cancelPendingPromotion}
                    />
                )}
            </Box>
        </CoachCapturedPiecesStack>
    )

    return (
        <Box>
            {!embedded && title && (
                <Typography variant="h5" gutterBottom>
                    {title}
                </Typography>
            )}
            {!embedded && subtitle}
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
                    sm={pgnMovetextVisible ? 7 : 12}
                    md={pgnMovetextVisible ? 7 : 8}
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
                        <CoachCapturedPiecesStack
                            orientation={orientation}
                            capturedByWhite={capturedPieces.capturedByWhite}
                            capturedByBlack={capturedPieces.capturedByBlack}
                            boardWidth={boardWidth}
                        >
                            <Box
                                sx={{
                                    position: 'relative',
                                    width: boardWidth,
                                    maxWidth: '100%',
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
                                {pendingPromotion && !criticalMode && (
                                    <CoachPromotionPicker
                                        pending={pendingPromotion}
                                        boardWidth={boardWidth}
                                        orientation={orientation}
                                        moverColor={
                                            boardFen.split(/\s+/)[1] === 'b' ? 'black' : 'white'
                                        }
                                        onSelect={handlePromotionSelect}
                                        onCancel={cancelPendingPromotion}
                                    />
                                )}
                            </Box>
                        </CoachCapturedPiecesStack>
                        <Box
                            sx={{
                                width: boardWidth,
                                maxWidth: '100%',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 0.5,
                                mt: 0.5,
                            }}
                        >
                            {!criticalMode && (
                                <Tooltip title="Pantalla completa (tablero y PGN)">
                                    <IconButton
                                        size="small"
                                        onClick={() => setBoardFullscreen(true)}
                                        aria-label="Pantalla completa del tablero"
                                    >
                                        <Fullscreen fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton
                                size="small"
                                onClick={flipBoard}
                                aria-label="Girar tablero"
                                title="Girar tablero"
                            >
                                <FlipCameraAndroid fontSize="small" />
                            </IconButton>
                        </Box>
                        <CoachCurrentFenBar
                            fen={boardFen}
                            maxWidth={boardWidth}
                            returnTo={returnTo}
                        />
                        {!criticalMode && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, textAlign: 'center' }}
                            >
                                {gameId
                                    ? 'Arrastrá piezas para probar variantes; se guardan solas en ~1 s (o «Guardar estudio» en el panel PGN).'
                                    : 'Arrastrá piezas para probar variantes (solo esta sesión). Al coronar, elegí pieza en el tablero.'}
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
                        {!criticalMode && (
                            <CoachPlyAnnotationPanel
                                width={boardWidth}
                                cursorPath={cursorPath}
                                cursorSan={cursorSan}
                                plyUserByPathKey={plyUserByPathKey}
                                onPlyUserAnnotationChange={handlePlyUserAnnotationChange}
                            />
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
                    sm={pgnMovetextVisible ? 5 : 12}
                    md={pgnMovetextVisible ? 5 : 4}
                    order={{ xs: 2, sm: 2 }}
                    sx={{
                        minWidth: 0,
                        flex: { sm: '0 0 auto' },
                        width: {
                            sm: pgnMovetextVisible ? '41.666667%' : '100%',
                        },
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
                                    <>
                                        <CoachEvalChartCollapsible
                                            series={evalCpSeries}
                                            cursorPly={evalChartCursorPly}
                                            onSelectPath={goToPath}
                                        />
                                        <LiveEnginePanel
                                            liveState={liveEngine}
                                            targetDepth={liveDepth}
                                            multipv={liveMultipv}
                                        />
                                    </>
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

                    {pendingPgnAction && (
                        <Box sx={{ mb: 1 }}>
                            <CoachConfirmBadge
                                message={pendingPgnAction.message}
                                confirmLabel={pendingPgnAction.confirmLabel}
                                onConfirm={confirmPendingPgnAction}
                                onCancel={cancelPendingPgnAction}
                            />
                        </Box>
                    )}

                    <CoachPgnMoveList {...pgnMoveListProps} maxHeight={320} />

                    {decisionsPanel}
                </Grid>
            </Grid>

            <CoachBoardFullscreenOverlay
                open={boardFullscreen && !criticalMode}
                onClose={() => setBoardFullscreen(false)}
                pgnVisible={fullscreenPgnVisible}
                onTogglePgn={() => setFullscreenPgnVisible((v) => !v)}
                onFlipBoard={flipBoard}
                moveLabel={moveLabel}
                stepFirst={stepFirst}
                stepBack={stepBack}
                stepForward={stepForward}
                stepLast={stepLast}
                canStepForward={canStepForward}
                cursorPathLength={cursorPath.length}
                board={renderBoardAtWidth}
                pgnPanel={<CoachPgnMoveList {...pgnMoveListProps} />}
            />
        </Box>
    )
}
