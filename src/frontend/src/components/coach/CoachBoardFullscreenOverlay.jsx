import React, { useEffect, useRef, useState } from 'react'
import {
    Box,
    IconButton,
    Modal,
    Paper,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid'
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined'
import {
    FirstPage,
    LastPage,
    NavigateBefore,
    NavigateNext,
} from '@mui/icons-material'
import { usePgnKeyboardNav } from '../../hooks/usePgnKeyboardNav.js'

/** FEAT-071: pantalla completa tablero + flechas de navegación; PGN lateral (visible por defecto, ocultable). */
export default function CoachBoardFullscreenOverlay({
    open,
    onClose,
    pgnVisible,
    onTogglePgn,
    onFlipBoard,
    moveLabel,
    stepFirst,
    stepBack,
    stepForward,
    stepLast,
    canStepForward,
    cursorPathLength,
    board,
    pgnPanel,
    annotationPanel = null,
    gameTitle = '',
}) {
    const panelRef = useRef(null)
    const columnRef = useRef(null)
    const slotRef = useRef(null)
    const arrowsRef = useRef(null)
    const annotationRef = useRef(null)
    const [boardWidth, setBoardWidth] = useState(480)
    const headerTitle = String(gameTitle || '').trim() || 'Tablero · pantalla completa'

    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    usePgnKeyboardNav({
        enabled: open,
        targetRef: panelRef,
        onPrev: stepBack,
        onNext: stepForward,
        onFirst: stepFirst,
        onLast: stepLast,
    })

    useEffect(() => {
        if (!open) return undefined
        const id = window.requestAnimationFrame(() => {
            slotRef.current?.focus({ preventScroll: true })
        })
        return () => window.cancelAnimationFrame(id)
    }, [open])

    useEffect(() => {
        if (!open) return undefined
        const column = columnRef.current
        const slot = slotRef.current
        if (!column || !slot || typeof ResizeObserver === 'undefined') return undefined
        const measure = () => {
            const arrowsH = arrowsRef.current?.offsetHeight ?? 40
            const noteH = annotationRef.current?.offsetHeight ?? 0
            const slotStyle = window.getComputedStyle(slot)
            const padTop = Number.parseFloat(slotStyle.paddingTop) || 0
            const padBottom = Number.parseFloat(slotStyle.paddingBottom) || 0
            // Strips above and below the square. Padding on the slot is the visible margin.
            const captures = 44
            const fromSlot = slot.clientHeight - padTop - padBottom - captures - 12
            const fromViewport = window.innerHeight - arrowsH - noteH - captures - padTop - padBottom - 80
            const w = Math.min(720, slot.clientWidth - 16, fromSlot, fromViewport)
            if (!Number.isFinite(w) || w < 160) return
            setBoardWidth(Math.floor(w))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(column)
        observer.observe(slot)
        if (arrowsRef.current) observer.observe(arrowsRef.current)
        if (annotationRef.current) observer.observe(annotationRef.current)
        window.addEventListener('resize', measure)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [open, pgnVisible])

    return (
        <Modal open={open} onClose={onClose} aria-labelledby="coach-board-fullscreen-title">
            <Box
                ref={panelRef}
                tabIndex={-1}
                sx={{
                    position: 'fixed',
                    inset: 0,
                    bgcolor: 'background.default',
                    display: 'flex',
                    flexDirection: 'column',
                    outline: 'none',
                }}
            >
                <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{
                        px: 1,
                        py: 0.5,
                        borderBottom: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
                    }}
                >
                    <Tooltip title="Salir de pantalla completa">
                        <IconButton onClick={onClose} aria-label="Salir de pantalla completa" size="small">
                            <FullscreenExitIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Cerrar">
                        <IconButton onClick={onClose} aria-label="Cerrar pantalla completa" size="small">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={pgnVisible ? 'Ocultar panel PGN' : 'Mostrar panel PGN'}>
                        <IconButton
                            onClick={onTogglePgn}
                            aria-label={pgnVisible ? 'Ocultar panel PGN' : 'Mostrar panel PGN'}
                            aria-pressed={pgnVisible}
                            size="small"
                            color={pgnVisible ? 'primary' : 'default'}
                        >
                            {pgnVisible ? <MenuBookIcon fontSize="small" /> : <MenuBookOutlinedIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Girar tablero">
                        <IconButton onClick={onFlipBoard} aria-label="Girar tablero" size="small">
                            <FlipCameraAndroidIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Typography
                        id="coach-board-fullscreen-title"
                        variant="subtitle2"
                        noWrap
                        title={headerTitle}
                        sx={{ ml: 1, minWidth: 0, flex: '1 1 auto' }}
                    >
                        {headerTitle}
                    </Typography>
                </Stack>

                <Box sx={{ flex: '1 1 0px', display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                    <Box
                        ref={columnRef}
                        sx={{
                            flex: '1 1 0px',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: 0,
                            minHeight: 0,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            ref={slotRef}
                            tabIndex={0}
                            role="group"
                            aria-label="Tablero. Flechas izquierda y derecha para retroceder o avanzar en la línea."
                            onPointerDown={() => {
                                slotRef.current?.focus({ preventScroll: true })
                            }}
                            sx={{
                                flex: '1 1 0px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                minWidth: 0,
                                minHeight: 0,
                                overflow: 'hidden',
                                px: 1,
                                pt: 3,
                                pb: 1,
                                boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        >
                            <Box sx={{ width: boardWidth, flexShrink: 0 }}>
                                {typeof board === 'function' ? board(boardWidth) : board}
                            </Box>
                        </Box>
                        <Box
                            ref={arrowsRef}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 0.5,
                                flexShrink: 0,
                                py: 0.5,
                            }}
                        >
                                <IconButton size="small" onClick={stepFirst} aria-label="Primera posición">
                                    <FirstPage />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={stepBack}
                                    disabled={cursorPathLength <= 0}
                                    aria-label="Jugada anterior"
                                >
                                    <NavigateBefore />
                                </IconButton>
                                <Typography
                                    variant="body2"
                                    component="span"
                                    sx={{ mx: 1, minWidth: 100, textAlign: 'center', userSelect: 'none' }}
                                >
                                    {moveLabel}
                                </Typography>
                                <IconButton
                                    size="small"
                                    onClick={stepForward}
                                    disabled={!canStepForward}
                                    aria-label="Jugada siguiente"
                                >
                                    <NavigateNext />
                                </IconButton>
                                <IconButton size="small" onClick={stepLast} aria-label="Última posición de la rama">
                                    <LastPage />
                                </IconButton>
                        </Box>
                        {open && annotationPanel && (
                            <Box
                                ref={annotationRef}
                                sx={{
                                    width: '100%',
                                    maxWidth: boardWidth,
                                    mx: 'auto',
                                    px: 2,
                                    pb: 1,
                                    flexShrink: 0,
                                }}
                            >
                                {annotationPanel}
                            </Box>
                        )}
                    </Box>

                    {pgnVisible && (
                        <Paper
                            elevation={0}
                            sx={{
                                width: { xs: '42%', sm: 360 },
                                maxWidth: 420,
                                borderLeft: 1,
                                borderColor: 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5 }}>{pgnPanel}</Box>
                        </Paper>
                    )}
                </Box>
            </Box>
        </Modal>
    )
}
