import { describe, expect, it } from 'vitest'
import { REPORT_MENU, reportFromPath } from './reportCatalog.js'

describe('REPORT_MENU', () => {
    it('lists one entry for each report in the module table', () => {
        expect(REPORT_MENU.map((item) => item.id)).toEqual([
            'RPT-FEAT-03',
            'RPT-FEAT-04',
            'RPT-FEAT-05',
            'RPT-FEAT-06',
            'RPT-FEAT-07',
            'RPT-FEAT-08',
        ])
        const paths = REPORT_MENU.map((item) => item.path)
        expect(new Set(paths).size).toBe(paths.length)
        expect(paths.every((path) => path.startsWith('/reports/'))).toBe(true)
    })

    it('matches a report path and ignores the module index', () => {
        expect(reportFromPath('/reports/ranking')?.label).toBe('Ranking por ritmo')
        expect(reportFromPath('/reports')).toBeNull()
    })
})
