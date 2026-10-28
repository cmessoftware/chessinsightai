import { describe, expect, it } from 'vitest'
import {
    formatOpeningCatalogLabel,
    searchEcoOpeningsCatalog,
} from './coachOpeningCatalog.js'

const SAMPLE = [
    { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
    { eco: 'C00', name: 'French Defense' },
    { eco: 'A00', name: 'Amar Opening' },
]

describe('coachOpeningCatalog', () => {
    it('formats label', () => {
        expect(formatOpeningCatalogLabel(SAMPLE[0])).toBe(
            'B90 — Sicilian Defense: Najdorf Variation',
        )
    })

    it('searches eco and name with wildcards', () => {
        expect(searchEcoOpeningsCatalog(SAMPLE, 'B9*')).toHaveLength(1)
        expect(searchEcoOpeningsCatalog(SAMPLE, '*French*')).toHaveLength(1)
        expect(searchEcoOpeningsCatalog(SAMPLE, 'B90 Najdorf')).toHaveLength(1)
    })
})
