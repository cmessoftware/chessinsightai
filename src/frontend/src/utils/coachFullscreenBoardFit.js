/** Square board width that fits the fullscreen slot, including capture strips. */
export function fitFullscreenBoardWidth({
    slotWidth,
    slotHeight,
    padX = 0,
    padY = 0,
    chrome = 44,
    max = 720,
    slack = 4,
}) {
    const contentW = slotWidth - padX
    const contentH = slotHeight - padY
    const w = Math.min(max, contentW, contentH - chrome - slack)
    if (!Number.isFinite(w) || w < 160) return null
    return Math.floor(w)
}
