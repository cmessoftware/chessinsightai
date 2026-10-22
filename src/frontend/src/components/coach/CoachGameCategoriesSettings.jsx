import React, { useCallback, useMemo, useState } from 'react'
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material'
import { Add, DeleteOutline, EditOutlined } from '@mui/icons-material'
import {
    categoryRulesSummary,
    slugifyCategoryId,
} from '../../utils/coachGameCategoriesConfig.js'

const CORPUS_OPTIONS = [
    { value: '', label: '(sin corpus)' },
    { value: 'elite', label: 'elite' },
    { value: 'fide', label: 'fide' },
    { value: 'novice', label: 'novice' },
    { value: 'stockfish', label: 'stockfish' },
    { value: 'personal', label: 'personal' },
]

function rulesToForm(rules) {
    const sourceParts = []
    let textKeywords = ''
    let corpusType = ''
    for (const r of rules || []) {
        if (r.type === 'source_contains') sourceParts.push(r.value)
        if (r.type === 'text_keywords') textKeywords = r.value
        if (r.type === 'corpus_type') corpusType = r.value
    }
    return {
        sourceContains: sourceParts.join(', '),
        textKeywords,
        corpusType,
    }
}

function formToRules(form) {
    /** @type {import('../../utils/coachGameCategoriesConfig.js').CoachCategoryRule[]} */
    const rules = []
    const sources = String(form.sourceContains || '')
        .split(/[,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    for (const value of sources) {
        rules.push({ type: 'source_contains', value })
    }
    const kw = String(form.textKeywords || '').trim()
    if (kw) rules.push({ type: 'text_keywords', value: kw })
    const corpus = String(form.corpusType || '').trim()
    if (corpus) rules.push({ type: 'corpus_type', value: corpus })
    return rules
}

const emptyForm = () => ({
    id: '',
    label: '',
    priority: 70,
    sourceContains: '',
    textKeywords: '',
    corpusType: '',
})

/** FEAT-046: categorías de Partidas (localStorage). */
export default function CoachGameCategoriesSettings({
    categories,
    onChangeCategories,
    onResetCategories,
    embedded = false,
}) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [isNew, setIsNew] = useState(false)

    const sorted = useMemo(
        () => [...categories].sort((a, b) => a.priority - b.priority),
        [categories],
    )

    const openEdit = useCallback((cat) => {
        const f = rulesToForm(cat.rules)
        setForm({
            id: cat.id,
            label: cat.label,
            priority: cat.priority,
            ...f,
        })
        setIsNew(false)
        setDialogOpen(true)
    }, [])

    const openAdd = useCallback(() => {
        setForm(emptyForm())
        setIsNew(true)
        setDialogOpen(true)
    }, [])

    const toggleEnabled = useCallback(
        (id) => {
            onChangeCategories(
                categories.map((c) =>
                    c.id === id ? { ...c, enabled: c.enabled === false ? true : false } : c,
                ),
            )
        },
        [categories, onChangeCategories],
    )

    const deleteCategory = useCallback(
        (id) => {
            onChangeCategories(categories.filter((c) => c.id !== id))
        },
        [categories, onChangeCategories],
    )

    const saveDialog = () => {
        const label = String(form.label || '').trim()
        if (!label) return
        const rules = formToRules(form)
        const priority = Number(form.priority)
        if (isNew) {
            let id = slugifyCategoryId(label)
            if (categories.some((c) => c.id === id)) {
                id = `${id}_${Date.now()}`
            }
            onChangeCategories([
                ...categories,
                {
                    id,
                    label,
                    priority: Number.isFinite(priority) ? priority : 70,
                    enabled: true,
                    builtIn: false,
                    rules,
                },
            ])
        } else {
            onChangeCategories(
                categories.map((c) =>
                    c.id === form.id
                        ? {
                              ...c,
                              label,
                              priority: Number.isFinite(priority) ? priority : c.priority,
                              rules: c.fallback ? c.rules : rules.length ? rules : c.rules,
                          }
                        : c,
                ),
            )
        }
        setDialogOpen(false)
    }

    const body = (
        <>
            {!embedded && (
                <Typography variant="subtitle1" gutterBottom>
                    Categorías de partidas
                </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Definí cómo se clasifican las partidas en Coach → Partidas. Menor prioridad se
                evalúa primero. Las reglas usan fuente, corpus (tipo al importar) y palabras en
                descripción/título.
            </Typography>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell padding="checkbox">Activa</TableCell>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Prioridad</TableCell>
                        <TableCell>Reglas</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sorted.map((cat) => (
                        <TableRow key={cat.id}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={cat.enabled !== false}
                                    disabled={cat.fallback}
                                    onChange={() => toggleEnabled(cat.id)}
                                />
                            </TableCell>
                            <TableCell>
                                {cat.label}
                                {cat.builtIn ? (
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 1 }}
                                    >
                                        (incluida)
                                    </Typography>
                                ) : null}
                            </TableCell>
                            <TableCell>{cat.priority}</TableCell>
                            <TableCell sx={{ maxWidth: 320 }}>
                                <Typography variant="body2" color="text.secondary" noWrap title={categoryRulesSummary(cat)}>
                                    {categoryRulesSummary(cat)}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                <Tooltip title="Editar">
                                    <IconButton size="small" onClick={() => openEdit(cat)} aria-label="Editar categoría">
                                        <EditOutlined fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {!cat.builtIn && (
                                    <Tooltip title="Eliminar">
                                        <IconButton
                                            size="small"
                                            onClick={() => deleteCategory(cat.id)}
                                            aria-label="Eliminar categoría"
                                        >
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button size="small" variant="contained" startIcon={<Add />} onClick={openAdd}>
                    Nueva categoría
                </Button>
                <Button size="small" variant="outlined" onClick={onResetCategories}>
                    Restaurar categorías incluidas
                </Button>
            </Box>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{isNew ? 'Nueva categoría' : 'Editar categoría'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Nombre"
                        value={form.label}
                        onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                        required
                        fullWidth
                    />
                    <TextField
                        label="Prioridad (menor = se aplica antes)"
                        type="number"
                        value={form.priority}
                        onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                        fullWidth
                    />
                    {!categories.find((c) => c.id === form.id)?.fallback && (
                        <>
                            <TextField
                                label="Fuente contiene (separar con coma)"
                                value={form.sourceContains}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, sourceContains: e.target.value }))
                                }
                                placeholder="lichess, estudio"
                                fullWidth
                            />
                            <TextField
                                label="Palabras en descripción/título (separar con coma)"
                                value={form.textKeywords}
                                onChange={(e) =>
                                    setForm((f) => ({ ...f, textKeywords: e.target.value }))
                                }
                                placeholder="torneo, campeonato"
                                fullWidth
                            />
                            <FormControl fullWidth>
                                <InputLabel id="cat-corpus-label">Corpus (importación)</InputLabel>
                                <Select
                                    labelId="cat-corpus-label"
                                    label="Corpus (importación)"
                                    value={form.corpusType}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, corpusType: e.target.value }))
                                    }
                                >
                                    {CORPUS_OPTIONS.map((o) => (
                                        <MenuItem key={o.value || '_none'} value={o.value}>
                                            {o.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </>
                    )}
                    {categories.find((c) => c.id === form.id)?.fallback && (
                        <Typography variant="body2" color="text.secondary">
                            Esta categoría es el resto (Importación PGN): no lleva reglas.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={saveDialog} disabled={!form.label.trim()}>
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    )
    if (embedded) return body
    return (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
            {body}
        </Paper>
    )
}
