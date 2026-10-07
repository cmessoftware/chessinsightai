import { parseMultipvFromInfoLines, uciPvToSan } from '../utils/uciStockfish.js'

class CancelledError extends Error {
    constructor() {
        super('analysis cancelled')
        this.name = 'CancelledError'
    }
}

class StockfishBrowserEngine {
    constructor(worker) {
        this.worker = worker
        this.waiters = []
        this.generation = 0
        this.configured = false
        worker.onmessage = (event) => {
            const line = typeof event.data === 'string' ? event.data : event.data?.data
            if (typeof line !== 'string') return
            this.waiters = this.waiters.filter((w) => {
                if (w.predicate(line)) {
                    w.resolve(line)
                    return false
                }
                return true
            })
        }
    }

    send(command) {
        this.worker.postMessage(command)
    }

    waitFor(predicate, timeoutMs = 60000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.waiters = this.waiters.filter((w) => w.resolve !== resolve)
                reject(new Error('Stockfish timeout'))
            }, timeoutMs)
            this.waiters.push({
                predicate,
                resolve: (line) => {
                    clearTimeout(timer)
                    resolve(line)
                },
            })
        })
    }

    async ensureReady() {
        if (this.configured) return
        this.send('uci')
        await this.waitFor((l) => l === 'uciok')
        this.send('isready')
        await this.waitFor((l) => l === 'readyok')
        this.configured = true
    }

    stop() {
        this.generation += 1
        this.send('stop')
    }

    async analyze({ fen, depth = 14, multipv = 2 }) {
        await this.ensureReady()
        const gen = ++this.generation
        this.send('stop')
        this.send(`setoption name MultiPV value ${Math.max(1, Math.min(5, multipv))}`)
        this.send(`position fen ${fen}`)
        const collected = []
        const onMessage = (event) => {
            const line = typeof event.data === 'string' ? event.data : event.data?.data
            if (typeof line === 'string') collected.push(line)
        }
        this.worker.addEventListener('message', onMessage)
        this.send(`go depth ${depth}`)
        try {
            await this.waitFor((l) => l.startsWith('bestmove'))
        } finally {
            this.worker.removeEventListener('message', onMessage)
        }
        if (gen !== this.generation) {
            throw new CancelledError()
        }
        return parseMultipvFromInfoLines(collected)
    }
}

let enginePromise = null

export function getStockfishBrowserEngine() {
    if (typeof Worker === 'undefined') {
        return Promise.reject(new Error('Web Workers no disponibles'))
    }
    if (!enginePromise) {
        enginePromise = new Promise((resolve, reject) => {
            try {
                const base = import.meta.env.BASE_URL || '/'
                const worker = new Worker(`${base}stockfish/stockfish-19-lite-single.js`)
                const engine = new StockfishBrowserEngine(worker)
                engine.ensureReady().then(() => resolve(engine)).catch(reject)
            } catch (err) {
                reject(err)
            }
        })
    }
    return enginePromise
}

export function mapLiveLinesToDisplay(rawLines, fen, playerColor) {
    const playerIsWhite = (playerColor || 'white').toLowerCase() !== 'black'
    const stm = fen.split(/\s+/)[1] || 'w'

    return rawLines.map((line) => {
        let cp = line.cp
        let mate = line.mate
        if (cp != null || mate != null) {
            const flip = stm === 'b'
            if (cp != null) cp = flip ? -cp : cp
            if (mate != null) mate = flip ? -mate : mate
            if (!playerIsWhite) {
                if (cp != null) cp = -cp
                if (mate != null) mate = -mate
            }
        }
        const pvSan = uciPvToSan(fen, line.pvUci)
        const headSan = pvSan[0] || line.pvUci[0] || ''
        return {
            rank: line.rank,
            depth: line.depth,
            player_score:
                mate != null
                    ? { kind: 'mate', mate, cp: null }
                    : { kind: 'cp', cp, mate: null },
            san: headSan,
            pv_san: pvSan,
        }
    })
}

export { CancelledError }
