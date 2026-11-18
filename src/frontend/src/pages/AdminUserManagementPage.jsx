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

function GroupSelect({ labelId, value, onChange, groups, fullWidth = false }) {
    return (
        <FormControl size="small" fullWidth={fullWidth} sx={{ minWidth: 140 }}>
            <InputLabel id={labelId}>Grupo</InputLabel>
            <Select labelId={labelId} label="Grupo" value={value} onChange={onChange}>
                <MenuItem value="">Sin grupo</MenuItem>
                {groups.map((group) => (
                    <MenuItem key={group.id} value={String(group.id)}>
                        {group.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    )
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
    const [groups, setGroups] = useState([])
    const [roleCatalog, setRoleCatalog] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [draft, setDraft] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        groupId: '',
        is_active: true,
    })
    const [editingId, setEditingId] = useState(null)
    const [editDraft, setEditDraft] = useState({ role: 'user', groupId: '', is_active: true })
    const [passwordTarget, setPasswordTarget] = useState(null)
    const [passwordDraft, setPasswordDraft] = useState({ password: '', confirm: '' })
    const [notice, setNotice] = useState(null)
    const [invitations, setInvitations] = useState([])
    const [inviteDraft, setInviteDraft] = useState({ email: '', groupId: '' })
    const [inviteLink, setInviteLink] = useState('')

    const load = useCallback(async () => {
        if (!token) return
        try {
            setLoading(true)
            const [usersRes, rolesRes, groupsRes, invitationsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders(token) }),
                fetch(`${API_BASE_URL}/api/auth/admin/account-roles`, {
                    headers: authHeaders(token),
                }),
                fetch(`${API_BASE_URL}/api/auth/groups`, { headers: authHeaders(token) }),
                fetch(`${API_BASE_URL}/api/auth/invitations`, { headers: authHeaders(token) }),
            ])
            if (!usersRes.ok || !rolesRes.ok || !groupsRes.ok || !invitationsRes.ok) {
                const failed = [usersRes, rolesRes, groupsRes, invitationsRes].find((res) => !res.ok)
                const detail = failed ? await failed.text() : ''
                throw new Error(detail || 'No autorizado o error de servidor')
            }
            setUsers(await usersRes.json())
            setGroups(await groupsRes.json())
            setInvitations(await invitationsRes.json())
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
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${userId}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({
                    roles: [editDraft.role],
                    ...(editDraft.groupId
                        ? { group_id: Number(editDraft.groupId) }
                        : { clear_group: true }),
                }),
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

    const closePasswordDialog = () => {
        setPasswordTarget(null)
        setPasswordDraft({ password: '', confirm: '' })
    }

    const savePassword = async () => {
        if (!passwordTarget) return
        if ((passwordDraft.password || '').length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres')
            return
        }
        if (passwordDraft.password !== passwordDraft.confirm) {
            setError('Las contraseñas no coinciden')
            return
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/users/${passwordTarget.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ password: passwordDraft.password }),
            })
            if (!res.ok) throw new Error(await res.text())
            setNotice(`Contraseña de ${passwordTarget.username} actualizada.`)
            setError(null)
            closePasswordDialog()
        } catch (err) {
            setError(err.message || 'Error al cambiar la contraseña')
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
                    ...(draft.groupId ? { group_id: Number(draft.groupId) } : {}),
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
                groupId: '',
                is_active: true,
            })
        } catch (err) {
            setError(err.message || 'Error al crear usuario')
        }
    }

    const invitePerson = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/invitations`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({
                    email: inviteDraft.email,
                    ...(inviteDraft.groupId ? { group_id: Number(inviteDraft.groupId) } : {}),
                }),
            })
            if (!res.ok) throw new Error(await res.text())
            const created = await res.json()
            const link = `${window.location.origin}/invite/${created.token}`
            setInviteLink(link)
            setInviteDraft({ email: '', groupId: '' })
            setInvitations((prev) => [created, ...prev.filter((item) => item.email !== created.email)])
            setNotice(`Invitación lista para ${created.email}. Copiá el enlace y envialo.`)
            setError(null)
        } catch (err) {
            setError(err.message || 'Error al invitar')
        }
    }

    const revokeInvitation = async (invitation) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/invitations/${invitation.id}`, {
                method: 'DELETE',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(await res.text())
            setInvitations((prev) => prev.filter((item) => item.id !== invitation.id))
        } catch (err) {
            setError(err.message || 'Error al anular la invitación')
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
            {notice && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
                    {notice}
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

            <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
                <Typography variant="h6">Invitar</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Pedí el email. La persona abre el enlace y elige su usuario y contraseña. Sin invitación no entra.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        label="Email"
                        value={inviteDraft.email}
                        onChange={(event) => setInviteDraft((prev) => ({ ...prev, email: event.target.value }))}
                    />
                    <GroupSelect
                        labelId="invite-group"
                        value={inviteDraft.groupId}
                        groups={groups}
                        onChange={(event) => setInviteDraft((prev) => ({ ...prev, groupId: event.target.value }))}
                    />
                    <Button variant="contained" onClick={invitePerson} disabled={!inviteDraft.email.trim()}>
                        Invitar
                    </Button>
                </Box>
                {inviteLink ? (
                    <Typography variant="body2" sx={{ mt: 2 }}>
                        Enlace: {inviteLink}
                    </Typography>
                ) : null}
                {invitations.length > 0 ? (
                    <Table size="small" sx={{ mt: 2 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell>Email</TableCell>
                                <TableCell>Grupo</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invitations.map((invitation) => (
                                <TableRow key={invitation.id}>
                                    <TableCell>{invitation.email}</TableCell>
                                    <TableCell>{invitation.group_name || 'Sin grupo'}</TableCell>
                                    <TableCell align="right">
                                        <Button size="small" onClick={() => revokeInvitation(invitation)}>
                                            Anular
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : null}
            </Paper>

            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell>Grupo</TableCell>
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
                                    {editingId === user.id ? (
                                        <GroupSelect
                                            labelId={`group-${user.id}`}
                                            value={editDraft.groupId}
                                            groups={groups}
                                            onChange={(e) =>
                                                setEditDraft((d) => ({ ...d, groupId: e.target.value }))
                                            }
                                        />
                                    ) : (
                                        user.group_name || 'Sin grupo'
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
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setEditingId(user.id)
                                                    setEditDraft({
                                                        role: primaryRole(user.roles),
                                                        groupId: user.group_id ? String(user.group_id) : '',
                                                        is_active: user.is_active,
                                                    })
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setPasswordDraft({ password: '', confirm: '' })
                                                    setPasswordTarget(user)
                                                }}
                                            >
                                                Cambiar contraseña
                                            </Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay usuarios en la base de datos. Creá uno o usá login legacy (admin).
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={Boolean(passwordTarget)} onClose={closePasswordDialog} fullWidth maxWidth="sm">
                <DialogTitle>Cambiar contraseña</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        Usuario: {passwordTarget?.username}. Solo un administrador puede cambiarla.
                    </Typography>
                    <TextField
                        label="Nueva contraseña"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={passwordDraft.password}
                        onChange={(e) =>
                            setPasswordDraft((d) => ({ ...d, password: e.target.value }))
                        }
                        helperText="Mínimo 8 caracteres"
                    />
                    <TextField
                        label="Repetir contraseña"
                        type="password"
                        required
                        autoComplete="new-password"
                        value={passwordDraft.confirm}
                        onChange={(e) =>
                            setPasswordDraft((d) => ({ ...d, confirm: e.target.value }))
                        }
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closePasswordDialog}>Cancelar</Button>
                    <Button
                        variant="contained"
                        onClick={savePassword}
                        disabled={
                            (passwordDraft.password?.length || 0) < 8
                            || passwordDraft.password !== passwordDraft.confirm
                        }
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

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
                    <GroupSelect
                        labelId="create-group"
                        fullWidth
                        value={draft.groupId}
                        groups={groups}
                        onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value }))}
                    />
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
