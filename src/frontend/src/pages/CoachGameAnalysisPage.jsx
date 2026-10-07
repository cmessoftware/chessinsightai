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
import { getDecision, getGame, listDecisions } from '../services/module07Service.js'

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
    const [replay, setReplay] = useState({
        fens: [new Chess().fen()],
        ucis: [],
        moves: [],
        moveCount: 0,
    })
    const [replayPly, setReplayPly] = useState(0)
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
        getGame(gameId)
            .then((g) => {
                setGameMeta(g)
                if (g?.pgn) {
                    const built = buildReplayFromPgn(g.pgn)
                    setReplay(built)
                    setReplayPly(built.fens.length - 1)
                }
            })
            .catch(() => {})
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
    const orientation =
        (pack?.player_color || gameMeta?.player_color || 'white').toLowerCase() === 'black'
            ? 'black'
            : 'white'

    const criticalMode = Boolean(detail?.fen_before)
    const boardFen = criticalMode ? detail.fen_before : replay.fens[replayPly] || replay.fens[0]
    const lastMove = criticalMode
        ? pack?.played_move?.uci
        : replayPly > 0
          ? replay.ucis[replayPly - 1]
          : null

    const moveLabel = useMemo(() => {
        if (criticalMode) return null
        return `Jugada ${replayPly} / ${replay.fens.length - 1}`
    }, [criticalMode, replayPly, replay.fens.length])

    const goReplay = (ply) => {
        setSelectedId(null)
        setDetail(null)
        setReplayPly(Math.max(0, Math.min(ply, replay.fens.length - 1)))
    }

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
            <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={7} order={{ xs: 1, md: 1 }}>
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
                            viewOnly
                            boardWidth={boardWidth}
                        />
                        {!criticalMode && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
                                <IconButton size="small" onClick={() => goReplay(0)} aria-label="Inicio">
                                    <FirstPage />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => goReplay(replayPly - 1)}
                                    disabled={replayPly <= 0}
                                    aria-label="Anterior"
                                >
                                    <NavigateBefore />
                                </IconButton>
                                <Typography variant="body2" sx={{ mx: 1, minWidth: 100, textAlign: 'center' }}>
                                    {moveLabel}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={() => goReplay(replayPly + 1)}
                                    disabled={replayPly >= replay.fens.length - 1}
                                    aria-label="Siguiente"
                                >
                                    <NavigateNext />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={() => goReplay(replay.fens.length - 1)}
                                    aria-label="Final"
                                >
                                    <LastPage />
                                </IconButton>
                            </Box>
                        )}
                        {criticalMode && (
                            <Button size="small" sx={{ mt: 2 }} onClick={() => goReplay(replayPly)}>
                                Volver al recorrido PGN
                            </Button>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5} order={{ xs: 2, md: 2 }}>
                    <CoachPgnMoveList
                        moves={replay.moves}
                        replayPly={replayPly}
                        onGoPly={goReplay}
                        resultLabel={pgnResultLabel}
                        maxHeight={280}
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
                    <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
                        <Tab label="Motor" />
                        <Tab label="Mental 1600" />
                    </Tabs>
                    {tab === 0 && (
                        <EngineMultipvPanel
                            pack={pack}
                            depth={gameMeta?.stockfish_depth}
                            multipv={gameMeta?.stockfish_multipv}
                        />
                    )}
                    {tab === 1 && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <MentalPanel mental={detail?.mental_model} />
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    )
}
