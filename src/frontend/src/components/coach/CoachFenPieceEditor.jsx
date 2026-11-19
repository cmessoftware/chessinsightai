import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'
import {
    Chessboard,
    ChessboardProvider,
    defaultPieces,
    SparePiece,
} from 'react-chessboard'
import { createFenEditorGame, EMPTY_BOARD_FEN } from '../../utils/parseFenInput.js'

const PIECE_TYPES = Object.keys(defaultPieces)
const BLACK_PIECES = PIECE_TYPES.filter((t) => t[0] === 'b')
const WHITE_PIECES = PIECE_TYPES.filter((t) => t[0] === 'w')

/**
 * FEAT-039: paleta externa + arrastre al tablero; posiciones no legales vía skipValidation.
 */
export default function CoachFenPieceEditor({
    fen,
    onFenChange,
    orientation = 'white',
    boardWidth = 400,
    editorKey = 0,
}) {
    const chessGameRef = useRef(createFenEditorGame(fen))
    const [position, setPosition] = useState(() => chessGameRef.current.fen())
    const [squareWidth, setSquareWidth] = useState(null)
    const boardAreaRef = useRef(null)

    useEffect(() => {
        chessGameRef.current = createFenEditorGame(fen || EMPTY_BOARD_FEN)
        setPosition(chessGameRef.current.fen())
        // fen se lee al rotar editorKey (no en cada tecla del campo de texto).
        // eslint-disable-next-line react-hooks/exhaustive-deps -- ver comentario
    }, [editorKey])

    const measureSquare = useCallback(() => {
        const el = boardAreaRef.current
        if (!el) return
        const square = el
            .querySelector('[data-column="a"][data-row="1"]')
            ?.getBoundingClientRect()
        if (square?.width) {
            setSquareWidth(square.width)
        }
    }, [])

    useEffect(() => {
        measureSquare()
        const el = boardAreaRef.current
        if (!el || typeof ResizeObserver === 'undefined') return undefined
        const ro = new ResizeObserver(() => measureSquare())
        ro.observe(el)
        return () => ro.disconnect()
    }, [measureSquare, position, boardWidth])

    const publishPosition = useCallback(
        (fenString) => {
            setPosition(fenString)
            onFenChange?.(fenString)
        },
        [onFenChange],
    )

    const onPieceDrop = useCallback(
        ({ sourceSquare, targetSquare, piece }) => {
            const chess = chessGameRef.current
            const color = piece.pieceType[0]
            const type = piece.pieceType[1].toLowerCase()

            if (!targetSquare) {
                if (sourceSquare && !piece.isSparePiece) {
                    chess.remove(sourceSquare)
                }
                publishPosition(chess.fen())
                return true
            }

            if (!piece.isSparePiece && sourceSquare) {
                chess.remove(sourceSquare)
            }

            const placed = chess.put(
                { color, type },
                targetSquare,
            )
            if (!placed) {
                publishPosition(chess.fen())
                return false
            }

            publishPosition(chess.fen())
            return true
        },
        [publishPosition],
    )

    const chessboardOptions = useMemo(
        () => ({
            id: 'coach-fen-piece-editor',
            position,
            boardOrientation: orientation === 'black' ? 'black' : 'white',
            allowDragging: true,
            allowDragOffBoard: true,
            onPieceDrop,
        }),
        [position, orientation, onPieceDrop],
    )

    const sparePieceSx = squareWidth
        ? { width: squareWidth, height: squareWidth }
        : { width: 48, height: 48 }

    return (
        <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Armá la posición arrastrando piezas al tablero (se permite configuración ilegal). El FEN
                se actualiza arriba.
            </Typography>
            <Box
                ref={boardAreaRef}
                sx={{ width: boardWidth, maxWidth: '100%', mx: 'auto' }}
            >
                <ChessboardProvider options={chessboardOptions}>
                    {squareWidth ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25, mb: 0.5, flexWrap: 'wrap' }}>
                            {BLACK_PIECES.map((pieceType) => (
                                <Box key={pieceType} sx={sparePieceSx}>
                                    <SparePiece pieceType={pieceType} />
                                </Box>
                            ))}
                        </Box>
                    ) : null}
                    <Box sx={{ aspectRatio: '1 / 1', width: '100%' }}>
                        <Chessboard />
                    </Box>
                    {squareWidth ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25, mt: 0.5, flexWrap: 'wrap' }}>
                            {WHITE_PIECES.map((pieceType) => (
                                <Box key={pieceType} sx={sparePieceSx}>
                                    <SparePiece pieceType={pieceType} />
                                </Box>
                            ))}
                        </Box>
                    ) : null}
                </ChessboardProvider>
            </Box>
        </Box>
    )
}