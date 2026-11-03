import React, { useState } from 'react'
import { Box, Checkbox, FormControlLabel, Typography } from '@mui/material'
import {
    parseApiDetail,
    patchCoachGameManualAnalysis,
} from '../../services/module07Service.js'

/** FEAT-094: same `coach_games.manual_analysis` flag as the Partidas column. */
export default function CoachManualAnalysisCheckbox({ gameId, checked = false, onUpdated }) {
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    if (!gameId) return null

    const toggle = async (event) => {
        const next = event.target.checked
        setSaving(true)
        setError('')
        try {
            const updated = await patchCoachGameManualAnalysis(gameId, next)
            onUpdated?.(updated)
        } catch (err) {
            setError(parseApiDetail(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
            <FormControlLabel
                sx={{
                    m: 0,
                    flexShrink: 0,
                    '& .MuiFormControlLabel-label': { whiteSpace: 'nowrap' },
                }}
                control={
                    <Checkbox
                        size="small"
                        checked={Boolean(checked)}
                        disabled={saving}
                        onChange={toggle}
                        inputProps={{ 'aria-label': 'Análisis manual' }}
                    />
                }
                label="Análisis manual"
            />
            {error ? (
                <Typography variant="caption" color="error" sx={{ pl: 0.5 }}>
                    {error}
                </Typography>
            ) : null}
        </Box>
    )
}
