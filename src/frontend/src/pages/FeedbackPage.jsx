/**
 * LOG-FEAT-10: report a bug or a suggestion. The API opens a GitHub issue.
 */
import { useState } from 'react'
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from '@mui/material'
import { API_BASE_URL } from '../config/api.js'
import { useAuth } from '../hooks/useAuth.js'

export default function FeedbackPage() {
    const { token } = useAuth()
    const [kind, setKind] = useState('bug')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState(null)
    const [created, setCreated] = useState(null)

    const submit = async (event) => {
        event.preventDefault()
        setError(null)
        setCreated(null)
        setSending(true)
        try {
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ kind, title, description }),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.detail || 'No se pudo registrar el reporte')
            }
            setCreated(body)
            setTitle('')
            setDescription('')
        } catch (err) {
            setError(err.message || 'No se pudo registrar el reporte')
        } finally {
            setSending(false)
        }
    }

    return (
        <Box component="form" onSubmit={submit} sx={{ maxWidth: 720 }}>
            <Typography variant="h4" gutterBottom>
                Comentarios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Contanos un fallo o una idea de mejora. Se guarda como issue en el repositorio.
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {created && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Quedó registrado
                    {created.url ? (
                        <>
                            {' '}
                            en{' '}
                            <a href={created.url} target="_blank" rel="noreferrer">
                                el issue #{created.number}
                            </a>
                        </>
                    ) : null}
                    .
                </Alert>
            )}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel id="feedback-kind-label">Tipo</InputLabel>
                <Select
                    labelId="feedback-kind-label"
                    label="Tipo"
                    value={kind}
                    onChange={(event) => setKind(event.target.value)}
                >
                    <MenuItem value="bug">Bug</MenuItem>
                    <MenuItem value="suggestion">Sugerencia de mejora</MenuItem>
                </Select>
            </FormControl>
            <TextField
                fullWidth
                size="small"
                label="Título"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                sx={{ mb: 2 }}
                required
            />
            <TextField
                fullWidth
                multiline
                minRows={5}
                label="Descripción"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                sx={{ mb: 2 }}
                required
            />
            <Button type="submit" variant="contained" disabled={sending}>
                Enviar
            </Button>
        </Box>
    )
}
