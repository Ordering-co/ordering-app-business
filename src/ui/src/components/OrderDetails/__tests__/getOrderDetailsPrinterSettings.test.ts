import { getOrderDetailsPrinterSettings } from '../getOrderDetailsPrinterSettings'

describe('getOrderDetailsPrinterSettings', () => {
  it('clears printerSettings when storage has no printers', () => {
    expect(getOrderDetailsPrinterSettings({
      printers: null,
      autoPrint: false
    })).toEqual({
      printerSettings: '',
      autoPrintEnabled: false
    })
  })

  it('clears printerSettings for an empty list so Accept cannot auto-print', () => {
    expect(getOrderDetailsPrinterSettings({
      printers: [],
      autoPrint: true
    })).toEqual({
      printerSettings: '',
      autoPrintEnabled: true
    })
  })

  it('keeps the stored printer list and auto-print flag', () => {
    const result = getOrderDetailsPrinterSettings({
      printers: [{ model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.2' }],
      autoPrint: true
    })

    expect(result.autoPrintEnabled).toBe(true)
    expect(Array.isArray(result.printerSettings)).toBe(true)
    expect(result.printerSettings).toHaveLength(1)
    expect(result.printerSettings[0].model).toBe('TM-T20III')
    expect(result.printerSettings[0].driver).toBe('epson')
  })
})
