/**
 * LOG-FEAT-10 + FEAT-120: report bug/suggestion (GitHub issue) with optional images.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
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

export default function FeedbackPage() {
    const { token } = useAuth()
    const fileInputRef = useRef(null)
    const [kind, setKind] = useState('bug')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [attachments, setAttachments] = useState([])
    const [sending, setSending] = useState(false)
    const [error, setError] = useState(null)
    const [created, setCreated] = useState(null)
    const [sentAttachments, setSentAttachments] = useState([])
    const [lightboxSrc, setLightboxSrc] = useState(null)

    useEffect(() => {
        return () => {
            attachments.forEach((a) => {
                if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
            })
        }
    }, [attachments])

    const removeAttachment = (key) => {
        setAttachments((prev) => {
            const item = prev.find((a) => a.key === key)
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
            return prev.filter((a) => a.key !== key)
        })
    }

    const onPickFiles = (event) => {
        const list = Array.from(event.target.files || [])
        event.target.value = ''
        if (!list.length) return
        setError(null)
        const room = MAX_FILES - attachments.length
        if (room <= 0) {
            setError(`Máximo ${MAX_FILES} imágenes.`)
            return
        }
        const next = []
        for (const file of list.slice(0, room)) {
            const err = validateImageFile(file)
            if (err) {
                setError(err)
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

    const submit = async (event) => {
        event.preventDefault()
        setError(null)
        setCreated(null)
        setSentAttachments([])
        setSending(true)
        try {
            const form = new FormData()
            form.append('kind', kind)
            form.append('title', title)
            form.append('description', description)
            for (const item of attachments) {
                form.append('files', item.file, item.name)
            }
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            })
            const body = await response.json().catch(() => ({}))
            if (!response.ok) {
                throw new Error(body.detail || 'No se pudo registrar el reporte')
            }
            setCreated(body)
            setSentAttachments(body.attachments || [])
            setTitle('')
            setDescription('')
            setAttachments((prev) => {
                prev.forEach((a) => {
                    if (a.previewUrl) URL.revokeObjectURL(a.previewUrl)
                })
                return []
            })
        } catch (err) {
            setError(err.message || 'No se pudo registrar el reporte')
        } finally {
            setSending(false)
        }
    }

    const openLightbox = useCallback((src) => setLightboxSrc(src), [])
    const closeLightbox = () => setLightboxSrc(null)

    return (
        <Box component="form" onSubmit={submit} sx={{ maxWidth: 720 }}>
            <Typography variant="h4" gutterBottom>
                Comentarios
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Contanos un fallo o una idea de mejora. Se guarda como issue en el repositorio. Podés adjuntar
                hasta {MAX_FILES} imágenes (5 MB c/u).
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
            {sentAttachments.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Imágenes enviadas (clic para ampliar):
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
            <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={onPickFiles}
            />
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }} alignItems="center">
                <Button
                    type="button"
                    variant="outlined"
                    size="small"
                    startIcon={<AddPhotoAlternateOutlinedIcon />}
                    disabled={sending || attachments.length >= MAX_FILES}
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
                                onClick={() => openLightbox(item.previewUrl)}
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
            <Button type="submit" variant="contained" disabled={sending}>
                {sending ? 'Enviando…' : 'Enviar'}
            </Button>
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