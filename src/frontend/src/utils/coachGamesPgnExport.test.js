import { describe, expect, it } from 'vitest'
import { joinGamePgnsForExport, normalizePgnExportBlock } from './coachGamesPgnExport.js'

describe('coachGamesPgnExport', () => {
    it('normalizePgnExportBlock trims and normalizes newlines', () => {
        expect(normalizePgnExportBlock('  [Event "x"]\r\n1. e4  \n')).toBe('[Event "x"]\n1. e4')
    })

    it('joinGamePgnsForExport separates games with blank line', () => {
        const out = joinGamePgnsForExport(['[Event "A"]\n1. e4', '[Event "B"]\n1. d4'])
        expect(out).toBe('[Event "A"]\n1. e4\n\n[Event "B"]\n1. d4')
    })
})
