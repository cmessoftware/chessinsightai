import React from 'react'
import { Box, IconButton, Paper, Typography } from '@mui/material'
import Close from '@mui/icons-material/Close'
import { squareOverlayBox } from '../../utils/coachBoardSquareLayout.js'
import {
    PROMOTION_PIECE_GLYPH,
    PROMOTION_PIECE_LABEL,
} from '../../utils/coachPromotion.js'

/**
 * FEAT-062: piece choice overlay on the promotion square.
 * @param {{ from: string, to: string, choices: string[] }} pending
 */
export default function CoachPromotionPicker({
    pending,
    boardWidth,
    orientation = 'white',
    moverColor = 'white',
    onSelect,
    onCancel,
}) {
    if (!pending?.to || !pending.choices?.length) return null

    const box = squareOverlayBox(pending.to, boardWidth, orientation)
    const pieceColor = moverColor === 'black' ? '#1a1a1a' : '#f5f5f5'
    const pieceStroke = moverColor === 'black' ? '#666' : '#333'
    const rowH = Math.max(40, Math.min(box.width, 52))
    const menuH = rowH * pending.choices.length + 28
    const menuW = Math.max(box.width, 44)
    let menuTop = box.top + box.height / 2 - menuH / 2
    if (menuTop < 0) menuTop = 0
    const menuLeft = box.left + box.width / 2 - menuW / 2

    return (
        <Box
            role="dialog"
            aria-label="Elegir pieza de coronación"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            sx={{
                position: 'absolute',
                left: menuLeft,
                top: menuTop,
                width: menuW,
                zIndex: 12,
                pointerEvents: 'auto',
            }}
        >
            <Paper
                elevation={8}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    bgcolor: 'background.paper',
                    border: 1,
                    borderColor: 'primary.main',
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', py: 0.25, px: 0.25 }}>
                    <IconButton size="small" aria-label="Cancelar coronación" onClick={onCancel}>
                        <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                </Box>
                {pending.choices.map((code) => (
                    <Box
                        key={code}
                        component="button"
                        type="button"
                        onClick={() => onSelect(code)}
                        aria-label={PROMOTION_PIECE_LABEL[code]}
                        title={PROMOTION_PIECE_LABEL[code]}
                        sx={{
                            height: rowH,
                            border: 'none',
                            borderTop: 1,
                            borderColor: 'divider',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'action.selected' },
                        }}
                    >
                        <Typography
                            component="span"
                            sx={{
                                fontSize: Math.min(rowH * 0.62, 34),
                                lineHeight: 1,
                                color: pieceColor,
                                WebkitTextStroke: `0.5px ${pieceStroke}`,
                            }}
                        >
                            {PROMOTION_PIECE_GLYPH[code] || code}
                        </Typography>
                    </Box>
                ))}
            </Paper>
        </Box>
    )
}
