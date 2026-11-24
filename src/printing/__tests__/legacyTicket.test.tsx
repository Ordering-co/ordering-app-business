import '../../../jest/helpers/registerB6PrinterMocks'

import { Platform } from 'react-native'
import { renderHook } from '@testing-library/react-native'

jest.mock('../EpsonPrinterAdapter', () => ({
  printEpsonLan: jest.fn(),
  printEpsonBluetooth: jest.fn(),
  printEpsonUsb: jest.fn(),
  discoverEpsonPrinters: jest.fn(),
  pickEpsonDiscoveryIdentifier: jest.fn()
}))

jest.mock('@components', () => {
  const mockOrdering = require('../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useToast: () => [null, { showToast: jest.fn() }],
    useUtils: jest.fn(() => [{
      parsePrice: (v: any) => `$${Number(v ?? 0).toFixed(2)}`,
      parseNumber: (v: any) => Number(v ?? 0),
      parseDate: (v: any) => String(v ?? '')
    }, {}])
  }
})

import { usePrinterCommands } from '../usePrinterCommands'

const { legacyTicketOrders, legacyTicketWidths } = require('../../../jest/fixtures/legacyTicketOrders')
const golden: Record<string, string> = require('../../../jest/fixtures/legacyTicketGolden.json')

/**
 * The Star and Epson ticket, character by character. The fixture was captured from the text printed before generic
 * printers existed; since 2026-11-24 a long value (the delivery date, an address, a note) breaks at whole words in it
 * (the owner's decision: it was cut every N characters, one past the paper on the first line). Nothing else changed:
 * the same characters, in the same order, on other lines.
 */
describe('Star and Epson ticket text', () => {
  const originalOs = Platform.OS

  afterEach(() => {
    Platform.OS = originalOs
  })

  for (const os of ['ios', 'android']) {
    for (const { name, order } of legacyTicketOrders) {
      for (const width of legacyTicketWidths) {
        const key = `${os} | ${name} | ${width ?? 'default'}`

        it(`matches the captured ticket: ${key}`, () => {
          Platform.OS = os as any
          const { result } = renderHook(() => usePrinterCommands())

          expect(result.current.generateCommands(order, width)).toBe(golden[key])
        })
      }
    }
  }

  it('covers every captured ticket', () => {
    expect(Object.keys(golden)).toHaveLength(2 * legacyTicketOrders.length * legacyTicketWidths.length)
  })
})
