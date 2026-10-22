import React, { useCallback, useState } from 'react'
import { Typography } from '@mui/material'
import CoachGameCategoriesSettings from '../components/coach/CoachGameCategoriesSettings.jsx'
import CoachGamesColumnSettings from '../components/coach/CoachGamesColumnSettings.jsx'
import { CoachPageLayout } from '../components/coach/CoachSubNav.jsx'
import {
    COACH_GAMES_TABLE_COLUMN_DEFS,
    defaultVisibleCoachGamesColumns,
    loadVisibleCoachGamesColumns,
    saveVisibleCoachGamesColumns,
} from '../utils/coachGamesTableColumns.js'
import {
    loadCoachGameCategories,
    resetCoachGameCategories,
    saveCoachGameCategories,
} from '../utils/coachGameCategoriesConfig.js'
import { notifyCoachPartidasCategoriesChanged } from '../utils/coachPartidasCategoriesSync.js'
import { notifyCoachPartidasColumnsChanged } from '../utils/coachPartidasColumnsSync.js'

export default function CoachConfiguracionPage() {
    const [visibleColumns, setVisibleColumns] = useState(() => loadVisibleCoachGamesColumns())
    const [gameCategories, setGameCategories] = useState(() => loadCoachGameCategories())

    const toggleColumnVisibility = useCallback((columnId) => {
        const locked = COACH_GAMES_TABLE_COLUMN_DEFS.find((c) => c.id === columnId)?.locked
        if (locked) {
            return
        }
        setVisibleColumns((prev) => {
            const next = new Set(prev)
            if (next.has(columnId)) {
                next.delete(columnId)
            } else {
                next.add(columnId)
            }
            saveVisibleCoachGamesColumns(next)
            notifyCoachPartidasColumnsChanged()
            return next
        })
    }, [])

    const resetColumnVisibility = useCallback(() => {
        const next = defaultVisibleCoachGamesColumns()
        setVisibleColumns(next)
        saveVisibleCoachGamesColumns(next)
        notifyCoachPartidasColumnsChanged()
    }, [])

    const handleCategoriesChange = useCallback(
        (next) => {
            saveCoachGameCategories(next)
            setGameCategories(loadCoachGameCategories())
            notifyCoachPartidasCategoriesChanged()
        },
        [],
    )

    const resetCategories = useCallback(() => {
        resetCoachGameCategories()
        setGameCategories(loadCoachGameCategories())
        notifyCoachPartidasCategoriesChanged()
    }, [])

    return (
        <CoachPageLayout>
            <Typography variant="h5" gutterBottom>
                Configuración
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Preferencias del módulo Coach en este dispositivo.
            </Typography>
            <CoachGamesColumnSettings
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumnVisibility}
                onResetColumns={resetColumnVisibility}
            />
            <CoachGameCategoriesSettings
                categories={gameCategories}
                onChangeCategories={handleCategoriesChange}
                onResetCategories={resetCategories}
            />
        </CoachPageLayout>
    )
}
