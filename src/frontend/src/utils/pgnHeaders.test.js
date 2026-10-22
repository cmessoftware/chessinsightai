import { describe, expect, it } from 'vitest'
import {
    buildPgnClipboardText,
    extractPgnHeadersBlock,
} from './coachPgnExport.js'
import { upsertPgnHeaderBlock } from './pgnHeaders.js'

describe('extractPgnHeadersBlock escaped quotes', () => {
    it('keeps tags after a value with escaped quotes', () => {
        const pgn = `[Event "Torneo \\"A\\""]
[White "Alice"]
[FEN "4rkn1/p1q4p/1p2Q1p1/4P1N1/b1p4P/2P1P3/6P1/4R1K1 b - - 0 1"]

1... Re7`
        const headers = extractPgnHeadersBlock(pgn)
        expect(headers).toContain('[Event "Torneo \\"A\\""]')
        expect(headers).toContain('[White "Alice"]')
        expect(headers).toContain('[FEN "4rkn1')
    })
})

describe('buildPgnClipboardText Result sync', () => {
    it('updates Result header to match movetext', () => {
        const source = `[Result "0-1"]
[White "W"]

1. e4 1-0`
        const out = buildPgnClipboardText('1. e4 1-0', source)
        expect(out).toContain('[Result "1-0"]')
        expect(out).not.toContain('[Result "0-1"]')
    })
})

describe('upsertPgnHeaderBlock', () => {
    it('replaces an existing tag', () => {
        const block = '[Event "A"]\n[Result "*"]'
        expect(upsertPgnHeaderBlock(block, 'Result', '1-0')).toBe(
            '[Event "A"]\n[Result "1-0"]',
        )
    })
})
