import versionText from '../../../../VERSION?raw'

/** Beta 1 product name (FEAT-082). */
export const PRODUCT_NAME = 'ChessDash'

/**
 * `VERSION` is `v0.1.595-30e5eb1`. The label under the name is `beta-<commit>`.
 * @param {string} versionText
 */
export function betaLabelFromVersion(versionText) {
    const raw = String(versionText || '').trim()
    const hash = raw.split('-').pop() || ''
    const commit = /^[0-9a-f]{7,40}$/i.test(hash) ? hash.slice(0, 7).toLowerCase() : 'dev'
    return `beta-${commit}`
}

export const BETA_LABEL = betaLabelFromVersion(versionText)
