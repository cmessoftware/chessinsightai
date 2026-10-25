import React, { useEffect, useMemo, useState } from 'react'
import {
    Box,
    Paper,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material'
import ChatBubbleOutline from '@mui/icons-material/ChatBubbleOutline'
import {
    getPlyUserAnnotation,
    PLY_USER_NAG_OPTIONS,
} from '../../utils/coachPlyUserAnnotations.js'

const NAG_CHOICES = PLY_USER_NAG_OPTIONS.filter((o) => o.value !== '')

/**
 * Comentario y etiqueta NAG de la jugada actual (FEAT-061), debajo del tablero.
 */
export default function CoachPlyAnnotationPanel({
    width,
    cursorPath = [],
    cursorSan = null,
    plyUserByPathKey = null,
    onPlyUserAnnotationChange = null,
    disabled = false,
}) {
    const [tab, setTab] = useState(0)
    const hasMove = cursorPath?.length > 0
    const annotation = useMemo(
        () => (hasMove ? getPlyUserAnnotation(plyUserByPathKey, cursorPath) : null),
        [hasMove, plyUserByPathKey, cursorPath],
    )
    const [commentDraft, setCommentDraft] = useState('')

    useEffect(() => {
        setCommentDraft(annotation?.comment || '')
    }, [cursorPath, annotation?.comment])

    useEffect(() => {
        if (!hasMove || !onPlyUserAnnotationChange) return undefined
        const saved = annotation?.comment || ''
        if (commentDraft === saved) return undefined
        const t = window.setTimeout(() => {
            onPlyUserAnnotationChange(cursorPath, {
                comment: commentDraft.trim() || null,
            })
        }, 400)
        return () => window.clearTimeout(t)
    }, [
        commentDraft,
        cursorPath,
        hasMove,
        onPlyUserAnnotationChange,
        annotation?.comment,
    ])

    const currentNag = annotation?.nag || ''

    const handleNagChange = (_e, next) => {
        if (!hasMove || !onPlyUserAnnotationChange) return
        if (next === null) return
        onPlyUserAnnotationChange(cursorPath, { nag: next || null })
    }

    const subtitle = hasMove
        ? cursorSan
            ? `Jugada ${cursorSan}`
            : 'Jugada seleccionada'
        : 'Posición inicial — avanzá a una jugada para anotar'

    return (
        <Paper
            variant="outlined"
            sx={{
                width: width ?? '100%',
                maxWidth: '100%',
                mt: 1.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
            }}
        >
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                    minHeight: 44,
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': { minHeight: 44 },
                }}
            >
                <Tab
                    icon={<ChatBubbleOutline fontSize="small" />}
                    aria-label="Comentario"
                    title="Comentario"
                />
                <Tab
                    icon={
                        <Typography
                            component="span"
                            sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}
                        >
                            !?
                        </Typography>
                    }
                    aria-label="Etiqueta de jugada"
                    title="Etiqueta de jugada"
                />
            </Tabs>
            <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                    {subtitle}
                </Typography>
            </Box>
            <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
                {tab === 0 && (
                    <TextField
                        multiline
                        minRows={3}
                        maxRows={8}
                        fullWidth
                        size="small"
                        placeholder={
                            hasMove
                                ? 'Comentario PGN para esta jugada…'
                                : 'Elegí una jugada en el listado o con las flechas'
                        }
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        disabled={disabled || !hasMove || !onPlyUserAnnotationChange}
                        sx={{ '& textarea': { lineHeight: 1.5 } }}
                    />
                )}
                {tab === 1 && (
                    <Box>
                        <ToggleButtonGroup
                            exclusive
                            value={currentNag}
                            onChange={handleNagChange}
                            size="small"
                            disabled={disabled || !hasMove || !onPlyUserAnnotationChange}
                            sx={{
                                flexWrap: 'wrap',
                                gap: 0.5,
                                '& .MuiToggleButtonGroup-grouped': {
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: '4px !important',
                                    mx: 0,
                                },
                            }}
                        >
                            <ToggleButton value="" aria-label="Sin etiqueta">
                                —
                            </ToggleButton>
                            {NAG_CHOICES.map((opt) => (
                                <ToggleButton
                                    key={opt.value}
                                    value={opt.value}
                                    aria-label={opt.label}
                                    title={opt.label}
                                    sx={{ fontWeight: 700, px: 1.25, minWidth: 40 }}
                                >
                                    {opt.value}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Etiqueta estándar PGN; se incluye al copiar el PGN.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    )
}
