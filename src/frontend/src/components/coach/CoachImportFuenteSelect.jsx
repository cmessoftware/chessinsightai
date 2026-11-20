import React from 'react'
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material'
import { coachCorpusAssignOptions } from '../../utils/coachGameDisplay.js'

/**
 * FEAT-126: Fuente (corpus_type) al importar — misma lista que Partidas → «Fuente de la selección».
 */
export default function CoachImportFuenteSelect({ isAdmin, value, onChange, sx }) {
    const options = coachCorpusAssignOptions(Boolean(isAdmin))
    return (
        <FormControl fullWidth size="small" sx={sx}>
            <InputLabel id="coach-import-fuente-label">Fuente</InputLabel>
            <Select
                labelId="coach-import-fuente-label"
                value={value}
                label="Fuente"
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                        {o.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
}