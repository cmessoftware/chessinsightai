import React, { useMemo, useState } from 'react'
import { Box, Button, Paper, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import CoachSubNav from '../components/coach/CoachSubNav.jsx'
import PgnImportPanel from '../components/coach/PgnImportPanel.jsx'
import { useAuth } from '../hooks/useAuth.js'

const ADMIN_CORPUS = [
    { value: 'personal', label: 'Personal' },
    { value: 'elite', label: 'Elite' },
    { value: 'fide', label: 'FIDE' },
    { value: 'novice', label: 'Novice' },
    { value: 'stockfish', label: 'Stockfish' },
]

const USER_CORPUS = [{ value: 'personal', label: 'Personal' }]

export default function CoachImportarPage() {
    const { user } = useAuth()
    const isAdmin = user?.roles?.includes('admin')
    const corpusOptions = useMemo(() => (isAdmin ? ADMIN_CORPUS : USER_CORPUS), [isAdmin])
    const [corpusType, setCorpusType] = useState('personal')

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Coach
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Importá partidas (PGN) o analizá una posición suelta (FEN). El jugador POV se elige
                en <strong>Partidas</strong> al encolar Stockfish.
            </Typography>
            <CoachSubNav />
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Importar Partidas
                </Typography>
                <PgnImportPanel
                    corpusType={corpusType}
                    onCorpusChange={setCorpusType}
                    corpusOptions={corpusOptions}
                />
            </Paper>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Posición sin partida (FEN)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Pegá un FEN y continuá con variantes, clasificación y análisis avanzado (sin
                    guardar en la biblioteca module07).
                </Typography>
                <Button component={RouterLink} to="/coach/position" variant="outlined">
                    Abrir entrada FEN
                </Button>
            </Paper>
        </Box>
    )
}
