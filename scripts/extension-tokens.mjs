import { readFile, writeFile } from 'node:fs/promises'

const css = await readFile(new URL('../app/globals.css', import.meta.url), 'utf8')
const names = ['page', 'paper', 'screen', 'ink', 'muted', 'line', 'tomato', 'tomato-hover', 'shadow']
const tokens = names.map(name => {
  const value = css.match(new RegExp(`--pixel-${name}:\\s*([^;]+);`))?.[1]
  if (!value) throw new Error(`Missing --pixel-${name} in app/globals.css`)
  return `  --pixel-${name}: ${value};`
})
await writeFile(new URL('../chrome-extension/tokens.css', import.meta.url),
  `/* Generated from app/globals.css; refresh with npm run extension:tokens. */\n:root {\n${tokens.join('\n')}\n}\n`)
