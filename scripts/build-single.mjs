import { build } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

process.env.VITE_USE_MOCK = 'true'
process.env.VITE_WEB_APP_URL = ''
process.env.VITE_API_TOKEN = ''

await build({ configFile: 'vite.config.ts', logLevel: 'info' })

const root = process.cwd()
const dist = join(root, 'dist')
let html = readFileSync(join(dist, 'index.html'), 'utf8')

const jsMatch = html.match(/<script type="module"[^>]*src="\.\/(assets\/[^"]+)"/)
const cssMatch = html.match(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+)"/)
if (!jsMatch || !cssMatch) throw new Error('Could not find bundled assets in index.html')

const js = readFileSync(join(dist, jsMatch[1]), 'utf8')
const css = readFileSync(join(dist, cssMatch[1]), 'utf8')
const favicon = readFileSync(join(dist, 'favicon.svg'), 'utf8')
  .replace(/"/g, "'")
  .replace(/\s+/g, ' ')

function replaceRange(source, start, end, replacement) {
  return source.slice(0, start) + replacement + source.slice(end)
}

const iconStart = html.indexOf('<link rel="icon"')
const iconEnd = html.indexOf('>', iconStart) + 1
html = replaceRange(html, iconStart, iconEnd, `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}" />`)

const cssStart = html.indexOf('<link rel="stylesheet"')
const cssEnd = html.indexOf('>', cssStart) + 1
html = replaceRange(html, cssStart, cssEnd, `<style>\n${css}\n</style>`)

const scriptStart = html.indexOf('<script type="module"')
const scriptClose = html.indexOf('</script>', scriptStart)
const scriptEnd = scriptClose + '</script>'.length
html = replaceRange(html, scriptStart, scriptEnd, `<script type="module">\n${js}\n</script>`)

const output = join(root, 'Temple Management.html')
writeFileSync(output, html)
console.log(`Wrote single-file app: ${output} (${(html.length / 1024).toFixed(0)} KB)`)