'use strict'

const { execFileSync } = require('node:child_process')
const path = require('node:path')
const { parseArgs } = require('node:util')
const { loadConfig } = require('./loadConfig.cjs')

const repo = path.resolve(__dirname, '..')
const maxKeys = 500
const text = value => typeof value === 'string' ? value.trim() : ''
const countLocales = rows => rows.reduce((total, row) => total + Object.keys(row.langs).length, 0)

function buildCorrections (base, catalog, config) {
  const translations = []
  for (const key of Object.keys(catalog).sort()) {
    if (!Object.hasOwn(base, key)) continue
    const previous = base[key]
    const current = catalog[key]
    const source = text(previous[config.sourceLanguage])
    if (!source || source !== text(current[config.sourceLanguage])) continue

    const langs = {}
    for (const locale of config.supportedLocales) {
      if (locale === config.sourceLanguage) continue
      const before = text(previous[locale])
      const after = text(current[locale])
      if (before && after && before !== after) langs[locale] = { before, after }
    }
    if (Object.keys(langs).length > 0) {
      translations.push({ key: config.prefix + key, value: source, langs })
    }
  }
  return { product: config.product, translations }
}

async function syncCorrections ({ product, translations }, { baseUrl, version = 'v400', syncKey }) {
  const totals = { created: 0, updated: 0, skipped: 0, protected: 0 }
  if (!translations.length) return totals
  if (!baseUrl || !syncKey) {
    throw new Error('--live requires ORDERING_API_BASE_URL and ORDERING_TRANSLATION_SYNC_KEY')
  }
  const url = `${baseUrl.replace(/\/+$/, '')}/${version}/system/bulks/translations`
  for (let offset = 0; offset < translations.length; offset += maxKeys) {
    const batch = translations.slice(offset, offset + maxKeys)
    const response = await fetch(url, {
      method: 'PATCH',
      redirect: 'error',
      signal: AbortSignal.timeout(60000),
      headers: { 'X-Translation-Sync-Key-X': syncKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ product, translations: batch })
    })
    if (!response.ok) throw new Error(`Translation corrections rejected (HTTP ${response.status})`)
    const json = await response.json()
    const sources = json.result?.translations
    const locales = json.result?.translation_lang
    if (json.error !== false || sources?.created !== 0 || sources?.updated !== 0 ||
      locales?.created !== 0 || !['updated', 'skipped', 'protected'].every(key => Number.isInteger(locales[key]) && locales[key] >= 0) ||
      locales.updated + locales.skipped !== countLocales(batch) || locales.protected > locales.skipped) {
      throw new Error('Unexpected existing-row sync result')
    }
    totals.updated += locales.updated
    totals.skipped += locales.skipped
    totals.protected += locales.protected
  }
  return totals
}

function readGitJson (commit, filename) {
  const prefix = commit + ':' + filename
  return JSON.parse(execFileSync('git', ['show', prefix], { cwd: repo, maxBuffer: 20000000 }))
}

async function main () {
  const { values } = parseArgs({ options: { base: { type: 'string' }, live: { type: 'boolean' } } })
  if (!/^[a-f0-9]{40}$/.test(values.base ?? '')) throw new Error('--base requires a Git commit SHA')
  execFileSync('git', ['merge-base', '--is-ancestor', values.base, 'HEAD'], { cwd: repo })
  const config = loadConfig()
  const baseConfig = readGitJson(values.base, 'i18n/config.json')
  if (['product', 'prefix', 'sourceLanguage'].some(key => baseConfig[key] !== config[key])) {
    throw new Error('Translation product, prefix or source language changed')
  }
  const filename = path.relative(repo, config.catalogPath)
  const payload = buildCorrections(readGitJson(values.base, filename), readGitJson('HEAD', filename), config)
  console.log(`Corrections: ${countLocales(payload.translations)} values across ${payload.translations.length} existing catalog keys`)
  if (!values.live) {
    console.log('OK dry-run (no HTTP)')
    return
  }
  const result = await syncCorrections(payload, {
    baseUrl: process.env.ORDERING_API_BASE_URL,
    version: process.env.ORDERING_API_VERSION || 'v400',
    syncKey: process.env.ORDERING_TRANSLATION_SYNC_KEY
  })
  console.log(`OK live sync complete. created=${result.created} updated=${result.updated} skipped=${result.skipped} protected=${result.protected}`)
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}

module.exports = { buildCorrections, syncCorrections }
