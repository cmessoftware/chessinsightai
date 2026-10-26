import { describe, expect, it } from 'vitest'
import {
    applyPlyUserAnnotationPatch,
    formatPgnUserAnnotationSuffix,
    isValidPlyUserNag,
} from './coachPlyUserAnnotations.js'

describe('coachPlyUserAnnotations', () => {
    it('validates NAG symbols', () => {
        expect(isValidPlyUserNag('!')).toBe(true)
        expect(isValidPlyUserNag('+-')).toBe(true)
        expect(isValidPlyUserNag('bogus')).toBe(false)
    })

    it('applyPlyUserAnnotationPatch merges and clears', () => {
        let map = applyPlyUserAnnotationPatch({}, [0], { nag: '!' })
        expect(map['0'].nag).toBe('!')
        map = applyPlyUserAnnotationPatch(map, [0], { comment: 'idea' })
        expect(map['0'].comment).toBe('idea')
        map = applyPlyUserAnnotationPatch(map, [0], { nag: null, comment: null })
        expect(map['0']).toBeUndefined()
    })

    it('formatPgnUserAnnotationSuffix', () => {
        const by = { '0.0': { nag: '?!', comment: 'duda' } }
        expect(formatPgnUserAnnotationSuffix(by, [0, 0])).toBe('?! { duda }')
    })
})
