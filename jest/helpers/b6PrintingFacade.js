/**
 * A stand-in for what `usePrinting()` returns, for the printers screens' tests: the screens are tested for what they
 * ask of the facade and what they show of its answers (the facade has its own tests).
 */
/* eslint-env jest */
const { printerKey } = require('../../src/printing/storage')

const optionsDefaults = require('../../src/printing/ticketPrintOptions').DEFAULT_TICKET_PRINT_OPTIONS

const okOutcome = (printer) => ({ printer, key: printerKey(printer), ok: true, at: 1 })

const makePrinting = (overrides = {}) => {
  const printers = overrides.printers ?? []
  const results = overrides.results ?? {}
  return {
    loaded: true,
    printers,
    autoPrint: false,
    autoTargets: [],
    options: optionsDefaults,
    copies: 1,
    results,
    resultOf: jest.fn((printer) => results[printerKey(printer)]),
    hasGenericPrinter: printers.some((printer) => printer.driver === 'generic'),
    reload: jest.fn(),
    ticketText: jest.fn((order, { printer } = {}) => `TICKET ${order?.id ?? ''} ${printer?.driver ?? 'default'}`),
    print: jest.fn(async ({ printers: targets }) => targets.map(okOutcome)),
    printOrder: jest.fn(async () => []),
    testPrint: jest.fn(async (printer) => ({ ...okOutcome(printer), at: 1000 })),
    exportPdf: jest.fn(async () => ({ ok: true })),
    systemPrint: jest.fn(async () => ({ ok: true })),
    discover: jest.fn(async () => ({ devices: [] })),
    warm: jest.fn(),
    host: null,
    ...overrides
  }
}

module.exports = { makePrinting, okOutcome }
