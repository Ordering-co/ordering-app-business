'use strict'

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { test } = require('node:test')

test('verify rejects the Spanish Pickup regression', (t) => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'business-i18n-verify-'))
  t.after(() => fs.rmSync(fixture, { recursive: true, force: true }))
  fs.mkdirSync(path.join(fixture, 'i18n'))
  fs.mkdirSync(path.join(fixture, 'src'))

  const scripts = [
    'verify.cjs', 'scanKeys.cjs', 'loadConfig.cjs', 'isRuntimeVariable.cjs',
    'translateKeysHint.cjs', 'config.json', 'glossary.json'
  ]
  for (const file of scripts) {
    fs.copyFileSync(path.join(__dirname, file), path.join(fixture, 'i18n', file))
  }
  fs.writeFileSync(path.join(fixture, 'src', 'order.js'), "t('PICKUP', 'Pickup')\n")
  const catalogPath = path.join(fixture, 'i18n', 'translations.json')
  const catalog = require('./translations.json')
  const verify = (value) => {
    catalog.PICKUP.es = value
    fs.writeFileSync(catalogPath, JSON.stringify(catalog))
    const result = spawnSync(process.execPath, ['i18n/verify.cjs'], {
      cwd: fixture,
      encoding: 'utf8'
    })
    assert.ifError(result.error)
    return result
  }

  const correct = verify('Recoger')
  assert.equal(correct.status, 0, correct.stderr)
  const regressed = verify('Levantar')
  assert.equal(regressed.status, 1, regressed.stdout + regressed.stderr)
  assert.match(regressed.stderr, /glossary mismatch for PICKUP \(es\)/)
})
