import React, { useMemo } from 'react'
import { Autocomplete, Chip, TextField, Typography } from '@mui/material'
import { loadCoachGameCategories } from '../../utils/coachGameCategoriesConfig.js'

/**
 * Multiselect de categorías de Partidas (Libros, Elite, Táctica, …) al importar.
 * Opcional: vacío deja solo la categoría automática por reglas.
 */
export default function CoachImportCategoriesSelect({ value, onChange, sx }) {
    const options = useMemo(() => {
        return [...loadCoachGameCategories()]
            .filter((c) => c.enabled !== false && !c.fallback)
            .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    }, [])

  /** @type {import('../../utils/coachGameCategoriesConfig.js').CoachGameCategoryDef[]} */
    const selected = useMemo(
        () => options.filter((c) => (value || []).includes(c.id)),
        [options, value],
    )

    return (
        <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Categorías (opcional): podés asignar varias a las partidas importadas. También
                podés editarlas después en Partidas.
            </Typography>
            <Autocomplete
                multiple
                disableCloseOnSelect
                options={options}
                value={selected}
                onChange={(_e, next) => onChange(next.map((c) => c.id))}
                getOptionLabel={(opt) => opt.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                limitTags={4}
                size="small"
                sx={{ mb: 2, maxWidth: 520, ...sx }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Categorías"
                        placeholder={selected.length ? '' : 'Ej. Tema táctico, Torneo…'}
                    />
                )}
                renderTags={(tagValue, getTagProps) =>
                    tagValue.map((opt, index) => (
                        <Chip
                            {...getTagProps({ index })}
                            key={opt.id}
                            label={opt.label}
                            size="small"
                        />
                    ))
                }
            />
        </>
    )
}