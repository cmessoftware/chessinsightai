import { describe, expect, it, vi } from 'vitest'
import {
    removeSquareCircleMark,
    saveSquareCirclesForScope,
    setSquareCirclesForPath,
    squareCircleColorFromMouseEvent,
    squareCirclesForPath,
    toggleSquareCircleMark,
    squareCircleMarksToStyles,
    COACH_SQUARE_CIRCLES_STORAGE_KEY,
} from './coachBoardSquareCircles.js'

describe('coachBoardSquareCircles', () => {
    it('maps modifier + right-click to colors', () => {
        expect(squareCircleColorFromMouseEvent({ button: 2 })).toBe('green')
        expect(squareCircleColorFromMouseEvent({ button: 2, ctrlKey: true })).toBe('red')
        expect(squareCircleColorFromMouseEvent({ button: 2, altKey: true })).toBe('blue')
        expect(
            squareCircleColorFromMouseEvent({ button: 2, ctrlKey: true, altKey: true }),
        ).toBe('orange')
        expect(squareCircleColorFromMouseEvent({ button: 0 })).toBe(null)
    })

    it('toggles marks on same color', () => {
        let m = toggleSquareCircleMark({}, 'e4', 'green')
        expect(m.e4).toBe('green')
        m = toggleSquareCircleMark(m, 'e4', 'green')
        expect(m.e4).toBeUndefined()
    })

    it('removeSquareCircleMark clears any color on square', () => {
        expect(removeSquareCircleMark({ e4: 'blue' }, 'e4').e4).toBeUndefined()
        expect(removeSquareCircleMark({}, 'e4')).toEqual({})
    })

    it('builds square styles for marked squares', () => {
        const styles = squareCircleMarksToStyles({ e4: 'red' })
        expect(styles.e4.backgroundImage).toContain('radial-gradient')
    })

    it('keeps a circle only on the ply where it was marked', () => {
        const onMove18 = setSquareCirclesForPath({}, [17], { e3: 'green' })
        expect(squareCirclesForPath(onMove18, [17])).toEqual({ e3: 'green' })
        expect(squareCirclesForPath(onMove18, [16])).toEqual({})
        expect(squareCirclesForPath(onMove18, [17, 0])).toEqual({})
        const cleared = setSquareCirclesForPath(onMove18, [17], {})
        expect(squareCirclesForPath(cleared, [17])).toEqual({})
    })

    it('persists circles per scope and ply', () => {
        const memory = new Map()
        vi.stubGlobal('localStorage', {
            getItem: (key) => memory.get(key) ?? null,
            setItem: (key, value) => memory.set(key, value),
        })
        const byPath = setSquareCirclesForPath({}, [17], { e3: 'green' })
        saveSquareCirclesForScope('game-1', byPath)
        const raw = JSON.parse(memory.get(COACH_SQUARE_CIRCLES_STORAGE_KEY))
        expect(raw['game-1']['17']).toEqual({ e3: 'green' })
        expect(raw['game-1']['16']).toBeUndefined()
        vi.unstubAllGlobals()
    })
})
