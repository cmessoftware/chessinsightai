import React from 'react'
import { Tab, Tabs } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'

const TABS = [
    { label: 'Inicio', path: '/coach' },
    { label: 'Importar Partidas', path: '/coach/importar' },
    { label: 'Partidas', path: '/coach/partidas' },
    { label: 'Posición (FEN)', path: '/coach/position' },
]

function activeTab(pathname) {
    if (pathname === '/coach' || pathname === '/coach/') return '/coach'
    if (pathname.startsWith('/coach/position')) return '/coach/position'
    if (pathname.startsWith('/coach/partidas') || pathname.startsWith('/coach/jobs')) {
        return '/coach/partidas'
    }
    if (pathname.startsWith('/coach/games/')) return '/coach'
    if (pathname.startsWith('/coach/importar') || pathname === '/coach/import') {
        return '/coach/importar'
    }
    return '/coach'
}

/** Sub-navegación dentro del área Coach (PGN, biblioteca module07, FEN). */
export default function CoachSubNav() {
    const { pathname } = useLocation()
    const value = activeTab(pathname)

    return (
        <Tabs
            value={value}
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
        >
            {TABS.map((t) => (
                <Tab
                    key={t.path}
                    label={t.label}
                    value={t.path}
                    component={RouterLink}
                    to={t.path}
                    sx={{ textTransform: 'none' }}
                />
            ))}
        </Tabs>
    )
}

export const COACH_RETURN_PARTIDAS = '/coach/partidas'
