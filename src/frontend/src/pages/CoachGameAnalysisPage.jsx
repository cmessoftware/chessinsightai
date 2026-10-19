import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Button,
    CircularProgress,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Typography,
} from '@mui/material'
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom'
import CoachStudyWorkspace from '../components/coach/CoachStudyWorkspace.jsx'
import { COACH_RETURN_PARTIDAS } from '../components/coach/CoachSubNav.jsx'
import { formatCoachGameDescription } from '../utils/coachGameDisplay.js'
import { getDecision, getGame, listDecisions } from '../services/module07Service.js'
import { buildReplayFromPgn } from '../utils/coachPgnReplay.js'
import { loadCoachAnalysisCursor, saveCoachLastGameId } from '../utils/coachLastGameSession.js'
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
                    const built = buildReplayFromPgn(g.pgn)
                    const tree = buildTreeFromMainLine(built.fens, built.ucis, built.moves)
                    setTreeRoot(tree)
                    const saved = loadCoachAnalysisCursor(gameId)
                    const fallback = mainLineEndPath(tree)
                    const restored =
                        saved && getNodeAtPath(tree, saved) ? saved : fallback
                    setCursorPath(restored)
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
    const playerColor =
        (pack?.player_color || gameMeta?.player_color || 'white').toLowerCase() === 'black'
            ? 'black'
            : 'white'

    const topAlerts = (
        <>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            {loading && !decisions.length && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
                    {gameMeta?.analysis_job_id
                        ? 'Esperando decisiones del job (Stockfish)…'
                        : 'Partida importada. Revisá jugadas abajo o encolá Stockfish desde la cola de análisis.'}
                </Alert>
            )}
        </>
    )

    const decisionsPanel = (
        <>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 0.5 }}>
                Jugadas críticas
            </Typography>
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
                                    to={COACH_RETURN_PARTIDAS}
                                    sx={{ mt: 1, p: 0 }}
                                >
                                    Ir a cola de análisis
                                </Button>
                            }
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
        />
    )
}
