#!/usr/bin/env node
// `theme:reads` (run in CI): every read of the theme in the code names something the theme has.
//
// `keys.mjs` checks that every key of the schema has a reader; this is the other direction. A read of a key the schema does not
// have fails silently: `themeVisible(theme, 'orders.timer')` is always true, `themePart(theme, 'card', 'base.paddin')` is
// undefined, and the piece can never be changed from the editor. Checked against the build's own defaults, as the app paints them:
//
// - visibility keys: `themeVisible(theme, 'a.b')` and a `visible('a.b')` passed down;
// - the helpers' levels: `themeColor`, `themeSpace`, `themeRadius`, `themeBorder`, `themeShadow`, `themeControlHeight`,
//   `themeIconSize`, `themeOpacity`, `themeText`, `themeMotion` and their `…Css` twins;
// - `themePart(theme, 'component', 'path')`, `themeValue(theme, 'path')`, `themeImage(theme, 'key')`;
// - a whole chain written out: `theme.native.components.x.y`, `theme.values.x.y`.
import fs from 'node:fs'
import path from 'node:path'
import { resolve } from '@orderingco/ordering-theme-engine'
import { complete } from '@orderingco/ordering-theme-engine/runtime'
import { toNative } from '@orderingco/ordering-theme-engine/native'

const schema = JSON.parse(fs.readFileSync('product.schema.json', 'utf8'))
const compiled = JSON.parse(fs.readFileSync('src/theme.compiled.json', 'utf8'))
const resolved = resolve(schema, {})
const values = complete(compiled, resolved.values ?? resolved)
const native = toNative(compiled, values)

const has = (node, keys) => keys.every((key) => (node !== null && typeof node === 'object' && key in node ? ((node = node[key]), true) : false))
const TOKEN = { themeColor: 'color', themeSpace: 'space', spaceCss: 'space', themeRadius: 'radius', radiusCss: 'radius', themeBorderWidth: 'border', themeBorder: 'border', borderCss: 'border', themeShadow: 'shadow', shadowCss: 'shadow', themeControlHeight: 'size', themeIconSize: 'icon', themeOpacity: 'opacity', themeText: 'typography', textCss: 'typography', themeMotion: 'motion' }
// What ends a chain without being a key of the theme (a method or a property of the value).
const TAIL = new Set(['map', 'filter', 'forEach', 'reduce', 'length', 'includes', 'some', 'every', 'find', 'join', 'slice', 'keys', 'values', 'entries', 'toString', 'replace', 'split', 'trim'])
const ID = '[A-Za-z_$][\\w$]*'

const files = []
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { if (!full.includes(`${path.sep}@${path.sep}`) && entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full) } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full)
  }
}
walk('src')

const misses = []
let reads = 0
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  const check = (pattern, test) => {
    for (const match of source.matchAll(pattern)) {
      reads++
      const miss = test(match)
      if (miss) misses.push(`${file}:${source.slice(0, match.index).split('\n').length}  ${miss}`)
    }
  }
  check(new RegExp(`\\b(?:themeVisible\\(\\s*${ID}\\s*,|[vV]isible\\()\\s*'([a-z_]+(?:\\.[a-z_]+)*)'`, 'g'), (m) => (m[1] in values.visibility ? null : `visibility key '${m[1]}' is not in the schema`))
  check(new RegExp(`\\b(${Object.keys(TOKEN).join('|')})\\(\\s*${ID}\\s*,\\s*'([^']+)'`, 'g'), (m) => (has(native.tokens, [TOKEN[m[1]], m[2]]) ? null : `${m[1]}: tokens.${TOKEN[m[1]]}.${m[2]} does not exist`))
  check(new RegExp(`\\bthemePart\\(\\s*${ID}\\s*,\\s*'([^']+)'\\s*,\\s*'([^']+)'`, 'g'), (m) => (has(native.components, [m[1], ...m[2].split('.')]) ? null : `themePart: components.${m[1]}.${m[2]} does not exist`))
  check(new RegExp(`\\bthemeValue\\(\\s*${ID}\\s*,\\s*'([^']+)'`, 'g'), (m) => (has(values, m[1].split('.')) ? null : `themeValue: ${m[1]} does not exist`))
  check(new RegExp(`\\bthemeImage\\(\\s*${ID}\\s*,\\s*'([^']+)'`, 'g'), (m) => (m[1] in values.images ? null : `image '${m[1]}' is not in the schema`))
  check(new RegExp(`\\b[tT]heme\\.(native|values)((?:\\??\\.${ID})+)`, 'g'), (m) => {
    const keys = m[2].split(/\??\./).filter(Boolean)
    while (keys.length && TAIL.has(keys[keys.length - 1])) keys.pop()
    return has(m[1] === 'native' ? native : values, keys) ? null : `theme.${m[1]}.${keys.join('.')} does not exist`
  })
}

if (misses.length) {
  console.log(misses.join('\n'))
  console.log(`\n${misses.length} reads of something the theme does not have: use a key of the schema, or add the key (and its editor label).`)
  process.exit(1)
}
console.log(`ok: ${reads} reads of the theme in ${files.length} files, every one names something the theme has`)
