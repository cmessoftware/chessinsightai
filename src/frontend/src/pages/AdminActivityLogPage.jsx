/**
 * LOG-FEAT-09: activity log. Admin only.
 * Filters: user, date range, event.
 */
import { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from '@mui/material'
import { API_BASE_URL } from '../config/api.js'
import { useAuth } from '../hooks/useAuth.js'

function authHeaders(token) {
    return { Authorization: `Bearer ${token}` }
}

function formatWhen(value) {
    if (!value) return ''
    const date = new Date(value.endsWith('Z') ? value : `${value}Z`)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date)
}

export default function AdminActivityLogPage() {
    const { token } = useAuth()
    const [users, setUsers] = useState([])
    const [events, setEvents] = useState([])
    const [items, setItems] = useState([])
    const [filters, setFilters] = useState({
        username: '',
        event: '',
        dateFrom: '',
        dateTo: '',
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadCatalog = useCallback(async () => {
        if (!token) return
        const [usersRes, eventsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders(token) }),
            fetch(`${API_BASE_URL}/api/auth/activity/events`, { headers: authHeaders(token) }),
        ])
        if (!usersRes.ok || !eventsRes.ok) {
            throw new Error('No se pudo cargar el catálogo del log')
        }
        const usersBody = await usersRes.json()
        const eventsBody = await eventsRes.json()
        setUsers(Array.isArray(usersBody) ? usersBody : [])
        setEvents(Array.isArray(eventsBody.events) ? eventsBody.events : [])
    }, [token])

    const loadActivity = useCallback(
        async (nextFilters) => {
            if (!token) return
            const params = new URLSearchParams()
            if (nextFilters.username) params.set('username', nextFilters.username)
            if (nextFilters.event) params.set('event', nextFilters.event)
            if (nextFilters.dateFrom) params.set('date_from', nextFilters.dateFrom)
            if (nextFilters.dateTo) params.set('date_to', nextFilters.dateTo)
            const query = params.toString()
            const response = await fetch(
                `${API_BASE_URL}/api/auth/activity${query ? `?${query}` : ''}`,
                { headers: authHeaders(token) },
            )
            if (!response.ok) {
                throw new Error('No se pudo leer el log de actividad')
            }
            const body = await response.json()
            setItems(Array.isArray(body.items) ? body.items : [])
        },
        [token],
    )

    useEffect(() => {
        if (!token) return
        let cancelled = false
        ;(async () => {
            try {
                setLoading(true)
                setError(null)
                await loadCatalog()
                if (!cancelled) await loadActivity(filters)
            } catch (err) {
                if (!cancelled) setError(err.message || 'Error al cargar la actividad')
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
        // First paint uses the empty filters. Later reads go through applyFilters.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, loadCatalog, loadActivity])

    const applyFilters = async () => {
        try {
            setLoading(true)
            setError(null)
            await loadActivity(filters)
        } catch (err) {
            setError(err.message || 'Error al filtrar la actividad')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Actividad de usuarios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Login, cierre de sesión, importación de partidas, solicitud de estadísticas y análisis profundo.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel id="activity-user-label">Usuario</InputLabel>
                    <Select
                        labelId="activity-user-label"
                        label="Usuario"
                        value={filters.username}
                        onChange={(event) =>
                            setFilters((prev) => ({ ...prev, username: event.target.value }))
                        }
                    >
                        <MenuItem value="">Todos</MenuItem>
                        {users.map((user) => (
                            <MenuItem key={user.id} value={user.username}>
                                {user.username}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel id="activity-event-label">Evento</InputLabel>
                    <Select
                        labelId="activity-event-label"
                        label="Evento"
                        value={filters.event}
                        onChange={(event) =>
                            setFilters((prev) => ({ ...prev, event: event.target.value }))
                        }
                    >
                        <MenuItem value="">Todos</MenuItem>
                        {events.map((item) => (
                            <MenuItem key={item.code} value={item.code}>
                                {item.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField
                    size="small"
                    label="Desde"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(event) =>
                        setFilters((prev) => ({ ...prev, dateFrom: event.target.value }))
                    }
                    InputLabelProps={{ shrink: true }}
                />
                <TextField
                    size="small"
                    label="Hasta"
                    type="date"
                    value={filters.dateTo}
                    onChange={(event) =>
                        setFilters((prev) => ({ ...prev, dateTo: event.target.value }))
                    }
                    InputLabelProps={{ shrink: true }}
                />
                <Button variant="contained" onClick={applyFilters} disabled={loading}>
                    Filtrar
                </Button>
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Evento</TableCell>
                            <TableCell>Fecha y hora</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && items.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3}>No hay eventos para ese filtro.</TableCell>
                            </TableRow>
                        )}
                        {items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>{item.username}</TableCell>
                                <TableCell>{item.event_label || item.event}</TableCell>
                                <TableCell>{formatWhen(item.occurred_at)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}
