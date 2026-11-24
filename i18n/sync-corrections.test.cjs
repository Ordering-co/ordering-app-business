'use strict'

const assert = require('node:assert/strict')
const { test } = require('node:test')
const { buildCorrections, syncCorrections } = require('./sync-corrections.cjs')

const config = {
  product: 'business_app',
  prefix: 'BUSINESS_APP_',
  sourceLanguage: 'en',
  supportedLocales: ['es', 'fr']
}

const base = {
  PICKUP: { en: 'Pickup', es: 'Levantar', fr: 'À emporter' },
  DELIVERY: { en: 'Delivery', es: 'Entrega' },
  NAME: { en: 'Name', es: 'Nombre', fr: 'Nom' },
  OLD: { en: 'Old', es: 'Antes' }
}

const catalog = {
  PICKUP: { en: 'Pickup', es: 'Recoger', fr: 'À emporter' },
  DELIVERY: { en: 'Delivery', es: 'Entrega', fr: 'Livraison' },
  NAME: { en: 'Store name', es: 'Nombre del comercio', fr: 'Nom du commerce' },
  NEW: { en: 'New', es: 'Nuevo' }
}

const payload = {
  product: 'business_app',
  translations: [{
    key: 'BUSINESS_APP_PICKUP',
    value: 'Pickup',
    langs: { es: { before: 'Levantar', after: 'Recoger' } }
  }]
}

test('the payload contains only changed locales that already existed with the same English source', () => {
  assert.deepEqual(buildCorrections(base, catalog, config), payload)
})

test('locale removal and whitespace-only changes send no corrections', () => {
  assert.deepEqual(buildCorrections(base, {
    PICKUP: { en: 'Pickup', es: ' Levantar ', fr: '' }
  }, config).translations, [])
})

test('live sync uses the existing-row PATCH contract and reports protected skips', async t => {
  const fetcher = t.mock.method(globalThis, 'fetch', async () => Response.json({
    error: false,
    result: {
      translations: { created: 0, updated: 0, skipped: 1 },
      translation_lang: { created: 0, updated: 0, skipped: 1, protected: 1 }
    }
  }))
  const result = await syncCorrections(payload, {
    baseUrl: 'https://api.example.invalid/', version: 'v400', syncKey: 'fixture'
  })
  assert.equal(fetcher.mock.callCount(), 1)
  const [url, request] = fetcher.mock.calls[0].arguments
  assert.equal(url, 'https://api.example.invalid/v400/system/bulks/translations')
  assert.equal(request.method, 'PATCH')
  assert.equal(request.redirect, 'error')
  assert.deepEqual(JSON.parse(request.body), payload)
  assert.deepEqual(result, { created: 0, updated: 0, skipped: 1, protected: 1 })
})

test('an API without the PATCH route fails without trying the bulk upsert', async t => {
  const fetcher = t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 405 }))
  await assert.rejects(syncCorrections(payload, {
    baseUrl: 'https://api.example.invalid', version: 'v400', syncKey: 'fixture'
  }), /HTTP 405/)
  assert.equal(fetcher.mock.callCount(), 1)
  assert.equal(fetcher.mock.calls[0].arguments[1].method, 'PATCH')
})
