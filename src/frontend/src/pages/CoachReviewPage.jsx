import React, { useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Grid,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { useParams } from 'react-router-dom'
import ChessinsightBoard from '../components/chess/ChessinsightBoard.jsx'
import { getDecision, listDecisions } from '../services/module07Service.js'

function MotorPanel({ pack }) {
    if (!pack) return null
    const played = pack.played_move?.san || '—'
    const candidates = pack.candidates || []
    return (
        <Box>
            <Typography variant="subtitle2">Jugada jugada: {played}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
                Criticality: {pack.criticality?.score ?? '—'} ({pack.criticality?.level ?? '—'})
            </Typography>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Candidatas (MultiPV)
            </Typography>
            <List dense>
                {candidates.map((c, i) => (
                    <ListItemText
                        key={i}
                        primary={`${c.san || c.uci} — gap ${c.eval_gap_cp ?? '?'} cp`}
                        secondary={c.candidate_type || c.purpose || ''}
                    />
                ))}
            </List>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                {JSON.stringify(pack.actual_result || pack.comparison_summary || {}, null, 2)}
            </Typography>
        </Box>
    )
}

function MentalPanel({ mental }) {
    if (!mental) return null
    return (
        <Box>
            <Typography variant="subtitle2">
                Modo: {mental.mode} — pausa sugerida: {mental.pause_seconds}s
            </Typography>
            <Typography variant="subtitle2" sx={{ mt: 2 }}>
                Plan de pensamiento
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

export default function CoachReviewPage() {
    const { gameId } = useParams()
    const [decisions, setDecisions] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [detail, setDetail] = useState(null)
    const [tab, setTab] = useState(0)
    const [error, setError] = useState(null)

    useEffect(() => {
        listDecisions(gameId)
            .then((rows) => {
                setDecisions(rows)
                if (rows.length) setSelectedId(rows[0].id)
            })
            .catch((err) => setError(err.message))
    }, [gameId])

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
        (pack?.player_color || '').toLowerCase() === 'black' ? 'black' : 'white'
    const lastMove = pack?.played_move?.uci

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Coach — Revisión de decisiones
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    <Paper sx={{ maxHeight: 480, overflow: 'auto' }}>
                        <List dense>
                            {decisions.map((d) => (
                                <ListItemButton
                                    key={d.id}
                                    selected={d.id === selectedId}
                                    onClick={() => setSelectedId(d.id)}
                                >
                                    <ListItemText
                                        primary={`Ply ${d.ply} — crit ${d.criticality?.toFixed?.(1) ?? d.criticality}`}
                                        secondary={d.review_pack?.played_move?.san}
                                    />
                                </ListItemButton>
                            ))}
                            {!decisions.length && (
                                <ListItemText sx={{ p: 2 }} primary="Sin decisiones aún (job en curso o vacío)." />
                            )}
                        </List>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={5}>
                    {detail && (
                        <ChessinsightBoard
                            fen={detail.fen_before}
                            orientation={orientation}
                            lastMove={lastMove}
                            viewOnly
                        />
                    )}
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2 }}>
                        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                            <Tab label="Motor" />
                            <Tab label="Mental 1600" />
                        </Tabs>
                        <Box sx={{ mt: 2 }}>
                            {tab === 0 && <MotorPanel pack={pack} />}
                            {tab === 1 && <MentalPanel mental={detail?.mental_model} />}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    )
}
