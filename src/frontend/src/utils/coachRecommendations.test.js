import { describe, expect, it } from 'vitest'
import { lookupRecommendationTemplate, resolveEloBandId } from './coachRecommendations.js'

describe('coachRecommendations CA-6', () => {
    it('resolves elo bands', () => {
        expect(resolveEloBandId(1100)).toBe('lt1200')
        expect(resolveEloBandId(2450)).toBe('gte2400')
    })

    it('returns blunder template for 2400+', () => {
        const r = lookupRecommendationTemplate({ engineLabel: 'blunder', playerElo: 2500 })
        expect(r.mode).toBe('elo')
        expect(r.text).toMatch(/refutación concreta/i)
    })

    it('basic mode without elo', () => {
        const r = lookupRecommendationTemplate({ engineLabel: 'mistake', playerElo: null })
        expect(r.mode).toBe('basic')
        expect(r.text.length).toBeGreaterThan(10)
    })
})
