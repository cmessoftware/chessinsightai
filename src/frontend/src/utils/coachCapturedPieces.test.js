import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { createEmptyRoot } from './coachVariationTree.js'
import {
    capturedPieceGlyphs,
    computeCapturedPiecesFromTree,
} from './coachCapturedPieces.js'

describe('coachCapturedPieces', () => {
    it('tracks captures along the cursor path from the tree root', () => {
        const chess = new Chess()
        const fens = [chess.fen()]
        chess.move('e4')
        fens.push(chess.fen())
        chess.move('d5')
        fens.push(chess.fen())
        chess.move('exd5')
        fens.push(chess.fen())

        const root = createEmptyRoot(fens[0])
        root.children = [
            {
                id: '1',
                san: 'e4',
                uci: 'e2e4',
                fen: fens[1],
                fromGame: true,
                children: [
                    {
                        id: '2',
                        san: 'd5',
                        uci: 'd7d5',
                        fen: fens[2],
                        fromGame: true,
                        children: [
                            {
                                id: '3',
                                san: 'exd5',
                                uci: 'e4d5',
                                fen: fens[3],
                                fromGame: true,
                                children: [],
                            },
                        ],
                    },
                ],
            },
        ]

        const { capturedByWhite, capturedByBlack } = computeCapturedPiecesFromTree(root, [
            0, 0, 0,
        ])
        expect(capturedByWhite).toEqual(['p'])
        expect(capturedByBlack).toEqual([])
        expect(capturedPieceGlyphs(capturedByWhite, 'w')).toBe('♟')
    })

    it('renders victim glyphs for the capturing side', () => {
        expect(capturedPieceGlyphs(['p', 'p'], 'b')).toBe('♙♙')
    })
})
