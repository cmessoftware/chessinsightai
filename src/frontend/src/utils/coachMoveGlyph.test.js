import { describe, expect, it } from 'vitest'
import { glyphBadgeBox, uciDestinationSquare } from './coachMoveGlyph.js'

describe('coachMoveGlyph', () => {
    it('reads the destination square from UCI', () => {
        expect(uciDestinationSquare('e2e4')).toBe('e4')
        expect(uciDestinationSquare('e7e8q')).toBe('e8')
        expect(uciDestinationSquare('')).toBe(null)
    })

    it('places the badge on the viewer top-right of the square', () => {
        const width = 400
        const whiteH8 = glyphBadgeBox('h8', 'white', width)
        const blackH8 = glyphBadgeBox('h8', 'black', width)
        expect(whiteH8.top).toBeLessThan(blackH8.top)
        expect(whiteH8.left).toBeGreaterThan(glyphBadgeBox('a8', 'white', width).left)
    })
})
