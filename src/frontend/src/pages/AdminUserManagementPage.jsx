/**
 * LOG-FEAT-04: gestión de usuarios y roles (admin | user). Solo accesible con rol admin.
 */
import { useCallback, useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    FormControlLabel,
} from '@mui/material'
import { Add as AddIcon, ManageAccounts, Save as SaveIcon } from '@mui/icons-material'
import { API_BASE_URL } from '../config/api.js'
import { useAuth } from '../hooks/useAuth.js'

const COACH_ROLES = ['admin', 'user']

function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
}

function primaryRole(roles) {
    const list = roles || []
    if (list.includes('admin')) return 'admin'
    if (list.includes('user')) return 'user'
    return list[0] || 'user'
}

export default function AdminUserManagementPage() {
    const { token } = useAuth()
    const [users, setUsers] = useState([])
    const [roleCatalog, setRoleCatalog] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [draft, setDraft] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true,
    })
    const [editingId, setEditingId] = useState(null)
    const [editDraft, setEditDraft] = useState({ role: 'user', is_active: true })

    const load = useCallback(async () => {
        if (!token) return
        try {
            setLoading(true)
            const [usersRes, rolesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders(token) }),
                fetch(`${API_BASE_URL}/api/auth/admin/account-roles`, {
                    headers: authHeaders(token),
                }),
            ])
            if (!usersRes.ok || !rolesRes.ok) {
                const detail = !usersRes.ok ? await usersRes.text() : await rolesRes.text()
                throw new Error(detail || 'No autorizado o error de servidor')
            }
            setUsers(await usersRes.json())
            const rolesPayload = await rolesRes.json()
            setRoleCatalog(rolesPayload.roles || [])
            setError(null)
        } catch (err) {
            setError(err.message || 'Error al cargar usuarios')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        load()
    }, [load])

    const saveRole = async (userId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}/roles`, {
                method: 'PUT',
                headers: authHeaders(token),
                body: JSON.stringify({ roles: [editDraft.role] }),
            })
            if (!res.ok) throw new Error(await res.text())
            const updated = await res.json()
            setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
            setEditingId(null)
        } catch (err) {
            setError(err.message || 'Error al guardar rol')
        }
    }

    const toggleActive = async (user) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${user.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ is_active: !user.is_active }),
            })
            if (!res.ok) throw new Error(await res.text())
            const updated = await res.json()
            setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)))
        } catch (err) {
            setError(err.message || 'Error al actualizar usuario')
        }
    }

    const createUser = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    username: draft.username,
                    email: draft.email,
                    password: draft.password,
                    roles: [draft.role],
                    is_active: draft.is_active,
                }),
            })
            if (!res.ok) throw new Error(await res.text())
            const created = await res.json()
            setUsers((prev) => [...prev, created])
            setCreateOpen(false)
            setDraft({
                username: '',
                email: '',
                password: '',
                role: 'user',
                is_active: true,
            })
        } catch (err) {
            setError(err.message || 'Error al crear usuario')
        }
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography>Cargando usuarios…</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ManageAccounts />
                Usuarios y roles
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Roles disponibles: {COACH_ROLES.join(', ')}. Solo administradores pueden acceder a este módulo.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {roleCatalog.length > 0 && (
                <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                    {roleCatalog.map((r) => (
                        <Typography key={r.name} variant="body2">
                            <strong>{r.name}</strong> — {r.description}
                        </Typography>
                    ))}
                </Paper>
            )}

            <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ mb: 2 }}
                onClick={() => setCreateOpen(true)}
            >
                Crear usuario
            </Button>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell>Activo</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.username}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    {editingId === user.id ? (
                                        <FormControl size="small" sx={{ minWidth: 120 }}>
                                            <InputLabel id={`role-${user.id}`}>Rol</InputLabel>
                                            <Select
                                                labelId={`role-${user.id}`}
                                                label="Rol"
                                                value={editDraft.role}
                                                onChange={(e) =>
                                                    setEditDraft((d) => ({ ...d, role: e.target.value }))
                                                }
                                            >
                                                {COACH_ROLES.map((r) => (
                                                    <MenuItem key={r} value={r}>
                                                        {r}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    ) : (
                                        primaryRole(user.roles)
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={Boolean(user.is_active)}
                                        onChange={() => toggleActive(user)}
                                        inputProps={{ 'aria-label': 'activo' }}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    {editingId === user.id ? (
                                        <Button
                                            size="small"
                                            variant="contained"
                                            startIcon={<SaveIcon />}
                                            onClick={() => saveRole(user.id)}
                                        >
                                            Guardar
                                        </Button>
                                    ) : (
                                        <Button
                                            size="small"
                                            onClick={() => {
                                                setEditingId(user.id)
                                                setEditDraft({
                                                    role: primaryRole(user.roles),
                                                    is_active: user.is_active,
                                                })
                                            }}
                                        >
                                            Cambiar rol
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay usuarios en la base de datos. Creá uno o usá login legacy (admin).
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Nuevo usuario</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <TextField
                        label="Usuario"
                        required
                        value={draft.username}
                        onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
                    />
                    <TextField
                        label="Email"
                        type="email"
                        required
                        value={draft.email}
                        onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                    />
                    <TextField
                        label="Contraseña"
                        type="password"
                        required
                        value={draft.password}
                        onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))}
                        helperText="Mínimo 8 caracteres"
                    />
                    <FormControl fullWidth>
                        <InputLabel id="create-role">Rol</InputLabel>
                        <Select
                            labelId="create-role"
                            label="Rol"
                            value={draft.role}
                            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                        >
                            {COACH_ROLES.map((r) => (
                                <MenuItem key={r} value={r}>
                                    {r}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={draft.is_active}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, is_active: e.target.checked }))
                                }
                            />
                        }
                        label="Usuario activo"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={createUser}
                        disabled={
                            !draft.username || !draft.email || (draft.password?.length || 0) < 8
                        }
                    >
                        Crear
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}
