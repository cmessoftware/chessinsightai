import { describe, expect, it } from 'vitest'
import { pgnKeyboardNavKeyAction } from './usePgnKeyboardNav.js'

describe('pgnKeyboardNavKeyAction', () => {
    it('maps arrow and home/end keys', () => {
        expect(pgnKeyboardNavKeyAction('ArrowLeft')).toBe('prev')
        expect(pgnKeyboardNavKeyAction('ArrowRight')).toBe('next')
        expect(pgnKeyboardNavKeyAction('Home')).toBe('first')
        expect(pgnKeyboardNavKeyAction('End')).toBe('last')
    })

    it('ignores unrelated keys', () => {
        expect(pgnKeyboardNavKeyAction('Enter')).toBeNull()
        expect(pgnKeyboardNavKeyAction('a')).toBeNull()
    })
})
