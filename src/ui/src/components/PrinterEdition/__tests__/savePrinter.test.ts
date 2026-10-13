const mockRetrieve = jest.fn()
const mockSet = jest.fn()

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: (...args: any[]) => mockRetrieve(...args),
  _setStoreData: (...args: any[]) => mockSet(...args)
}))

import { savePrinter } from '../savePrinter'

describe('savePrinter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRetrieve.mockResolvedValue([])
    mockSet.mockResolvedValue(undefined)
  })

  it('adds an epson LAN printer with driver and ip portName', async () => {
    const list = await savePrinter({
      item: {
        model: 'TM-T20III',
        driver: 'epson',
        paperWidthMm: 58,
        bt: '',
        portName: '192.168.1.80'
      },
      type: 2,
      ip: '192.168.1.80',
      isAdd: true
    })

    expect(list).toHaveLength(1)
    expect(list[0].driver).toBe('epson')
    expect(list[0].type).toBe(2)
    expect(list[0].paperWidthMm).toBe(58)
    expect(list[0].portName).toBe('192.168.1.80')
    expect(mockSet).toHaveBeenCalledWith('printers', list)
  })

  it('adds an epson USB printer with USB portName', async () => {
    const list = await savePrinter({
      item: {
        model: 'TM-T20II',
        driver: 'epson',
        portName: 'USB:000000000000000000'
      },
      type: 3,
      isAdd: true
    })

    expect(list[0].driver).toBe('epson')
    expect(list[0].type).toBe(3)
    expect(list[0].portName).toBe('USB:000000000000000000')
  })

  it('migrates missing driver to star for legacy bluetooth printers', async () => {
    const list = await savePrinter({
      item: {
        model: 'mPOP',
        bt: '00:11:62:06:CA:4D',
        portName1: '00:11:62:06:CA:4D'
      },
      type: 1,
      isAdd: true
    })

    expect(list[0].driver).toBe('star')
    expect(list[0].portName).toBe('00:11:62:06:CA:4D')
  })

  it('deletes a printer when neither edit nor isAdd', async () => {
    mockRetrieve.mockResolvedValue([
      { model: 'TM-T20III', driver: 'epson', type: 2 }
    ])

    const list = await savePrinter({
      item: { model: 'TM-T20III' },
      index: 0
    })

    expect(list).toEqual([])
    expect(mockSet).toHaveBeenCalledWith('printers', [])
  })

  it('deletes the indexed same-model printer, not the first list entry', async () => {
    const kitchenA = { model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.1', portName: '10.0.0.1' }
    const kitchenB = { model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.2', portName: '10.0.0.2' }
    mockRetrieve.mockResolvedValue([kitchenA, kitchenB])

    const list = await savePrinter({
      item: kitchenB,
      index: 1
    })

    expect(list).toEqual([kitchenA])
  })

  it('deletes the matching connection when index is omitted', async () => {
    const kitchenA = { model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.1', portName: '10.0.0.1' }
    const kitchenB = { model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.2', portName: '10.0.0.2' }
    mockRetrieve.mockResolvedValue([kitchenA, kitchenB])

    const list = await savePrinter({
      item: kitchenB
    })

    expect(list).toEqual([kitchenA])
  })

  it('updates an existing printer in place on edit', async () => {
    mockRetrieve.mockResolvedValue([
      { model: 'TM-T20III', driver: 'epson', type: 2, ip: '10.0.0.1', nickname: 'Old' }
    ])

    const list = await savePrinter({
      item: {
        model: 'TM-T20III',
        driver: 'epson',
        nickname: 'Kitchen',
        bt: '',
        portName: '10.0.0.9'
      },
      type: 2,
      ip: '10.0.0.9',
      edit: true,
      index: 0
    })

    expect(list).toHaveLength(1)
    expect(list[0].nickname).toBe('Kitchen')
    expect(list[0].ip).toBe('10.0.0.9')
    expect(list[0].portName).toBe('10.0.0.9')
  })
})
