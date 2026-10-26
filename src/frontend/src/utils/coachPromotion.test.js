import { describe, expect, it } from 'vitest'
import { squareOverlayBox } from './coachBoardSquareLayout.js'
import { isPromotionMove, promotionChoicesForMove } from './coachPromotion.js'

describe('coachPromotion', () => {
    it('detects promotion moves', () => {
        const fen = '8/P7/8/8/8/8/8/4K2k w - - 0 1'
        expect(promotionChoicesForMove(fen, 'a7', 'a8')).toEqual(['q', 'r', 'b', 'n'])
        expect(promotionChoicesForMove(fen, 'a7', 'a6')).toEqual([])
    })

    it('isPromotionMove', () => {
        const fen = '8/4P3/8/8/8/8/8/4K2k w - - 0 1'
        expect(isPromotionMove(fen, 'e7', 'e8')).toBe(true)
    })
})

describe('squareOverlayBox', () => {
    it('places a1 at bottom-left for white orientation', () => {
        const box = squareOverlayBox('a1', 400, 'white')
        expect(box.left).toBe(0)
        expect(box.top).toBe(350)
        expect(box.width).toBe(50)
    })
})
