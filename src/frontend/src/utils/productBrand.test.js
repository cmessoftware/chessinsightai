import { describe, expect, it } from 'vitest'
import { BETA_LABEL, PRODUCT_NAME, betaLabelFromVersion } from './productBrand.js'

describe('productBrand', () => {
    it('names this beta ChessDash', () => {
        expect(PRODUCT_NAME).toBe('ChessDash')
    })

    it('builds beta-<commit> from VERSION', () => {
        expect(betaLabelFromVersion('v0.1.595-30e5eb1')).toBe('beta-30e5eb1')
        expect(betaLabelFromVersion('v0.1.595-ABCDEF1')).toBe('beta-abcdef1')
        expect(betaLabelFromVersion('')).toBe('beta-dev')
        expect(BETA_LABEL).toMatch(/^beta-[0-9a-f]{7}$/)
    })
})
