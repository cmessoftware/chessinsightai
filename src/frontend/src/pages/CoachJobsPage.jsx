import React, { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { listGames, listJobs } from '../services/module07Service.js'

const statusColor = (status) => {
    if (status === 'completed') return 'success'
    if (status === 'failed') return 'error'
    if (status === 'running') return 'warning'
    return 'default'
}

export default function CoachJobsPage() {
    const [jobs, setJobs] = useState([])
    const [games, setGames] = useState([])
    const [error, setError] = useState(null)

    const refresh = useCallback(async () => {
        try {
            const [j, g] = await Promise.all([listJobs(), listGames()])
            setJobs(j)
            setGames(g)
            setError(null)
        } catch (err) {
            setError(err.response?.data?.detail || err.message)
        }
    }, [])

    useEffect(() => {
        refresh()
        const timer = setInterval(refresh, 5000)
        return () => clearInterval(timer)
    }, [refresh])

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h5">Coach — Cola de análisis</Typography>
                <Button variant="outlined" onClick={refresh}>
                    Actualizar
                </Button>
            </Box>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {String(error)}
                </Alert>
            )}
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
                                    <Chip size="small" label={job.status} color={statusColor(job.status)} />
                                </TableCell>
                                <TableCell>{job.stockfish_depth}</TableCell>
                                <TableCell>{job.stockfish_multipv}</TableCell>
                                <TableCell>{job.game_ids?.length ?? 0}</TableCell>
                                <TableCell>{job.error_message || '—'}</TableCell>
                            </TableRow>
                        ))}
                        {!jobs.length && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    Sin jobs. Importá un PGN en Coach → Importar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Paper>
            <Typography variant="h6" gutterBottom>
                Partidas
            </Typography>
            <Paper>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Blancas</TableCell>
                            <TableCell>Negras</TableCell>
                            <TableCell>Tu color</TableCell>
                            <TableCell>Resultado</TableCell>
                            <TableCell>Revisar</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {games.map((g) => (
                            <TableRow key={g.id}>
                                <TableCell>{g.white_player}</TableCell>
                                <TableCell>{g.black_player}</TableCell>
                                <TableCell>{g.player_color}</TableCell>
                                <TableCell>{g.result || '—'}</TableCell>
                                <TableCell>
                                    <Button
                                        size="small"
                                        component={RouterLink}
                                        to={`/coach/games/${g.id}/review`}
                                        disabled={g.analysis_job_id == null}
                                    >
                                        Decisiones
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {!games.length && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
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
