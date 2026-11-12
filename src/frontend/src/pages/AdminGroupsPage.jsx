/**
 * LOG-FEAT-06: ABM de grupos, miembros en dos paneles y roles del grupo. Solo admin.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Paper,
    TextField,
    Typography,
} from '@mui/material'
import { GroupsOutlined } from '@mui/icons-material'
import { API_BASE_URL } from '../config/api.js'
import { useAuth } from '../hooks/useAuth.js'

const GROUP_ROLES = ['admin', 'user']

function authHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
}

export default function AdminGroupsPage() {
    const { token } = useAuth()
    const [groups, setGroups] = useState([])
    const [users, setUsers] = useState([])
    const [selectedId, setSelectedId] = useState(null)
    const [nameDraft, setNameDraft] = useState('')
    const [newName, setNewName] = useState('')
    const [roleDraft, setRoleDraft] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [notice, setNotice] = useState(null)

    const load = useCallback(async () => {
        if (!token) return
        try {
            setLoading(true)
            const [groupsRes, usersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/groups`, { headers: authHeaders(token) }),
                fetch(`${API_BASE_URL}/api/auth/users`, { headers: authHeaders(token) }),
            ])
            if (!groupsRes.ok || !usersRes.ok) {
                const detail = !groupsRes.ok ? await groupsRes.text() : await usersRes.text()
                throw new Error(detail || 'No se pudieron leer los grupos')
            }
            const nextGroups = await groupsRes.json()
            setGroups(nextGroups)
            setUsers(await usersRes.json())
            setError(null)
            setSelectedId((current) => {
                if (nextGroups.some((group) => group.id === current)) return current
                return nextGroups[0]?.id ?? null
            })
        } catch (err) {
            setError(err.message || 'No se pudieron leer los grupos')
        } finally {
            setLoading(false)
        }
    }, [token])

    useEffect(() => {
        load()
    }, [load])

    const selected = groups.find((group) => group.id === selectedId) || null

    useEffect(() => {
        setNameDraft(selected?.name || '')
        setRoleDraft(selected?.roles || [])
    }, [selected])

    const memberIds = useMemo(
        () => new Set((selected?.members || []).map((member) => member.id)),
        [selected],
    )
    const outside = users.filter((user) => !memberIds.has(user.id))

    const createGroup = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/groups`, {
                method: 'POST',
                headers: authHeaders(token),
                body: JSON.stringify({ name: newName }),
            })
            if (!res.ok) throw new Error(await res.text())
            const created = await res.json()
            setNewName('')
            setNotice(`Grupo ${created.name} creado.`)
            await load()
            setSelectedId(created.id)
        } catch (err) {
            setError(err.message || 'No se pudo crear el grupo')
        }
    }

    const saveName = async () => {
        if (!selected) return
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/groups/${selected.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ name: nameDraft }),
            })
            if (!res.ok) throw new Error(await res.text())
            setNotice('Nombre actualizado.')
            await load()
        } catch (err) {
            setError(err.message || 'No se pudo renombrar el grupo')
        }
    }

    const saveRoles = async () => {
        if (!selected) return
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/groups/${selected.id}`, {
                method: 'PATCH',
                headers: authHeaders(token),
                body: JSON.stringify({ roles: roleDraft }),
            })
            if (!res.ok) throw new Error(await res.text())
            setNotice('Roles del grupo actualizados.')
            await load()
        } catch (err) {
            setError(err.message || 'No se pudieron guardar los roles')
        }
    }

    const removeGroup = async () => {
        if (!selected) return
        if (!window.confirm(`¿Eliminar el grupo ${selected.name}?`)) return
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/groups/${selected.id}`, {
                method: 'DELETE',
                headers: authHeaders(token),
            })
            if (!res.ok) throw new Error(await res.text())
            setNotice(`Grupo ${selected.name} eliminado.`)
            setSelectedId(null)
            await load()
        } catch (err) {
            setError(err.message || 'No se pudo eliminar el grupo')
        }
    }

    const moveUser = async (userId, intoGroup) => {
        if (!selected) return
        const current = (selected.members || []).map((member) => member.id)
        const userIds = intoGroup
            ? [...current, userId]
            : current.filter((id) => id !== userId)
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/groups/${selected.id}/members`, {
                method: 'PUT',
                headers: authHeaders(token),
                body: JSON.stringify({ user_ids: userIds }),
            })
            if (!res.ok) throw new Error(await res.text())
            await load()
        } catch (err) {
            setError(err.message || 'No se pudo actualizar el grupo')
        }
    }

    const toggleRole = (role) => {
        setRoleDraft((current) =>
            current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
        )
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
                <Typography>Cargando grupos…</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsOutlined />
                Grupos
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Un usuario pertenece a un solo grupo. Al agregarlo acá sale del grupo anterior. Los roles del grupo no cambian el rol de la cuenta.
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

            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <TextField
                    size="small"
                    label="Nuevo grupo"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                />
                <Button variant="contained" onClick={createGroup} disabled={!newName.trim()}>
                    Crear
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Paper variant="outlined" sx={{ width: 240, maxWidth: '100%' }}>
                    <List dense>
                        {groups.map((group) => (
                            <ListItemButton
                                key={group.id}
                                selected={group.id === selectedId}
                                onClick={() => setSelectedId(group.id)}
                            >
                                <ListItemText
                                    primary={group.name}
                                    secondary={`${group.members.length} usuarios`}
                                />
                            </ListItemButton>
                        ))}
                        {groups.length === 0 && (
                            <ListItem>
                                <ListItemText primary="No hay grupos." />
                            </ListItem>
                        )}
                    </List>
                </Paper>

                {selected && (
                    <Box sx={{ flex: 1, minWidth: 280 }}>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                            <TextField
                                size="small"
                                label="Nombre"
                                value={nameDraft}
                                onChange={(event) => setNameDraft(event.target.value)}
                            />
                            <Button variant="outlined" onClick={saveName} disabled={!nameDraft.trim()}>
                                Guardar nombre
                            </Button>
                            <Button color="error" onClick={removeGroup}>
                                Eliminar
                            </Button>
                        </Box>

                        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Roles del grupo
                            </Typography>
                            <FormGroup row>
                                {GROUP_ROLES.map((role) => (
                                    <FormControlLabel
                                        key={role}
                                        control={
                                            <Checkbox
                                                checked={roleDraft.includes(role)}
                                                onChange={() => toggleRole(role)}
                                            />
                                        }
                                        label={role}
                                    />
                                ))}
                            </FormGroup>
                            <Button size="small" variant="contained" onClick={saveRoles}>
                                Guardar roles
                            </Button>
                        </Paper>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Paper variant="outlined" sx={{ flex: 1, minWidth: 240, p: 1 }}>
                                <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>
                                    Usuarios
                                </Typography>
                                <List dense>
                                    {outside.map((user) => (
                                        <ListItem
                                            key={user.id}
                                            secondaryAction={
                                                <Button size="small" onClick={() => moveUser(user.id, true)}>
                                                    Agregar
                                                </Button>
                                            }
                                        >
                                            <ListItemText
                                                primary={user.username}
                                                secondary={
                                                    user.group_name
                                                        ? `En ${user.group_name}`
                                                        : 'Sin grupo'
                                                }
                                            />
                                        </ListItem>
                                    ))}
                                    {outside.length === 0 && (
                                        <ListItem>
                                            <ListItemText primary="Todos los usuarios están en este grupo." />
                                        </ListItem>
                                    )}
                                </List>
                            </Paper>
                            <Paper variant="outlined" sx={{ flex: 1, minWidth: 240, p: 1 }}>
                                <Typography variant="subtitle2" sx={{ px: 1, py: 0.5 }}>
                                    {selected.name}
                                </Typography>
                                <List dense>
                                    {(selected.members || []).map((member) => (
                                        <ListItem
                                            key={member.id}
                                            secondaryAction={
                                                <Button size="small" onClick={() => moveUser(member.id, false)}>
                                                    Quitar
                                                </Button>
                                            }
                                        >
                                            <ListItemText primary={member.username} secondary={member.email} />
                                        </ListItem>
                                    ))}
                                    {(selected.members || []).length === 0 && (
                                        <ListItem>
                                            <ListItemText primary="Este grupo no tiene usuarios." />
                                        </ListItem>
                                    )}
                                </List>
                            </Paper>
                        </Box>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
