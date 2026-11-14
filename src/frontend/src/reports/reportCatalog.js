/** RPT-FEAT-01: one sidebar entry per report in the reports table. */

export const REPORT_MENU = [
    {
        id: 'RPT-FEAT-03',
        label: 'Ranking por ritmo',
        path: '/reports/ranking',
    },
    {
        id: 'RPT-FEAT-04',
        label: 'Precisión por ritmo',
        path: '/reports/precision',
    },
    {
        id: 'RPT-FEAT-05',
        label: 'Comparación con un rival',
        path: '/reports/rival',
    },
    {
        id: 'RPT-FEAT-06',
        label: 'Aperturas y defensas',
        path: '/reports/openings',
    },
    {
        id: 'RPT-FEAT-07',
        label: 'Rachas',
        path: '/reports/streaks',
    },
    {
        id: 'RPT-FEAT-08',
        label: 'Sesgo de supervivencia',
        path: '/reports/survivorship',
    },
]

export function reportFromPath(pathname) {
    return REPORT_MENU.find((item) => pathname === item.path) || null
}
