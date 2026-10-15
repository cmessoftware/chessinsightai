import React, { useMemo, useState } from 'react'
import {
    Alert,
    Link,
    Paper,
    Tab,
    Tabs,
    Typography,
} from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import PgnImportPanel from '../components/coach/PgnImportPanel.jsx'
import { COACH_RETURN_PARTIDAS } from '../components/coach/CoachSubNav.jsx'

const ADMIN_CORPUS = [
    { value: 'personal', label: 'Personal' },
    { value: 'elite', label: 'Elite' },
    { value: 'fide', label: 'FIDE' },
    { value: 'novice', label: 'Novice' },
    { value: 'stockfish', label: 'Stockfish' },
]

const USER_CORPUS = [{ value: 'personal', label: 'Personal' }]

function SiteSyncPlaceholder({ siteLabel }) {
    return (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sincronización {siteLabel} — próximamente (UI-105 / UI-106).
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Filtros: usuario del sitio, desde fecha, tipo de partida (daily, classical, rapid,
                blitz, bullet).
            </Typography>
        </>
    )
}

export default function UnifiedImportPage() {
    const { user } = useAuth()
    const isAdmin = user?.roles?.includes('admin')
    const corpusOptions = useMemo(() => (isAdmin ? ADMIN_CORPUS : USER_CORPUS), [isAdmin])
    const [tab, setTab] = useState(0)
    const [corpusType, setCorpusType] = useState('personal')

    return (
        <Paper elevation={1} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: 'auto' }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 400 }}>
                Importar partida
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
                Importá una partida desde un PGN. Podés revisarla jugada a jugada en Coach, encolar
                análisis Stockfish y comparar candidatas en los momentos críticos.
            </Typography>

            <Alert
                severity="info"
                icon={<InfoOutlined fontSize="inherit" />}
                sx={{ mb: 3, alignItems: 'flex-start' }}
            >
                El jugador a analizar ([White] / [Black]) se elige en{' '}
                <Link component={RouterLink} to={COACH_RETURN_PARTIDAS}>
                    Coach → Partidas
                </Link>
                , no en el login.{' '}
                <Link component={RouterLink} to="/coach/importar">
                    Abrir hub Coach (PGN y FEN)
                </Link>
                . El menú <strong>Partidas</strong> es otro catálogo (legacy).
            </Alert>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, textTransform: 'none' }}>
                <Tab label="PGN" sx={{ textTransform: 'none' }} />
                <Tab label="Chess.com" sx={{ textTransform: 'none' }} />
                <Tab label="Lichess" sx={{ textTransform: 'none' }} />
            </Tabs>

            {tab === 0 && (
                <PgnImportPanel
                    corpusType={corpusType}
                    onCorpusChange={setCorpusType}
                    corpusOptions={corpusOptions}
                />
            )}
            {tab === 1 && <SiteSyncPlaceholder siteLabel="Chess.com" />}
            {tab === 2 && <SiteSyncPlaceholder siteLabel="Lichess" />}

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 3 }}>
                Importación legacy (features ML):{' '}
                <Link component={RouterLink} to="/import/legacy">
                    /import/legacy
                </Link>
            </Typography>
        </Paper>
    )
}
