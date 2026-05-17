import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = process.cwd()
const indexPath = resolve(root, 'dist/index.html')
const fallbackPath = resolve(root, 'dist/404.html')

await mkdir(dirname(fallbackPath), { recursive: true })
await copyFile(indexPath, fallbackPath)

console.log('Created dist/404.html for GitHub Pages SPA fallback.')
