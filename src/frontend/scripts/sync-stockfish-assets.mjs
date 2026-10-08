import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const srcDir = path.join(root, 'node_modules', 'stockfish', 'bin')
const destDir = path.join(root, 'public', 'stockfish')
const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']

if (!fs.existsSync(srcDir)) {
    console.warn('[sync-stockfish] stockfish npm package not installed; skip')
    process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })
for (const name of files) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name))
}
console.log('[sync-stockfish] copied lite-single engine to public/stockfish/')
