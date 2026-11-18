/**
 * LOG-FEAT-13: the invited person chooses a username and password.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
import { API_BASE_URL } from '../config/api.js'

export default function InviteAcceptPage() {
    const { token } = useParams()
    const navigate = useNavigate()
    const [preview, setPreview] = useState(null)
    const [error, setError] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')

    useEffect(() => {
        let active = true
        fetch(`${API_BASE_URL}/api/auth/invitations/token/${token}`)
            .then(async (res) => {
                if (!res.ok) throw new Error(await res.text())
                return res.json()
            })
            .then((data) => {
                if (active) setPreview(data)
            })
            .catch((err) => {
                if (active) setError(err.message || 'La invitación no está disponible.')
            })
        return () => {
            active = false
        }
    }, [token])

    const accept = async () => {
        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres')
            return
        }
        if (password !== confirm) {
            setError('Las contraseñas no coinciden')
            return
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/invitations/token/${token}/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            })
            if (!res.ok) throw new Error(await res.text())
            navigate('/login')
        } catch (err) {
            setError(err.message || 'No se pudo crear la cuenta')
        }
    }

    return (
        <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Aceptar invitación
                </Typography>
                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : null}
                {preview ? (
                    <>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Email: {preview.email}
                            {preview.group_name ? `. Grupo: ${preview.group_name}` : ''}
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            label="Usuario"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label="Contraseña"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <TextField
                            fullWidth
                            size="small"
                            type="password"
                            label="Repetir contraseña"
                            value={confirm}
                            onChange={(event) => setConfirm(event.target.value)}
                            sx={{ mb: 2 }}
                        />
                        <Button variant="contained" onClick={accept} disabled={!username.trim()}>
                            Crear cuenta
                        </Button>
                    </>
                ) : (
                    !error && <Typography>Cargando la invitación…</Typography>
                )}
            </Paper>
        </Box>
    )
}
