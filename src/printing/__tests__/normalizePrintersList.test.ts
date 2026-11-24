import { getPrintersByDriver, normalizePrintersList } from '../printerList'

describe('generic ESC/POS catalog', () => {
  it('lists a single bluetooth ESC/POS model for the generic driver', () => {
    expect(getPrintersByDriver('generic')).toEqual([
      { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append' }
    ])
  })
})

describe('normalizePrintersList', () => {
  it('keeps the generic driver with append printMode', () => {
    const list = normalizePrintersList([
      { model: 'ESC/POS (Bluetooth)', driver: 'generic', type: 1, paperWidthMm: 58 }
    ])
    expect(list[0].driver).toBe('generic')
    expect(list[0].printMode).toBe('append')
    expect(list[0].paperWidthMm).toBe(58)
  })

  it('defaults missing driver to star and epson printMode to append', () => {
    const list = normalizePrintersList([
      { model: 'mPOP', type: 1 },
      { model: 'TM-T20III', driver: 'epson', type: 2 }
    ])
    expect(list[0].driver).toBe('star')
    expect(list[0].paperWidthMm).toBe(80)
    expect(list[1].driver).toBe('epson')
    expect(list[1].printMode).toBe('append')
    expect(list[1].paperWidthMm).toBe(80)
  })

  it('preserves supported paper widths and defaults invalid values', () => {
    const list = normalizePrintersList([
      { model: 'mPOP', paperWidthMm: 58 },
      { model: 'TM-T20III', paperWidthMm: 42 }
    ])

    expect(list[0].paperWidthMm).toBe(58)
    expect(list[1].paperWidthMm).toBe(80)
  })

  it('returns empty array for invalid input', () => {
    expect(normalizePrintersList(null)).toEqual([])
    expect(normalizePrintersList(undefined)).toEqual([])
  })
})
