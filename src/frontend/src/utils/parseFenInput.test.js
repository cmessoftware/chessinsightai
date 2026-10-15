import { describe, expect, it } from 'vitest'
import { parseFenInput, STARTING_FEN } from './parseFenInput.js'

describe('parseFenInput', () => {
    it('accepts full starting position', () => {
        const r = parseFenInput(STARTING_FEN)
        expect(r.ok).toBe(true)
        expect(r.fen).toBe(STARTING_FEN)
    })

    it('completes 4-field FEN with halfmove and fullmove', () => {
        const short = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3'
        const r = parseFenInput(short)
        expect(r.ok).toBe(true)
        expect(r.fen.split(' ').length).toBe(6)
    })

    it('rejects empty input', () => {
        expect(parseFenInput('').ok).toBe(false)
    })

    it('rejects garbage', () => {
        expect(parseFenInput('not a fen').ok).toBe(false)
    })
})
