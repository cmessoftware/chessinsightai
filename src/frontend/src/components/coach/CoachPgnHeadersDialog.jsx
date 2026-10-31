import React, { useMemo } from 'react'
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { listPgnHeaderRows } from '../../utils/pgnHeaders.js'

function displayHeaderValue(value) {
    const text = String(value ?? '')
    return text.trim() ? text : '—'
}

export default function CoachPgnHeadersDialog({ open, onClose, sourcePgn }) {
    const rows = useMemo(() => listPgnHeaderRows(sourcePgn), [sourcePgn])

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Encabezado del PGN</DialogTitle>
            <DialogContent>
                {rows.length === 0 ? (
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
                            {rows.map((row, index) => (
                                <TableRow key={`${row.tag}-${index}`}>
                                    <TableCell>{row.label}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" component="code">
                                            {row.tag}
                                        </Typography>
                                    </TableCell>
                                    <TableCell sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {displayHeaderValue(row.value)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    )
}
