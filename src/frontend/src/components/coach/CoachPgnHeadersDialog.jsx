import React, { useEffect, useState } from 'react'
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import { DeleteOutline } from '@mui/icons-material'
import {
    BLANK_STUDY_HEADER_ROWS,
    PGN_HEADER_LABELS,
    listPgnHeaderRows,
    replacePgnHeaders,
} from '../../utils/pgnHeaders.js'

const TAG_RE = /^[A-Za-z][A-Za-z0-9]*$/

function draftFromPgn(sourcePgn) {
    const rows = listPgnHeaderRows(sourcePgn)
    const source = rows.length ? rows : BLANK_STUDY_HEADER_ROWS
    return source.map((row) => ({ tag: row.tag, value: row.value ?? '' }))
}

export default function CoachPgnHeadersDialog({ open, onClose, sourcePgn, onSave }) {
    const editable = typeof onSave === 'function'
    const [draft, setDraft] = useState([])
    const [newTag, setNewTag] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!open) return
        setDraft(draftFromPgn(sourcePgn))
        setNewTag('')
        setError(null)
        setBusy(false)
    }, [open, sourcePgn])

    const updateRow = (index, patch) => {
        setDraft((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    }

    const addTag = () => {
        const tag = newTag.trim()
        if (!TAG_RE.test(tag)) {
            setError('El tag debe empezar con una letra y usar solo letras y números.')
            return
        }
        if (draft.some((row) => row.tag === tag)) {
            setError(`El tag ${tag} ya está en el encabezado.`)
            return
        }
        setDraft((rows) => [...rows, { tag, value: '' }])
        setNewTag('')
        setError(null)
    }

    const save = async () => {
        const next = replacePgnHeaders(sourcePgn, draft)
        if (!next.trim()) {
            setError('El encabezado necesita al menos un tag válido.')
            return
        }
        setBusy(true)
        setError(null)
        try {
            await onSave(next)
            onClose()
        } catch (err) {
            setError(err?.message || 'No se pudo guardar el encabezado.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>Encabezado del PGN</DialogTitle>
            <DialogContent>
                {editable ? (
                    <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            Editá los tags. Al guardar se actualiza el PGN de esta partida y se
                            conservan las jugadas.
                        </Typography>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Campo</TableCell>
                                    <TableCell>Valor</TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {draft.map((row, index) => (
                                    <TableRow key={`${row.tag}-${index}`}>
                                        <TableCell sx={{ width: '34%' }}>
                                            <Typography variant="body2">
                                                {PGN_HEADER_LABELS[row.tag] || row.tag}
                                            </Typography>
                                            <Typography variant="caption" component="div" color="text.secondary">
                                                {row.tag}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                size="small"
                                                fullWidth
                                                value={row.value}
                                                onChange={(event) =>
                                                    updateRow(index, { value: event.target.value })
                                                }
                                                inputProps={{ 'aria-label': row.tag }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ width: 48 }}>
                                            <IconButton
                                                size="small"
                                                aria-label={`Quitar ${row.tag}`}
                                                onClick={() =>
                                                    setDraft((rows) => rows.filter((_, i) => i !== index))
                                                }
                                            >
                                                <DeleteOutline fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <TextField
                                size="small"
                                label="Nuevo tag"
                                placeholder="WhiteElo"
                                value={newTag}
                                onChange={(event) => setNewTag(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault()
                                        addTag()
                                    }
                                }}
                            />
                            <Button onClick={addTag}>Agregar</Button>
                        </Box>
                    </>
                ) : draft.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Este PGN no tiene etiquetas de encabezado.
                    </Typography>
                ) : (
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Campo</TableCell>
                                <TableCell>Tag</TableCell>
                                <TableCell>Valor</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {draft.map((row, index) => (
                                <TableRow key={`${row.tag}-${index}`}>
                                    <TableCell>{PGN_HEADER_LABELS[row.tag] || row.tag}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" component="code">
                                            {row.tag}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {String(row.value ?? '').trim() ? row.value : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {error && (
                    <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
                        {error}
                    </Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={busy}>
                    {editable ? 'Cancelar' : 'Cerrar'}
                </Button>
                {editable && (
                    <Button variant="contained" onClick={save} disabled={busy}>
                        {busy ? 'Guardando…' : 'Guardar encabezado'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    )
}
