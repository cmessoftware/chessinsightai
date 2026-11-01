import { describe, expect, it } from 'vitest'
import {
    buildPgnClipboardText,
    extractPgnHeadersBlock,
} from './coachPgnExport.js'
import {
    blankStudyPgn,
    ensurePgnGameTerminator,
    listPgnHeaderRows,
    replacePgnHeaders,
    upsertPgnHeaderBlock,
} from './pgnHeaders.js'

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

describe('replacePgnHeaders', () => {
    it('rewrites tags and keeps the movetext, including a variation', () => {
        const pgn = `[Event "A"]
[White "Old"]

1. e4 e5 (1... c5) 2. Nf3 *`
        const next = replacePgnHeaders(pgn, [
            { tag: 'Event', value: 'Estudio' },
            { tag: 'White', value: 'Ana' },
            { tag: 'Black', value: 'Luis' },
            { tag: 'Result', value: '*' },
        ])
        expect(next).toContain('[Event "Estudio"]')
        expect(next).toContain('[White "Ana"]')
        expect(next).not.toContain('[White "Old"]')
        expect(next).toContain('1. e4 e5 (1... c5) 2. Nf3 *')
    })
})

describe('ensurePgnGameTerminator', () => {
    it('adds a result token only when there is no movetext', () => {
        expect(ensurePgnGameTerminator('[Event "A"]\n[Result "*"]')).toBe(
            '[Event "A"]\n[Result "*"]\n\n*',
        )
        const withMoves = '[Event "A"]\n\n1. e4 e5 *'
        expect(ensurePgnGameTerminator(withMoves)).toBe(withMoves)
    })
})

describe('blankStudyPgn', () => {
    it('starts from the initial position with a unique clock in the header', () => {
        const pgn = blankStudyPgn(new Date(2026, 9, 31, 19, 22, 5))
        expect(pgn).toContain('[Event "Nueva partida"]')
        expect(pgn).toContain('[Date "2026.10.31"]')
        expect(pgn).toContain('[UTCTime "19:22:05"]')
        expect(pgn).toContain('[Result "*"]')
        expect(pgn.trim().endsWith('*')).toBe(true)
        expect(listPgnHeaderRows(pgn).map((row) => row.tag)).toEqual([
            'Event',
            'Site',
            'Date',
            'Round',
            'White',
            'Black',
            'Result',
            'UTCDate',
            'UTCTime',
        ])
    })
})
