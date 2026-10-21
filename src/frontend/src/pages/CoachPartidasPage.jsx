import React from 'react'
import { Typography } from '@mui/material'
import CoachGamesPanel from '../components/coach/CoachGamesPanel.jsx'
import { CoachPageLayout } from '../components/coach/CoachSubNav.jsx'

export default function CoachPartidasPage() {
    return (
        <CoachPageLayout>
            <Typography variant="h5" gutterBottom>
                Coach
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Partidas importadas, cola de análisis en servidor y acceso al análisis liviano por
                jugada.
            </Typography>
            <CoachGamesPanel />
        </CoachPageLayout>
    )
}
