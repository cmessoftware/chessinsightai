import React, { useMemo, useState } from 'react'
import { Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import CoachSubNav from '../components/coach/CoachSubNav.jsx'
import ChesscomImportPanel from '../components/coach/ChesscomImportPanel.jsx'
import LichessImportPanel from '../components/coach/LichessImportPanel.jsx'
import PgnImportPanel from '../components/coach/PgnImportPanel.jsx'
import PovBulkPanel from '../components/coach/PovBulkPanel.jsx'
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
    const [importSection, setImportSection] = useState('pgn')

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                Coach
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Importá partidas (PGN, Lichess, Chess.com) o analizá una posición suelta (FEN). El jugador POV se elige
                en <strong>Partidas</strong> al encolar Stockfish.
            </Typography>
            <CoachSubNav />
            <Tabs
                value={importSection}
                onChange={(_e, v) => setImportSection(v)}
                sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
                <Tab label="PGN (texto o archivo)" value="pgn" sx={{ textTransform: 'none' }} />
                <Tab label="Lichess" value="lichess" sx={{ textTransform: 'none' }} />
                <Tab label="Chess.com" value="chesscom" sx={{ textTransform: 'none' }} />
                <Tab label="POV masivo" value="pov" sx={{ textTransform: 'none' }} />
                <Tab label="FEN suelta" value="fen" sx={{ textTransform: 'none' }} />
            </Tabs>
            {importSection === 'pgn' && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Importar Partidas (PGN)
                    </Typography>
                    <PgnImportPanel
                        corpusType={corpusType}
                        onCorpusChange={setCorpusType}
                        corpusOptions={corpusOptions}
                    />
                </Paper>
            )}
            {importSection === 'lichess' && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }} id="coach-lichess-import">
                    <Typography variant="h6" gutterBottom>
                        Importar desde Lichess
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Descarga lotes de hasta 200 partidas por ritmo (más recientes primero). La
                        configuración se guarda en tu cuenta.
                    </Typography>
                    <LichessImportPanel corpusType={corpusType} />
                </Paper>
            )}
            {importSection === 'chesscom' && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }} id="coach-chesscom-import">
                    <Typography variant="h6" gutterBottom>
                        Importar desde Chess.com
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Descarga lotes de hasta 200 partidas por ritmo desde la API pública de
                        Chess.com (archivos mensuales). La configuración se guarda en tu cuenta.
                    </Typography>
                    <ChesscomImportPanel corpusType={corpusType} />
                </Paper>
            )}
            {importSection === 'pov' && (
                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }} id="coach-pov-bulk">
                    <Typography variant="h6" gutterBottom>
                        Cambio de usuario POV (todas las partidas)
                    </Typography>
                    <PovBulkPanel />
                </Paper>
            )}
            {importSection === 'fen' && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
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
            )}
        </Box>
    )
}
