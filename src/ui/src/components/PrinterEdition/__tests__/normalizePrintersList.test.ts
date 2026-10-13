import { normalizePrintersList } from '../printerList'

describe('normalizePrintersList', () => {
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
