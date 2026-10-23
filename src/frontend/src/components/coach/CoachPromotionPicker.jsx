import React from 'react'
import { Box, ClickAwayListener, IconButton, Paper, Tooltip, Typography } from '@mui/material'
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

    return (
        <ClickAwayListener onClickAway={onCancel}>
            <Box
                sx={{
                    position: 'absolute',
                    left: box.left,
                    top: box.top,
                    width: box.width,
                    height: box.height,
                    zIndex: 12,
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'center',
                    pointerEvents: 'auto',
                }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: 'background.paper',
                        border: 1,
                        borderColor: 'primary.main',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <IconButton
                        size="small"
                        aria-label="Cancelar coronación"
                        onClick={onCancel}
                        sx={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            zIndex: 1,
                            p: 0.25,
                        }}
                    >
                        <Close sx={{ fontSize: 14 }} />
                    </IconButton>
                    {pending.choices.map((code) => (
                        <Tooltip key={code} title={PROMOTION_PIECE_LABEL[code] || code} placement="right">
                            <Box
                                component="button"
                                type="button"
                                onClick={() => onSelect(code)}
                                aria-label={PROMOTION_PIECE_LABEL[code]}
                                sx={{
                                    flex: 1,
                                    border: 'none',
                                    borderBottom: 1,
                                    borderColor: 'divider',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    bgcolor: 'action.hover',
                                    '&:hover': { bgcolor: 'action.selected' },
                                    '&:last-of-type': { borderBottom: 0 },
                                }}
                            >
                                <Typography
                                    component="span"
                                    sx={{
                                        fontSize: Math.min(box.width * 0.55, 36),
                                        lineHeight: 1,
                                        color: pieceColor,
                                        WebkitTextStroke: `0.5px ${pieceStroke}`,
                                    }}
                                >
                                    {PROMOTION_PIECE_GLYPH[code] || code}
                                </Typography>
                            </Box>
                        </Tooltip>
                    ))}
                </Paper>
            </Box>
        </ClickAwayListener>
    )
}
