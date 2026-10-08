import { describe, expect, it } from 'vitest'
import {
    classifyPositionSituation,
    derivePedagogicalImpactV1,
    getPositionThresholdsForElo,
} from './coachPedagogicalImpact.js'

describe('coachPedagogicalImpact v1 Elo bands', () => {
    it('2400 band: +200 cp is decisive', () => {
        const { thresholds } = getPositionThresholdsForElo(2450)
        expect(classifyPositionSituation(200, thresholds)).toBe('decisive_advantage')
        expect(classifyPositionSituation(150, thresholds)).toBe('advantage')
    })

    it('1600 band: +500 cp is decisive', () => {
        const { thresholds } = getPositionThresholdsForElo(1650)
        expect(classifyPositionSituation(500, thresholds)).toBe('decisive_advantage')
    })

    it('+8 to +5 style loss keeps decisive impact at 1600', () => {
        const r = derivePedagogicalImpactV1({
            evalBeforeCp: 800,
            evalAfterCp: 500,
            cpLoss: 300,
            playerElo: 1650,
        })
        expect(r.pedagogicalImpact).toBe('decisive_advantage_kept')
        expect(r.pedagogicalImpactMessage).toMatch(/decisiva conservada/i)
    })

    it('threshold hint mentions elo band', () => {
        const r = derivePedagogicalImpactV1({
            evalBeforeCp: 400,
            evalAfterCp: 200,
            cpLoss: 200,
            playerElo: 2100,
        })
        expect(r.thresholdHint).toContain('2000–2399')
        expect(r.thresholdHint).toContain('decisivo')
    })
})
