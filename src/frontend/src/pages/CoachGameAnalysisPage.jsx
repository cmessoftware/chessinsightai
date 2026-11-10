import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Tooltip,
    Typography,
} from '@mui/material'
import HelpOutline from '@mui/icons-material/HelpOutline'
import { useLocation, useParams } from 'react-router-dom'
import CoachStudyWorkspace from '../components/coach/CoachStudyWorkspace.jsx'
import { COACH_RETURN_PARTIDAS } from '../components/coach/CoachSubNav.jsx'
import { formatCoachGameDescription } from '../utils/coachGameDisplay.js'
import { createAnalysisJob, getDecision, getGame, listDecisions } from '../services/module07Service.js'
import { coachDeepAnalysisUsername, resolveCoachPlayerColor } from '../utils/coachPlayerColor.js'
import {
    COACH_CRITICALITY_REFERENCE,
    criticalitySummary,
} from '../utils/coachCriticalityReason.js'
import { buildReplayFromPgn } from '../utils/coachPgnReplay.js'
import { buildTreeFromPgn, extractMovetextFromPgn } from '../utils/coachPgnTreeParse.js'
import { loadCoachAnalysisCursor, saveCoachLastGameId } from '../utils/coachLastGameSession.js'
import { loadCoachStudyDraft } from '../utils/coachStudyDraftSession.js'
import {
    buildTreeFromMainLine,
    createEmptyRoot,
    getNodeAtPath,
    mainLineEndPath,
    mainLinePathForPlyCount,
} from '../utils/coachVariationTree.js'

/** Análisis de una sola partida: tablero + MultiPV por punto crítico. */
export default function CoachGameAnalysisPage() {
    const { gameId } = useParams()
    const location = useLocation()
    const returnTo = location.state?.returnTo || COACH_RETURN_PARTIDAS

    const [gameMeta, setGameMeta] = useState(null)
    const [treeRoot, setTreeRoot] = useState(() => createEmptyRoot())
    const [cursorPath, setCursorPath] = useState([])
    const [decisions, setDecisions] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [detail, setDetail] = useState(null)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)
    const [deepRunning, setDeepRunning] = useState(false)
    const [deepQueued, setDeepQueued] = useState(false)
    const [criterionOpen, setCriterionOpen] = useState(false)
    const [importBanner] = useState(() => location.state?.message || null)

    const loadDecisions = useCallback(async () => {
        const rows = await listDecisions(gameId)
        setDecisions(rows)
        return rows
    }, [gameId])

    useEffect(() => {
        if (gameId) saveCoachLastGameId(gameId)
    }, [gameId])

    useEffect(() => {
        setSelectedId(null)
        setDetail(null)
        setTreeRoot(createEmptyRoot())
        setCursorPath([])

        getGame(gameId)
            .then((g) => {
                setGameMeta(g)
                if (g?.pgn) {
                    const draft = loadCoachStudyDraft(gameId)
                    const serverPgn = g.pgn
                    const draftText = draft?.trim() || ''
                    const serverHasVars = extractMovetextFromPgn(serverPgn).includes('(')
                    const draftHasVars = extractMovetextFromPgn(draftText).includes('(')
                    const pgnForTree =
                        draftText &&
                        draftText !== serverPgn.trim() &&
                        !(serverHasVars && !draftHasVars)
                            ? draftText
                            : serverPgn

                    const applyTree = (tree) => {
                        setTreeRoot(tree)
                        const saved = loadCoachAnalysisCursor(gameId)
                        const fallback = mainLineEndPath(tree)
                        const restored =
                            saved && getNodeAtPath(tree, saved) ? saved : fallback
                        setCursorPath(restored)
                    }

                    const fromTree = buildTreeFromPgn(pgnForTree)
                    if (!fromTree.error && fromTree.tree?.children?.length) {
                        applyTree(fromTree.tree)
                    } else if (pgnForTree !== serverPgn) {
                        const fromServer = buildTreeFromPgn(serverPgn)
                        if (
                            !fromServer.error &&
                            fromServer.tree?.children?.length
                        ) {
                            applyTree(fromServer.tree)
                        } else {
                            const built = buildReplayFromPgn(serverPgn)
                            if (built.error) {
                                setTreeRoot(createEmptyRoot(built.fens[0]))
                                setCursorPath([])
                            } else {
                                applyTree(
                                    buildTreeFromMainLine(
                                        built.fens,
                                        built.ucis,
                                        built.moves,
                                    ),
                                )
                            }
                        }
                    } else {
                        const built = buildReplayFromPgn(g.pgn)
                        if (built.error) {
                            setTreeRoot(createEmptyRoot(built.fens[0]))
                            setCursorPath([])
                        } else {
                            const tree = buildTreeFromMainLine(
                                built.fens,
                                built.ucis,
                                built.moves,
                            )
                            setTreeRoot(tree)
                            const saved = loadCoachAnalysisCursor(gameId)
                            const fallback = mainLineEndPath(tree)
                            const restored =
                                saved && getNodeAtPath(tree, saved) ? saved : fallback
                            setCursorPath(restored)
                        }
                    }
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
                setSelectedId((prev) =>
                    prev && rows.some((r) => r.id === prev) ? prev : null,
                )
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
    const playerColor = resolveCoachPlayerColor(gameMeta, pack)
    const deepUsername = coachDeepAnalysisUsername(gameMeta)
    const waitingDeep = (deepRunning || deepQueued) && !decisions.length

    const runDeepAnalysis = async () => {
        if (!gameId || !deepUsername || deepRunning) return
        setDeepRunning(true)
        setError(null)
        try {
            await createAnalysisJob([String(gameId)], deepUsername)
            setDeepQueued(true)
            setLoading(true)
            await loadDecisions()
        } catch (err) {
            setError(err.message || 'No se pudo encolar el análisis profundo.')
        } finally {
            setDeepRunning(false)
        }
    }

    const topAlerts = (
        <>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            {(loading || waitingDeep) && !decisions.length && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
                    {waitingDeep
                        ? 'Análisis profundo en curso. Esta pantalla espera las jugadas críticas.'
                        : 'Partida importada. Ejecutá el análisis profundo con el icono bajo el tablero.'}
                </Alert>
            )}
        </>
    )

    const decisionsPanel = (
        <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, mb: 0.5 }}>
                <Typography variant="subtitle2">Jugadas críticas</Typography>
                <Tooltip title="Criterio del listado">
                    <IconButton
                        size="small"
                        aria-label="Criterio de las jugadas críticas"
                        onClick={() => setCriterionOpen(true)}
                    >
                        <HelpOutline fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
            <Dialog
                open={criterionOpen}
                onClose={() => setCriterionOpen(false)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>Criterio de las jugadas críticas</DialogTitle>
                <DialogContent>
                    {COACH_CRITICALITY_REFERENCE.map((item) => (
                        <Box key={item.title} sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle2">{item.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {item.body}
                            </Typography>
                        </Box>
                    ))}
                </DialogContent>
            </Dialog>
            <Paper sx={{ maxHeight: 180, overflow: 'auto', mb: 2 }}>
                <List dense>
                    {decisions.map((d) => (
                        <ListItemButton
                            key={d.id}
                            selected={d.id === selectedId}
                            onClick={() => {
                                setSelectedId(d.id)
                                if (typeof d.ply === 'number' && treeRoot?.fen) {
                                    const path = mainLinePathForPlyCount(d.ply)
                                    if (getNodeAtPath(treeRoot, path)) {
                                        setCursorPath(path)
                                    }
                                }
                            }}
                        >
                            <ListItemText
                                primary={`${d.review_pack?.move_number ?? '?'}. ${d.review_pack?.played_move?.san ?? `ply ${d.ply}`}`}
                                secondary={criticalitySummary(d) || 'Sin puntaje'}
                            />
                        </ListItemButton>
                    ))}
                    {!decisions.length && !loading && (
                        <ListItemText
                            sx={{ p: 2 }}
                            primary="Sin análisis profundo aún."
                            secondary="El icono bajo el tablero lo ejecuta en esta pantalla."
                        />
                    )}
                </List>
            </Paper>
        </>
    )

    return (
        <CoachStudyWorkspace
            title="Coach — Análisis de partida"
            subtitle={
                gameMeta ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatCoachGameDescription(gameMeta)}
                    </Typography>
                ) : null
            }
            treeRoot={treeRoot}
            setTreeRoot={setTreeRoot}
            cursorPath={cursorPath}
            setCursorPath={setCursorPath}
            playerColor={playerColor}
            gameMeta={gameMeta}
            onGameMetaChange={setGameMeta}
            gameId={gameId}
            returnTo={returnTo}
            backLabel="← Volver a Coach — Partidas"
            importBanner={importBanner}
            showCoachSubNav
            showMentalTab
            reviewCritical={
                detail
                    ? {
                          detail,
                          pack,
                          onExit: () => {
                              setSelectedId(null)
                              setDetail(null)
                          },
                          stockfishDepth: gameMeta?.stockfish_depth,
                          stockfishMultipv: gameMeta?.stockfish_multipv,
                      }
                    : null
            }
            topAlerts={topAlerts}
            decisionsPanel={decisionsPanel}
            deepAnalysis={{
                onRun: runDeepAnalysis,
                running: deepRunning || waitingDeep,
                disabled: !deepUsername,
            }}
        />
    )
}
