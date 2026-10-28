import { describe, expect, it } from 'vitest'
import { buildReplayFromPgn } from './coachPgnReplay.js'
import { buildTreeFromMainLine, createEmptyRoot } from './coachVariationTree.js'
import { formatTreePgnMovetext } from './coachPgnExport.js'
import {
    buildTreeFromPgn,
    buildStudyPgnFromTree,
    studyPgnMatchesTree,
} from './coachPgnTreeParse.js'

const HEADERS = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "*"]

`

describe('buildTreeFromPgn', () => {
    it('loads main line only', () => {
        const pgn = `${HEADERS}1. e4 e5 2. Nf3 *`
        const { tree, error } = buildTreeFromPgn(pgn)
        expect(error).toBeNull()
        expect(tree.children[0].san).toBe('e4')
        expect(tree.children[0].children[0].san).toBe('e5')
        expect(tree.children[0].fromGame).toBe(true)
    })

    it('loads nested RAV from movetext', () => {
        const pgn = `${HEADERS}1. e4 e5 (1... c5) 2. Nf3 *`
        const { tree, error } = buildTreeFromPgn(pgn)
        expect(error).toBeNull()
        const afterE4 = tree.children[0]
        expect(afterE4.children[0].san).toBe('e5')
        expect(afterE4.children[1]?.san).toBe('c5')
        expect(afterE4.children[1]?.fromGame).toBe(false)
    })

    it('round-trips export → parse', () => {
        const root = createEmptyRoot()
        const replay = buildReplayFromPgn(`${HEADERS}1. e4 e5 2. Nf3 *`)
        let tree = buildTreeFromMainLine(replay.fens, replay.ucis, replay.moves)
        const afterE4 = tree.children[0]
        afterE4.children.push({
            id: 'alt',
            san: 'c5',
            uci: 'c7c5',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            fromGame: false,
            children: [],
        })
        const movetext = formatTreePgnMovetext(tree, { result: '*' })
        const pgn = `${HEADERS}${movetext}`
        const loaded = buildTreeFromPgn(pgn)
        expect(loaded.error).toBeNull()
        expect(loaded.tree.children[0].children[1]?.san).toBe('c5')
    })

    it('loads python-chess exported RAV spacing', () => {
        const pgn = `${HEADERS}1. e4 e5 ( 1... c5 ) 2. Nf3 *`
        const { tree, error } = buildTreeFromPgn(pgn)
        expect(error).toBeNull()
        expect(tree.children[0].children[1]?.san).toBe('c5')
    })

    it('studyPgnMatchesTree detects dirty state', () => {
        const pgn = `${HEADERS}1. e4 e5 *`
        const { tree } = buildTreeFromPgn(pgn)
        expect(studyPgnMatchesTree(pgn, tree, pgn, { result: '*' })).toBe(true)
        tree.children[0].children.push({
            id: 'x',
            san: 'c5',
            uci: 'c7c5',
            fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
            fromGame: false,
            children: [],
        })
        expect(studyPgnMatchesTree(pgn, tree, pgn, { result: '*' })).toBe(false)
        const saved = buildStudyPgnFromTree(tree, pgn, { result: '*' })
        expect(studyPgnMatchesTree(saved, tree, pgn, { result: '*' })).toBe(true)
    })
})
