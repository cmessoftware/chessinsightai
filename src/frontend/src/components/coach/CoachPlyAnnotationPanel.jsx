import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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
    pgnComment = '',
    plyUserByPathKey = null,
    onPlyUserAnnotationChange = null,
    onPgnCommentChange = null,
    disabled = false,
    collapsible = false,
}) {
    const [tab, setTab] = useState(0)
    const hasMove = cursorPath?.length > 0
    const annotation = useMemo(
        () => (hasMove ? getPlyUserAnnotation(plyUserByPathKey, cursorPath) : null),
        [hasMove, plyUserByPathKey, cursorPath],
    )
    const pathKey = cursorPath?.length ? cursorPath.join('.') : ''
    const externalComment = String(annotation?.comment || pgnComment || '')
    const [commentDraft, setCommentDraft] = useState(externalComment)
    const draftRef = useRef(commentDraft)
    draftRef.current = commentDraft

    useEffect(() => {
        const path = cursorPath
        const saved = externalComment.trim()
        setCommentDraft(externalComment)
        draftRef.current = externalComment
        return () => {
            const draft = draftRef.current.trim()
            if (!path?.length || !onPgnCommentChange || draft === saved) return
            onPgnCommentChange(path, draft)
        }
        // Reload the field only when the selected move changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathKey])

    useEffect(() => {
        if (!pathKey || !onPgnCommentChange) return undefined
        const text = commentDraft.trim()
        if (text === externalComment.trim()) return undefined
        const path = cursorPath
        const t = window.setTimeout(() => {
            onPgnCommentChange(path, text)
        }, 400)
        return () => window.clearTimeout(t)
    }, [commentDraft, pathKey, externalComment, cursorPath, onPgnCommentChange])

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

    const controls = (
        <>
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
                        onChange={(e) => {
                            draftRef.current = e.target.value
                            setCommentDraft(e.target.value)
                        }}
                        disabled={disabled || !hasMove || !onPgnCommentChange}
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
        </>
    )

    if (collapsible) {
        return (
            <Accordion
                defaultExpanded={false}
                disableGutters
                sx={{
                    width: width ?? '100%',
                    maxWidth: '100%',
                    mt: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    '&:before': { display: 'none' },
                    boxShadow: 'none',
                }}
            >
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="coach-ply-annotation-content"
                    id="coach-ply-annotation-header"
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ChatBubbleOutline fontSize="small" />
                        <Typography variant="subtitle2">Comentario</Typography>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>{controls}</AccordionDetails>
            </Accordion>
        )
    }

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
            {controls}
        </Paper>
    )
}
