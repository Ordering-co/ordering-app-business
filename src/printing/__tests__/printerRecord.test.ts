import { CONNECTION } from '../discovery'
import { getPrintersByDriver } from '../printerList'
import {
  buildPrinterItem, isValidAddress, needsBitmapCanvas, printerAddress, printerSummary, ticketColumns
} from '../printerRecord'

const t = (_key: string, fallback: string) => fallback
const catalog = (driver: any, model: string) => getPrintersByDriver(driver).find((item) => item.model === model)!

describe('the record a wizard saves', () => {
  it('is the shape the old form saved for a LAN printer', () => {
    expect(buildPrinterItem({ catalog: catalog('star', 'TSP100IV'), nickname: 'Kitchen', paperWidthMm: 80, connection: CONNECTION.LAN, address: ' 192.168.1.40 ' })).toEqual({
      model: 'TSP100IV',
      driver: 'star',
      emulation: 'StarLine',
      printMode: 'append',
      paperWidthMm: 80,
      nickname: 'Kitchen',
      type: 2,
      ip: '192.168.1.40',
      bt: '',
      portName1: '',
      portName: '192.168.1.40'
    })
  })

  it('keeps the Bluetooth identifier in `bt`, `portName1` and `portName`', () => {
    const item = buildPrinterItem({ catalog: catalog('epson', 'TM-m30II'), nickname: '', paperWidthMm: 58, connection: CONNECTION.BLUETOOTH, address: '00:22:15:7D:70:9C' })
    expect(item).toMatchObject({ type: 1, ip: '', bt: '00:22:15:7D:70:9C', portName1: '00:22:15:7D:70:9C', portName: '00:22:15:7D:70:9C', paperWidthMm: 58, nickname: 'TM-m30II', driver: 'epson' })
  })

  it('uses the placeholder USB when the target is not known, and drops the catalog\'s Bluetooth hint', () => {
    expect(buildPrinterItem({ catalog: catalog('epson', 'TM-T20III'), nickname: 'Counter', paperWidthMm: 80, connection: CONNECTION.USB, address: '' })).toMatchObject({ type: 3, portName: 'USB', ip: '', bt: '' })
    const bsc = buildPrinterItem({ catalog: catalog('star', 'BSC10'), nickname: 'x', paperWidthMm: 80, connection: CONNECTION.LAN, address: '10.0.0.5' })
    expect(bsc.bt).toBe('')
  })

  it('gives back the address a stored printer is reached at', () => {
    expect(printerAddress({ type: 2, ip: '10.0.0.5', portName: '10.0.0.5' })).toBe('10.0.0.5')
    expect(printerAddress({ type: 1, bt: 'AA:BB', portName: 'AA:BB' })).toBe('AA:BB')
    expect(printerAddress({ type: 3, portName: 'USB' })).toBe('')
    expect(printerAddress({ type: 3, portName: 'USB:001' })).toBe('USB:001')
  })
})

describe('what an address must look like', () => {
  it('needs an IPv4 for a LAN printer and a Bluetooth identifier for Bluetooth; USB needs none', () => {
    expect(isValidAddress(CONNECTION.LAN, '192.168.1.40')).toBe(true)
    expect(isValidAddress(CONNECTION.LAN, '192.168.1.400')).toBe(false)
    expect(isValidAddress(CONNECTION.BLUETOOTH, '00-11-62-06-CA-4D')).toBe(true)
    expect(isValidAddress(CONNECTION.BLUETOOTH, 'not valid!')).toBe(false)
    expect(isValidAddress(CONNECTION.USB, '')).toBe(true)
  })
})

describe('how a printer is named on its card', () => {
  it('says brand, model, connection with its address, and paper', () => {
    expect(printerSummary({ driver: 'star', model: 'TSP100', type: 2, ip: '192.168.1.40', portName: '192.168.1.40', paperWidthMm: 80 }, t))
      .toBe('Star TSP100 · LAN 192.168.1.40 · 80 mm')
    expect(printerSummary({ driver: 'generic', model: 'ESC/POS (Bluetooth)', type: 1, bt: 'AA:BB', paperWidthMm: 58 }, t))
      .toBe('Generic ESC/POS · Bluetooth · 58 mm')
    expect(printerSummary({ driver: 'epson', model: 'TM-T20III', type: 3, portName: 'USB' }, t)).toBe('Epson TM-T20III · USB · 80 mm')
  })
})

describe('what a ticket needs from the printers', () => {
  it('needs the canvas only for a Star printer that prints a picture (the TSP100)', () => {
    expect(needsBitmapCanvas([{ driver: 'star', model: 'TSP100', printMode: 'appendBitmapText' }])).toBe(true)
    expect(needsBitmapCanvas([{ driver: 'star', model: 'TSP100IV', printMode: 'append' }, { driver: 'epson', model: 'TM-T20III' }, { driver: 'generic' }])).toBe(false)
    expect(needsBitmapCanvas([])).toBe(false)
  })

  it('breaks a ticket at the columns the print path uses for that brand and paper', () => {
    expect(ticketColumns({ driver: 'star', paperWidthMm: 80 })).toBe(37)
    expect(ticketColumns({ driver: 'epson', paperWidthMm: 58 })).toBe(24)
    expect(ticketColumns({ driver: 'generic', paperWidthMm: 80 })).toBe(48)
    expect(ticketColumns({ driver: 'generic', paperWidthMm: 58 })).toBe(32)
    expect(ticketColumns(undefined)).toBe(37)
  })
})
