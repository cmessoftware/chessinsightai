/** Extract unique White/Black names from PGN header lines (first pass). */
export function suggestPlayerNamesFromPgn(pgnText) {
    const names = new Set()
    if (!pgnText) return []
    for (const line of pgnText.split('\n')) {
        const trimmed = line.trim()
        const match = trimmed.match(/^\[(White|Black)\s+"([^"]+)"\]/i)
        if (match) {
            names.add(match[2])
        }
    }
    return [...names]
}
