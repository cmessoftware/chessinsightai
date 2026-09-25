import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Grid,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { Link as RouterLink, useParams } from 'react-router-dom'
import ChessinsightBoard from '../components/chess/ChessinsightBoard.jsx'
import EngineMultipvPanel from '../components/coach/EngineMultipvPanel.jsx'
import { getDecision, listDecisions, listGames } from '../services/module07Service.js'

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

/** Análisis de una sola partida: tablero + MultiPV por punto crítico. */
export default function CoachGameAnalysisPage() {
    const { gameId } = useParams()
    const [gameMeta, setGameMeta] = useState(null)
    const [decisions, setDecisions] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [detail, setDetail] = useState(null)
    const [tab, setTab] = useState(0)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(true)

    const loadDecisions = useCallback(async () => {
        const rows = await listDecisions(gameId)
        setDecisions(rows)
        return rows
    }, [gameId])

    useEffect(() => {
        listGames()
            .then((games) => setGameMeta(games.find((g) => g.id === gameId) || null))
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
        (pack?.player_color || gameMeta?.player_color || '').toLowerCase() === 'black'
            ? 'black'
            : 'white'
    const lastMove = pack?.played_move?.uci

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
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            {loading && !decisions.length && (
                <Alert severity="info" icon={<CircularProgress size={18} />} sx={{ mb: 2 }}>
                    Esperando decisiones del job (Stockfish)…
                </Alert>
            )}
            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" gutterBottom>
                        Jugadas críticas
                    </Typography>
                    <Paper sx={{ maxHeight: 420, overflow: 'auto' }}>
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
                                    primary="Sin decisiones. Encolá el análisis desde la cola."
                                />
                            )}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    {detail ? (
                        <ChessinsightBoard
                            fen={detail.fen_before}
                            orientation={orientation}
                            lastMove={lastMove}
                            viewOnly
                        />
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center', minHeight: 320 }}>
                            <Typography color="text.secondary">Elegí un ply crítico</Typography>
                        </Paper>
                    )}
                </Grid>
                <Grid item xs={12} md={4}>
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
