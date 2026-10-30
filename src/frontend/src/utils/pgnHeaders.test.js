import { describe, expect, it } from 'vitest'
import {
    buildPgnClipboardText,
    extractPgnHeadersBlock,
} from './coachPgnExport.js'
import { listPgnHeaderRows, upsertPgnHeaderBlock } from './pgnHeaders.js'

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

describe('listPgnHeaderRows', () => {
    it('keeps tag order and empty values from the imported header', () => {
        const pgn = `[Event "Paris m1"]
[Site "Paris"]
[Date "1858.??.??"]
[Round "4"]
[White "Anderssen, Adolf"]
[Black "Morphy, Paul"]
[Result "0-1"]
[WhiteElo ""]
[BlackElo ""]
[ECO "C77"]
[Annotator "Colección didáctica - Sergio"]
[StudyCategory "M02 Acción conjunta"]

{CATEGORIA: M02}
1.e4 e5 0-1`
        const rows = listPgnHeaderRows(pgn)
        expect(rows.map((row) => row.tag)).toEqual([
            'Event',
            'Site',
            'Date',
            'Round',
            'White',
            'Black',
            'Result',
            'WhiteElo',
            'BlackElo',
            'ECO',
            'Annotator',
            'StudyCategory',
        ])
        expect(rows.find((row) => row.tag === 'Event')).toMatchObject({
            label: 'Evento',
            value: 'Paris m1',
        })
        expect(rows.find((row) => row.tag === 'WhiteElo')?.value).toBe('')
        expect(rows.find((row) => row.tag === 'StudyCategory')?.label).toBe('Categoría')
        expect(rows.find((row) => row.tag === 'StudyCategory')?.value).toBe(
            'M02 Acción conjunta',
        )
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
