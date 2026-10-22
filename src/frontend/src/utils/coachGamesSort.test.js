import { describe, expect, it } from 'vitest'
import { coachDateSortKey, sortCoachGames } from './coachGamesSort.js'

describe('coachGamesSort', () => {
    const sample = [
        { id: 'a', white_player: 'Zara', black_player: 'Amy', white_elo: 1200, date_played: '2024.01.10' },
        { id: 'b', white_player: 'Bob', black_player: 'Carl', white_elo: 1500, date_played: '2023.12.01' },
        { id: 'c', white_player: 'Amy', black_player: 'Zara', white_elo: 1100, date_played: '' },
    ]

    it('sorts by white player ascending', () => {
        const sorted = sortCoachGames(sample, 'white_player', 'asc')
        expect(sorted.map((g) => g.id)).toEqual(['c', 'b', 'a'])
    })

    it('sorts by white elo descending', () => {
        const sorted = sortCoachGames(sample, 'white_elo', 'desc')
        expect(sorted.map((g) => g.id)).toEqual(['b', 'a', 'c'])
    })

    it('sorts PGN dates chronologically', () => {
        expect(coachDateSortKey('2024.03.15')).toBe('2024-03-15')
        const sorted = sortCoachGames(sample, 'date_played', 'asc')
        expect(sorted.map((g) => g.id)).toEqual(['c', 'b', 'a'])
    })

    it('sorts analysis state with job status', () => {
        const games = [
            { id: '1', analysis_job_id: 'j1' },
            { id: '2', client_analysis_ply_count: 5 },
            { id: '3' },
        ]
        const jobStatusForGame = (g) => (g.id === '1' ? 'completed' : null)
        const sorted = sortCoachGames(games, 'analysis', 'desc', { jobStatusForGame })
        expect(sorted.map((g) => g.id)).toEqual(['1', '2', '3'])
    })
})
