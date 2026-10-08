import { scoreFromEngineLine } from '../utils/coachEngineLabels.js'
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
        /** @type {{ params: object, priority: 'live' | 'normal', resolve: Function, reject: Function }[]} */
        this.pendingJobs = []
        this.runningJob = false
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

    /**
     * One Stockfish WASM worker — serialize jobs so PV lines match the requested FEN.
     * @param {{ fen: string, depth?: number, multipv?: number }} params
     * @param {{ priority?: 'live' | 'normal' }} [options]
     */
    analyze(params, { priority = 'normal' } = {}) {
        return new Promise((resolve, reject) => {
            const job = { params, priority, resolve, reject }
            if (priority === 'live') {
                this.pendingJobs = this.pendingJobs.filter((j) => j.priority !== 'live')
                this.pendingJobs.unshift(job)
            } else {
                this.pendingJobs.push(job)
            }
            this.drainQueue()
        })
    }

    drainQueue() {
        if (this.runningJob || this.pendingJobs.length === 0) return
        const job = this.pendingJobs.shift()
        this.runningJob = true
        this.runAnalyzeJob(job.params)
            .then(job.resolve)
            .catch(job.reject)
            .finally(() => {
                this.runningJob = false
                this.drainQueue()
            })
    }

    async runAnalyzeJob({ fen, depth = 14, multipv = 2 }) {
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
    return rawLines.map((line) => {
        const player_score = scoreFromEngineLine({
            cp: line.cp,
            mate: line.mate,
            fen,
            playerColor,
        })
        const pvSan = uciPvToSan(fen, line.pvUci)
        const headUci = line.pvUci?.[0] || ''
        const headSan = pvSan[0] || (headUci.length >= 4 ? `${headUci.slice(0, 2)}-${headUci.slice(2, 4)}` : headUci)
        return {
            rank: line.rank,
            depth: line.depth,
            player_score: {
                kind: player_score.kind,
                cp: player_score.cp,
                mate: player_score.mate,
            },
            san: headSan,
            pv_san: pvSan,
        }
    })
}

export { CancelledError }
