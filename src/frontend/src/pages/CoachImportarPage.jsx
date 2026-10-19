import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Divider, Paper, Tab, Tabs, Typography } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import CoachSubNav from '../components/coach/CoachSubNav.jsx'
import LichessImportPanel from '../components/coach/LichessImportPanel.jsx'
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

const IMPORT_SECTIONS = new Set(['pgn', 'lichess', 'fen'])

export default function CoachImportarPage() {
    const { user } = useAuth()
    const { hash } = useLocation()
    const isAdmin = user?.roles?.includes('admin')
    const corpusOptions = useMemo(() => (isAdmin ? ADMIN_CORPUS : USER_CORPUS), [isAdmin])
    const [corpusType, setCorpusType] = useState('personal')
    const [importSection, setImportSection] = useState('pgn')

    useEffect(() => {
        const key = (hash || '').replace(/^#/, '')
        if (IMPORT_SECTIONS.has(key)) {
            setImportSection(key)
        }
    }, [hash])

    return (
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Importá partidas (PGN, Lichess) o abrí una posición FEN. El jugador POV se elige en{' '}
                <strong>Partidas</strong> al encolar Stockfish.
            </Typography>
            <CoachSubNav />
            <Divider sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5, px: 0.5 }}>
                Fuente de importación
            </Typography>
            <Tabs
                value={importSection}
                onChange={(_e, v) => setImportSection(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                aria-label="Fuente de importación"
                sx={{
                    mb: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    minHeight: 40,
                    '& .MuiTab-root': { minHeight: 40, py: 0.75, textTransform: 'none' },
                }}
            >
                <Tab label="PGN" value="pgn" />
                <Tab label="Lichess" value="lichess" />
                <Tab label="FEN suelta" value="fen" />
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
