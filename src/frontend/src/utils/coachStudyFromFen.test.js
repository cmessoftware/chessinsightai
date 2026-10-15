import { describe, expect, it } from 'vitest'
import { createStudyRootFromFen } from './coachStudyFromFen.js'
import { STARTING_FEN } from './parseFenInput.js'

describe('createStudyRootFromFen', () => {
    it('builds root node with normalized fen', () => {
        const r = createStudyRootFromFen(STARTING_FEN)
        expect(r.ok).toBe(true)
        expect(r.root.fen).toBe(STARTING_FEN)
        expect(r.root.children).toEqual([])
    })

    it('propagates parse errors', () => {
        const r = createStudyRootFromFen('bad')
        expect(r.ok).toBe(false)
    })
})
