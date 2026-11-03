import axios from 'axios'
import { describe, expect, it } from 'vitest'
import {
    coachGamesListParams,
    coachGamesListParamsSerializer,
} from './module07Service.js'

describe('coachGamesListParams', () => {
    it('repeats rhythm keys so FastAPI applies Correspondencia', () => {
        const url = axios.getUri({
            url: '/api/v1/module07/games',
            params: coachGamesListParams({
                rhythms: ['daily'],
                results: ['1-0', '0-1'],
            }),
            paramsSerializer: coachGamesListParamsSerializer,
        })
        expect(url).toBe('/api/v1/module07/games?rhythms=daily&results=1-0&results=0-1')
        expect(url).not.toContain('[]')
    })
})
