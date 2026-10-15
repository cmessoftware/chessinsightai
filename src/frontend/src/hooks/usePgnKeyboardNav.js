import { useEffect } from 'react'

const BLOCKED_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Map key event to nav action when focus is inside `targetRef`. */
export function pgnKeyboardNavKeyAction(key) {
    switch (key) {
        case 'ArrowLeft':
            return 'prev'
        case 'ArrowRight':
            return 'next'
        case 'Home':
            return 'first'
        case 'End':
            return 'last'
        default:
            return null
    }
}

function focusIsEditable(el) {
    if (!el) return false
    if (BLOCKED_TAGS.has(el.tagName)) return true
    if (el.isContentEditable) return true
    return false
}

/**
 * Ply navigation via ←/→ and Home/End while the board region has focus.
 * @param {object} opts
 * @param {boolean} opts.enabled
 * @param {import('react').RefObject<HTMLElement>} opts.targetRef
 * @param {() => void} opts.onPrev
 * @param {() => void} opts.onNext
 * @param {() => void} [opts.onFirst]
 * @param {() => void} [opts.onLast]
 */
export function usePgnKeyboardNav({
    enabled = true,
    targetRef,
    onPrev,
    onNext,
    onFirst,
    onLast,
}) {
    useEffect(() => {
        if (!enabled) return undefined
        const root = targetRef?.current
        if (!root) return undefined

        const handleKeyDown = (event) => {
            const active = document.activeElement
            if (!active || !root.contains(active)) return
            if (focusIsEditable(active)) return

            const action = pgnKeyboardNavKeyAction(event.key)
            if (!action) return
            event.preventDefault()

            if (action === 'prev') onPrev?.()
            else if (action === 'next') onNext?.()
            else if (action === 'first') onFirst?.()
            else if (action === 'last') onLast?.()
        }

        root.addEventListener('keydown', handleKeyDown)
        return () => root.removeEventListener('keydown', handleKeyDown)
    }, [enabled, targetRef, onPrev, onNext, onFirst, onLast])
}
