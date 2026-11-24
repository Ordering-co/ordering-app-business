#!/usr/bin/env node
// The editor's labels of this schema against the Dashboard's catalog.
//
//   node scripts/theme/labels.mjs --catalog <ordering-dashboard>/i18n/translations.json [--other <product.schema.json> ...] [--markdown] [--json]
//
// Every `{ key, default }` of a `label` or an `info` of `product.schema.json` is a text of the theme editor. The Dashboard
// writes it from its own catalog by the key and falls back to the schema's English only for a key it does not have. So:
//
// - a key the catalog already has with ANOTHER English text is a conflict: the editor would show the other product's words.
//   Adopt the catalog's text (the same thing) or make a key of this schema's own (another thing). Exit code 1.
// - a key the catalog does not have is to be added there (`--markdown` writes the table of docs/theme/editor-labels.md,
//   `--json` the `{ key: english }` map to add). `--other` marks the ones another product's schema also has (its own pull
//   request to the Dashboard may add them first).
import fs from 'node:fs'

const args = process.argv.slice(2)
const option = (name) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined }
const all = (name) => args.flatMap((arg, at) => (arg === name ? [args[at + 1]] : []))
const catalogPath = option('--catalog')
if (!catalogPath) { console.error('usage: labels.mjs --catalog <dashboard i18n/translations.json> [--other <schema>] [--markdown|--json]'); process.exit(2) }

const labelsOf = (file) => {
  const found = new Map()
  const walk = (node, path) => {
    if (Array.isArray(node)) { node.forEach((item) => walk(item, path)); return }
    if (!node || typeof node !== 'object') return
    if (typeof node.key === 'string' && node.key.startsWith('BUILDER_') && typeof node.default === 'string') {
      const where = path.filter((part) => part !== '$extensions' && part !== 'co.ordering.editor' && part !== 'co.ordering').join('.')
      if (!found.has(node.key)) found.set(node.key, { text: node.default, where, texts: new Set() })
      found.get(node.key).texts.add(node.default)
    }
    for (const [key, value] of Object.entries(node)) walk(value, [...path, key])
  }
  walk(JSON.parse(fs.readFileSync(file, 'utf8')), [])
  return found
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'))
const english = (key) => (catalog[key] && typeof catalog[key] === 'object' ? catalog[key].en : catalog[key])
const mine = labelsOf('product.schema.json')
const others = all('--other').map(labelsOf)

const twice = [...mine].filter(([, label]) => label.texts.size > 1)
const conflicts = [...mine].filter(([key, label]) => english(key) !== undefined && english(key) !== label.text)
const missing = [...mine].filter(([key]) => english(key) === undefined).sort(([a], [b]) => a.localeCompare(b))

if (args.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(missing.map(([key, label]) => [key, label.text])), null, 2))
} else if (args.includes('--markdown')) {
  const kinds = [
    ['Components', /^BUILDER_THEME_COMPONENT_/], ['Properties', /^BUILDER_THEME_PROP_/], ['Slots (pieces)', /^BUILDER_THEME_SLOT_/],
    ['Variants', /^BUILDER_THEME_VARIANT_/], ['Visibility', /^BUILDER_THEME_VIS_/], ['Pages and sections', /^BUILDER_THEME_PAGE_/]
  ]
  const rest = missing.filter(([key]) => !kinds.some(([, match]) => match.test(key)))
  for (const [title, rows] of [...kinds.map(([name, match]) => [name, missing.filter(([key]) => match.test(key))]), ['Other (help texts, options, groups, shapes)', rest]]) {
    if (!rows.length) continue
    console.log(`## ${title} (${rows.length})\n\n| Key | English | Where | Shared |\n|---|---|---|---|`)
    for (const [key, label] of rows) console.log(`| \`${key}\` | ${label.text} | \`${label.where}\` | ${others.some((other) => other.has(key)) ? 'yes' : ''} |`)
    console.log('')
  }
} else {
  console.log(`${mine.size} label keys in the schema; ${mine.size - missing.length - conflicts.length} already in the catalog with the same English; ${missing.length} to add (${missing.filter(([key]) => others.some((other) => other.has(key))).length} of them also in another product's schema).`)
}
for (const [key, label] of twice) console.error(`TWO TEXTS in this schema: ${key}: ${[...label.texts].join(' | ')}`)
for (const [key, label] of conflicts) console.error(`CONFLICT ${key}: the schema says "${label.text}" (${label.where}), the catalog says "${english(key)}"`)
process.exit(twice.length || conflicts.length ? 1 : 0)
