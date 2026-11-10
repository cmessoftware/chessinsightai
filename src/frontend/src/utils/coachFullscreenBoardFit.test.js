import { describe, expect, it } from 'vitest'
import { fitFullscreenBoardWidth } from './coachFullscreenBoardFit.js'

describe('fitFullscreenBoardWidth', () => {
    it('keeps the square inside the slot after capture strips and padding', () => {
        const width = fitFullscreenBoardWidth({
            slotWidth: 900,
            slotHeight: 640,
            padX: 16,
            padY: 32,
            chrome: 44,
        })
        expect(width).toBe(560)
        expect(width + 44 + 4).toBeLessThanOrEqual(640 - 32)
        expect(width).toBeLessThanOrEqual(900 - 16)
    })

    it('does not exceed the column width or the 720 cap', () => {
        expect(
            fitFullscreenBoardWidth({ slotWidth: 400, slotHeight: 900, padX: 16, padY: 16 }),
        ).toBe(384)
        expect(
            fitFullscreenBoardWidth({ slotWidth: 1200, slotHeight: 1200, padX: 0, padY: 0, chrome: 0, slack: 0 }),
        ).toBe(720)
    })
})
