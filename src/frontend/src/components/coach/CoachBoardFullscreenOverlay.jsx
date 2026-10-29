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
}) {
    const boardAreaRef = useRef(null)
    const [boardWidth, setBoardWidth] = useState(560)

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

    useEffect(() => {
        if (!open) return undefined
        const el = boardAreaRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const measure = () => {
            const { clientWidth, clientHeight } = el
            const sidePad = 24
            const wByWidth = clientWidth - sidePad
            const wByHeight = clientHeight - 120
            const w = Math.min(720, wByWidth, wByHeight)
            setBoardWidth(Math.max(280, Math.floor(w)))
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(el)
        window.addEventListener('resize', measure)
        return () => {
            observer.disconnect()
            window.removeEventListener('resize', measure)
        }
    }, [open, pgnVisible])

    return (
        <Modal open={open} onClose={onClose} aria-labelledby="coach-board-fullscreen-title">
            <Box
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
                        color="text.secondary"
                        sx={{ ml: 1 }}
                    >
                        Tablero · pantalla completa
                    </Typography>
                </Stack>

                <Box sx={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
                    <Box
                        ref={boardAreaRef}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            minWidth: 0,
                        }}
                    >
                        {typeof board === 'function' ? board(boardWidth) : board}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 2 }}>
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
