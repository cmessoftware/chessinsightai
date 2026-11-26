/**
 * LOG-FEAT-10 + FEAT-120/129 + FEAT-123: reportes y hilo de comentarios.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import CloseIcon from '@mui/icons-material/Close'
import { API_BASE_URL } from '../config/api.js'
import { useAuth } from '../hooks/useAuth.js'

const MAX_FILES = 5
const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const THREAD_POLL_MS = 60_000

function formatApiDetail(detail) {
    if (!detail) return ''
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
        return detail
            .map((item) => (typeof item === 'string' ? item : item?.msg || JSON.stringify(item)))
            .join(' ')
    }
    return String(detail)
}

function formatWhen(iso) {
    if (!iso) return ''
    try {
        return new Date(iso).toLocaleString()
    } catch {
        return iso
    }
}

function validateImageFile(file) {
    if (!file) return 'Archivo inválido.'
    if (!ACCEPT.split(',').includes(file.type)) {
        return 'Formato no admitido (JPEG, PNG, WebP o GIF).'
    }
    if (file.size > MAX_BYTES) {
        return 'La imagen supera 5 MB.'
    }
    return null
}

function useAttachmentField(maxCount) {
    const fileInputRef = useRef(null)
    const [attachments, setAttachments] = useState([])

    useEffect(() => {
        return () => {
            attachments.forEach((a) => {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
            })
        }
    }, [attachments])

    const clearAttachments = () => {
        setAttachments((prev) => {
            prev.forEach((a) => {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
            })
            return []
        })
    }

    const removeAttachment = (key) => {
        setAttachments((prev) => {
            const item = prev.find((a) => a.key === key)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter((a) => a.key !== key)
        })
    }

    const onPickFiles = (event, setError) => {
        const list = Array.from(event.target.files || [])
        event.target.value = ''
        if (!list.length) return
        setError?.(null)
        const room = maxCount - attachments.length
        if (room <= 0) {
            setError?.(`Máximo ${maxCount} imágenes.`)
            return
        }
        const next = []
        for (const file of list.slice(0, room)) {
            const err = validateImageFile(file)
            if (err) {
                setError?.(err)
                continue
            }
            next.push({
                key: `${file.name}-${file.size}-${file.lastModified}`,
                file,
                name: file.name,
                previewUrl: URL.createObjectURL(file),
            })
        }
        if (next.length) {
            setAttachments((prev) => [...prev, ...next])
        }
    }

    const appendToFormData = (form) => {
        for (const item of attachments) {
            form.append('files', item.file, item.name)
        }
    }

    return {
        fileInputRef,
        attachments,
        clearAttachments,
        removeAttachment,
        onPickFiles,
        appendToFormData,
    }
}

function CommentBlock({ author, createdAt, body }) {
    return (
        <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.5 }} flexWrap="wrap">
                <Typography variant="subtitle2">{author}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatWhen(createdAt)}
                </Typography>
            </Stack>
            <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                {body}
            </Typography>
        </Box>
    )
}

export default function FeedbackPage() {
    const { token } = useAuth()
    const [pageTab, setPageTab] = useState('new') // 'new' | 'history'
    const [kind, setKind] = useState('bug')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const newReport = useAttachmentField(MAX_FILES)
    const replyField = useAttachmentField(MAX_FILES)

    const [sending, setSending] = useState(false)
    const [error, setError] = useState(null)
    const [created, setCreated] = useState(null)
    const [sentAttachments, setSentAttachments] = useState([])
    const [attachmentWarnings, setAttachmentWarnings] = useState([])
    const [lightboxSrc, setLightboxSrc] = useState(null)

    const [issues, setIssues] = useState([])
    const [issuesLoading, setIssuesLoading] = useState(false)
    const [issuesError, setIssuesError] = useState(null)
    const [selectedNumber, setSelectedNumber] = useState(null)
    const [thread, setThread] = useState(null)
    const [threadLoading, setThreadLoading] = useState(false)
    const [threadError, setThreadError] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [replySending, setReplySending] = useState(false)

    const authHeaders = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token])

    const loadIssues = useCallback(async () => {
        setIssuesLoading(true)
        setIssuesError(null)
        try {
            const response = await fetch(`${API_BASE_URL}/api/feedback/issues`, {
                headers: authHeaders(),
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(formatApiDetail(body.detail) || 'No se pudieron cargar tus reportes')
            }
            setIssues(body.items || [])
        } catch (err) {
            setIssuesError(err.message || 'No se pudieron cargar tus reportes')
        } finally {
            setIssuesLoading(false)
        }
    }, [authHeaders])

    const loadThread = useCallback(
        async (number) => {
            if (number == null) return
            setThreadLoading(true)
            setThreadError(null)
            try {
                const response = await fetch(`${API_BASE_URL}/api/feedback/issues/${number}`, {
                    headers: authHeaders(),
                })
                const body = await response.json().catch(() => ({}))
                if (!response.ok) {
                    throw new Error(formatApiDetail(body.detail) || 'No se pudo cargar el reporte')
                }
                setThread(body)
            } catch (err) {
                setThreadError(err.message || 'No se pudo cargar el reporte')
            } finally {
                setThreadLoading(false)
            }
        },
        [authHeaders],
    )

    const showConfirmation = Boolean(created)

    useEffect(() => {
        if (pageTab === 'history' && !showConfirmation) {
            loadIssues()
        }
    }, [pageTab, loadIssues, showConfirmation])

    useEffect(() => {
        if (selectedNumber != null) {
            loadThread(selectedNumber)
        } else {
            setThread(null)
        }
    }, [selectedNumber, loadThread])

    useEffect(() => {
        if (selectedNumber == null) return undefined
        const id = setInterval(() => loadThread(selectedNumber), THREAD_POLL_MS)
        return () => clearInterval(id)
    }, [selectedNumber, loadThread])

    const openThread = (number) => {
        setPageTab('history')
        setSelectedNumber(number)
        setCreated(null)
        setError(null)
    }

    const submit = async (event) => {
        event.preventDefault()
        setError(null)
        setCreated(null)
        setSentAttachments([])
        setAttachmentWarnings([])
        setSending(true)
        try {
            const form = new FormData()
            form.append('kind', kind)
            form.append('title', title)
            form.append('description', description)
            newReport.appendToFormData(form)
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: authHeaders(),
                body: form,
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(formatApiDetail(body.detail) || 'No se pudo registrar el reporte')
            }
            setCreated(body)
            setSentAttachments(body.attachments || [])
            setAttachmentWarnings(body.attachment_warnings || [])
            setTitle('')
            setDescription('')
            newReport.clearAttachments()
        } catch (err) {
            setError(err.message || 'No se pudo registrar el reporte')
        } finally {
            setSending(false)
        }
    }

    const submitReply = async (event) => {
        event.preventDefault()
        if (selectedNumber == null) return
        setReplySending(true)
        setThreadError(null)
        try {
            const form = new FormData()
            form.append('text', replyText)
            replyField.appendToFormData(form)
            const response = await fetch(`${API_BASE_URL}/api/feedback/issues/${selectedNumber}/comments`, {
                method: 'POST',
                headers: authHeaders(),
                body: form,
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(formatApiDetail(body.detail) || 'No se pudo enviar el comentario')
            }
            if (body.attachment_warnings?.length) {
                setAttachmentWarnings(body.attachment_warnings)
            }
            setReplyText('')
            replyField.clearAttachments()
            await loadThread(selectedNumber)
        } catch (err) {
            setThreadError(err.message || 'No se pudo enviar el comentario')
        } finally {
            setReplySending(false)
        }
    }

    const openLightbox = useCallback((src) => setLightboxSrc(src), [])
    const closeLightbox = () => setLightboxSrc(null)

    const startAnother = () => {
        setCreated(null)
        setSentAttachments([])
        setAttachmentWarnings([])
        setError(null)
        setKind('bug')
        setPageTab('new')
        setSelectedNumber(null)
    }

    const showThread = selectedNumber != null && pageTab === 'history'

    return (
        <Box sx={{ maxWidth: 720 }}>
            <Typography variant="h4" gutterBottom>
                Comentarios
            </Typography>
            {!showConfirmation && (
                <Tabs value={pageTab} onChange={(_, v) => setPageTab(v)} sx={{ mb: 2 }}>
                    <Tab value="new" label="Nuevo reporte" />
                    <Tab value="history" label="Historial de reportes" />
                </Tabs>
            )}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            {issuesError && pageTab === 'history' && !showThread && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {issuesError}
                </Alert>
            )}
            {showConfirmation && (
                <>
                    {attachmentWarnings.length > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {attachmentWarnings.map((line) => (
                                <Typography key={line} variant="body2" component="div">
                                    {line}
                                </Typography>
                            ))}
                        </Alert>
                    )}
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Tu reporte ya fue enviado.
                        {created.number != null ? (
                            <>
                                {' '}
                                Número de reporte:{' '}
                                <Typography component="span" fontWeight="medium">
                                    #{created.number}
                                </Typography>
                                .
                            </>
                        ) : null}{' '}
                        No hace falta volver a enviar el mismo mensaje.
                    </Alert>
                    {sentAttachments.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Imágenes incluidas (clic para ampliar):
                            </Typography>
                            <Stack direction="row" flexWrap="wrap" gap={1}>
                                {sentAttachments.map((att) => (
                                    <Box
                                        key={att.id}
                                        component="button"
                                        type="button"
                                        onClick={() => openLightbox(att.url)}
                                        sx={{
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            p: 0,
                                            cursor: 'pointer',
                                            bgcolor: 'background.paper',
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={att.url}
                                            alt={att.filename}
                                            sx={{ width: 96, height: 96, objectFit: 'cover', display: 'block' }}
                                        />
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                        {created.number != null && (
                            <Button type="button" variant="contained" onClick={() => openThread(created.number)}>
                                Ver conversación
                            </Button>
                        )}
                        <Button type="button" variant="outlined" onClick={startAnother}>
                            Enviar otro comentario
                        </Button>
                    </Stack>
                </>
            )}
            {showThread && (
                <Box sx={{ mb: 2 }}>
                    <Button size="small" onClick={() => setSelectedNumber(null)} sx={{ mb: 1 }}>
                        ← Volver al listado
                    </Button>
                    {threadLoading && !thread && <Typography variant="body2">Cargando…</Typography>}
                    {threadError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {threadError}
                        </Alert>
                    )}
                    {thread && (
                        <>
                            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 1 }}>
                                <Typography variant="h6">#{thread.issue.number}</Typography>
                                <Chip
                                    size="small"
                                    label={thread.issue.state === 'closed' ? 'Cerrado' : 'Abierto'}
                                    color={thread.issue.state === 'closed' ? 'default' : 'success'}
                                />
                            </Stack>
                            <Typography variant="subtitle1" gutterBottom>
                                {thread.issue.title}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="overline" display="block" color="text.secondary">
                                Mensaje inicial
                            </Typography>
                            <CommentBlock
                                author={thread.issue.reporter || 'Reporte'}
                                createdAt={thread.issue.created_at}
                                body={thread.initial_body}
                            />
                            {thread.comments?.map((c) => (
                                <CommentBlock
                                    key={c.id}
                                    author={c.author}
                                    createdAt={c.created_at}
                                    body={c.body}
                                />
                            ))}
                            {thread.issue.state !== 'closed' && (
                                <Box component="form" onSubmit={submitReply} sx={{ mt: 2 }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        minRows={3}
                                        label="Tu respuesta"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        sx={{ mb: 2 }}
                                    />
                                    <AttachmentPicker
                                        field={replyField}
                                        disabled={replySending}
                                        sending={replySending}
                                        onLightbox={openLightbox}
                                        setError={setThreadError}
                                    />
                                    <Button type="submit" variant="contained" disabled={replySending}>
                                        {replySending ? 'Enviando…' : 'Enviar comentario'}
                                    </Button>
                                </Box>
                            )}
                            {thread.issue.state === 'closed' && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Este reporte está cerrado. No podés agregar comentarios desde aquí.
                                </Alert>
                            )}
                        </>
                    )}
                </Box>
            )}
            {!showConfirmation && pageTab === 'history' && !showThread && (
                <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Todos los reportes del equipo: podés leer y comentar en cualquiera con sesión iniciada.
                    </Typography>
                    <Button size="small" onClick={loadIssues} disabled={issuesLoading} sx={{ mb: 1 }}>
                        Actualizar
                    </Button>
                    {issuesLoading && <Typography variant="body2">Cargando…</Typography>}
                    {!issuesLoading && issues.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Todavía no hay reportes registrados.
                        </Typography>
                    )}
                    <List dense>
                        {issues.map((item) => (
                            <ListItemButton key={item.number} onClick={() => setSelectedNumber(item.number)}>
                                <ListItemText
                                    primary={
                                        <Stack direction="row" alignItems="center" gap={1}>
                                            <Typography component="span" fontWeight="medium">
                                                #{item.number}
                                            </Typography>
                                            <Typography component="span" variant="body2">
                                                {item.title}
                                            </Typography>
                                        </Stack>
                                    }
                                    secondary={`${item.reporter ? `Por ${item.reporter} · ` : ''}${
                                        item.state === 'closed' ? 'Cerrado' : 'Abierto'
                                    } · ${formatWhen(item.updated_at)}`}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            )}
            {!showConfirmation && pageTab === 'new' && (
                <Box component="form" onSubmit={submit}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Contanos un fallo o una idea de mejora. Te damos un número de reporte para hacer seguimiento. Podés
                        adjuntar hasta {MAX_FILES} imágenes (5 MB c/u).
                    </Typography>
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
                    <AttachmentPicker
                        field={newReport}
                        disabled={sending}
                        sending={sending}
                        onLightbox={openLightbox}
                        setError={setError}
                    />
                    <Button type="submit" variant="contained" disabled={sending}>
                        {sending ? 'Enviando…' : 'Enviar'}
                    </Button>
                </Box>
            )}
            <Dialog open={Boolean(lightboxSrc)} onClose={closeLightbox} maxWidth="md" fullWidth>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                    {lightboxSrc && (
                        <Box
                            component="img"
                            src={lightboxSrc}
                            alt=""
                            sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    )
}

function AttachmentPicker({ field, disabled, sending, onLightbox, setError }) {
    const { fileInputRef, attachments, removeAttachment, onPickFiles } = field
    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => onPickFiles(e, setError)}
            />
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }} alignItems="center">
                <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    disabled={disabled || sending || attachments.length >= MAX_FILES}
                    onClick={() => fileInputRef.current?.click()}
                >
                    Agregar imágenes
                </Button>
                <Typography variant="caption" color="text.secondary">
                    {attachments.length}/{MAX_FILES}
                </Typography>
            </Stack>
            {attachments.length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                    {attachments.map((item) => (
                        <Box key={item.key} sx={{ position: 'relative' }}>
                            <Box
                                component="button"
                                type="button"
                                onClick={() => onLightbox(item.previewUrl)}
                                sx={{
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 0,
                                    cursor: 'pointer',
                                    display: 'block',
                                }}
                            >
                                <Box
                                    component="img"
                                    src={item.previewUrl}
                                    alt={item.name}
                                    sx={{ width: 96, height: 96, objectFit: 'cover', display: 'block' }}
                                />
                            </Box>
                            <IconButton
                                size="small"
                                aria-label="Quitar imagen"
                                onClick={() => removeAttachment(item.key)}
                                sx={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 2,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                    ))}
                </Stack>
            )}
        </>
    )
}