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

function findNode(node, san) {
    if (node.san === san) return node
    for (const child of node.children || []) {
        const found = findNode(child, san)
        if (found) return found
    }
    return null
}

function findParent(node, san, parent = null) {
    if (node.san === san) return parent
    for (const child of node.children || []) {
        const found = findParent(child, san, node)
        if (found) return found
    }
    return null
}

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

    it('keeps a white-move variation and prose comments', () => {
        const pgn = `${HEADERS}{ Nota inicial con (paréntesis). }
1. d4 { [%eval 0.15] } { GM Mihail Marin } 1... Nf6 2. c4 e6 3. Nf3 b6 4. g3 Ba6 5. Qc2 Bb7 (5... Bb4+ 6. Bd2 Be7) 6. Bg2 c5 7. d5 exd5 8. cxd5 Nxd5 9. O-O Be7 10. Rd1 Nc6 11. Qf5 { línea principal } Nf6 12. e4 d6 13. e5 Qd7 14. Qxd7+ Nxd7 15. exd6 Bf6 16. Re1+ Kf8 17. Nc3 Nb4 18. Bg5?! { Inaccuracy. Rd1 was best. } (18. Rd1 Rd8 19. a3 Nc2) 18... Nc2 *
`
        const { tree, error } = buildTreeFromPgn(pgn)
        expect(error).toBeNull()
        expect(tree.pgnComment).toContain('Nota inicial')
        const d4 = tree.children[0]
        expect(d4.pgnComment).toContain('Mihail Marin')
        expect(d4.pgnComment).not.toContain('%eval')
        const qc2 = findNode(tree, 'Qc2')
        expect(qc2.children.map((c) => c.san)).toEqual(expect.arrayContaining(['Bb7', 'Bb4+']))
        const beforeBg5 = findParent(tree, 'Bg5')
        expect(beforeBg5.children.map((c) => c.san)).toEqual(expect.arrayContaining(['Bg5', 'Rd1']))
        const exported = buildStudyPgnFromTree(tree, pgn, { result: '*' })
        expect(exported).toContain('Rd1')
        expect(exported).toContain('Nota inicial')
        expect(exported).toContain('Mihail Marin')
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
