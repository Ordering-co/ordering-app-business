import { getStoredPrinterIndex } from '../getStoredPrinterIndex'

const kitchenA = {
  model: 'TM-T20III',
  ip: '10.0.0.1',
  portName: '10.0.0.1'
}

const kitchenB = {
  model: 'TM-T20III',
  ip: '10.0.0.2',
  portName: '10.0.0.2'
}

const printers = [kitchenA, kitchenB]

describe('getStoredPrinterIndex', () => {
  it('uses an in-range row index even when models match', () => {
    expect(getStoredPrinterIndex({
      printers,
      item: kitchenB,
      index: 1
    })).toBe(1)
  })

  it('does not fall back to the first same model when index is missing', () => {
    expect(getStoredPrinterIndex({
      printers,
      item: kitchenB
    })).toBe(1)
  })

  it('ignores an out-of-range index and matches by connection id', () => {
    expect(getStoredPrinterIndex({
      printers,
      item: kitchenB,
      index: 9
    })).toBe(1)
  })

  it('returns -1 when nothing matches', () => {
    expect(getStoredPrinterIndex({
      printers,
      item: { model: 'TM-T88V', portName: '10.0.0.9' }
    })).toBe(-1)
  })
})
