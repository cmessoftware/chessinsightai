import { describe, expect, it } from 'vitest'
import { fullmoveNumberAtPly, sideToMoveAtPly } from './pgnMoveNumber.js'

describe('pgnMoveNumber', () => {
    const blackStart = '4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1'

    it('numbers black-first studies from the FEN clock', () => {
        expect(sideToMoveAtPly(blackStart, 0)).toBe('b')
        expect(fullmoveNumberAtPly(blackStart, 0)).toBe(1)
        expect(fullmoveNumberAtPly(blackStart, 1)).toBe(2)
    })

    it('supports non-1 starting fullmove', () => {
        const fen = '4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 22 23'
        expect(fullmoveNumberAtPly(fen, 0)).toBe(23)
        expect(fullmoveNumberAtPly(fen, 1)).toBe(24)
    })
})
