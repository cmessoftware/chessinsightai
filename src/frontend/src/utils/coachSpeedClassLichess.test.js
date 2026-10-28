import { describe, expect, it } from 'vitest'
import {
    inferSpeedClassFromTimeControl,
    resolveDisplaySpeedClass,
} from './coachSpeedClassLichess.js'

describe('coachSpeedClassLichess', () => {
    it('classifies by Lichess base time thresholds', () => {
        expect(inferSpeedClassFromTimeControl('15+0')).toBe('ultrabullet')
        expect(inferSpeedClassFromTimeControl('120+2')).toBe('bullet')
        expect(inferSpeedClassFromTimeControl('300+0')).toBe('blitz')
        expect(inferSpeedClassFromTimeControl('900+10')).toBe('rapid')
        expect(inferSpeedClassFromTimeControl('1500+0')).toBe('classical')
    })

    it('prefers clock over stored rapid label (5+0 → Blitz)', () => {
        expect(resolveDisplaySpeedClass('rapid', '300+0')).toBe('blitz')
    })
})
