import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  AUTO_PRINT_STORAGE_KEY, PRINTERS_STORAGE_KEY, PRINTER_RESULTS_STORAGE_KEY, PRINTING_STORAGE_KEYS, TICKET_COPIES_STORAGE_KEY,
  clampCopies, getAutoPrint, getCopies, getLastResults, getTicketOptions, listPrinters, printerKey, recordResults,
  removePrinter, setAutoPrint, setCopies, setTicketOptions, storePrinter, subscribePrinting
} from '../storage'

const star = { model: 'TSP100IV', driver: 'star', printMode: 'append', type: 2, ip: '192.168.1.40', portName: '192.168.1.40', nickname: 'Kitchen', paperWidthMm: 80 }
const generic = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, bt: 'AA:BB', portName: 'AA:BB', portName1: 'AA:BB', nickname: 'Counter', paperWidthMm: 58 }

describe('what the printing module keeps on the device', () => {
  beforeEach(async () => { await AsyncStorage.clear() })

  it('keeps the old keys and adds only the copies and the results', () => {
    expect(PRINTERS_STORAGE_KEY).toBe('printers')
    expect(AUTO_PRINT_STORAGE_KEY).toBe('auto_print_after_accept_order')
    expect(TICKET_COPIES_STORAGE_KEY).toBe('ticket_copies')
    expect([...PRINTING_STORAGE_KEYS]).toEqual(['printers', 'auto_print_after_accept_order', 'ticket_print_options', 'ticket_copies', 'printer_last_results'])
  })

  it('lists the printers an install already has, legacy ones as Star at 80 mm', async () => {
    await AsyncStorage.setItem('printers', JSON.stringify([{ model: 'mPOP', type: 1, portName: 'AA:BB' }]))
    expect(await listPrinters()).toEqual([expect.objectContaining({ model: 'mPOP', driver: 'star', paperWidthMm: 80 })])
    await AsyncStorage.removeItem('printers')
    expect(await listPrinters()).toEqual([])
  })

  it('adds, updates and removes a printer through the old save, and tells the listeners', async () => {
    const listener = jest.fn()
    const stop = subscribePrinting(listener)
    await storePrinter({ item: star, type: 2, ip: '192.168.1.40', index: null, isAdd: true })
    await storePrinter({ item: generic, type: 1, ip: '', index: null, isAdd: true })
    expect((await listPrinters()).map((printer) => printer.nickname)).toEqual(['Kitchen', 'Counter'])

    await storePrinter({ item: { ...star, nickname: 'Pass' }, type: 2, ip: '192.168.1.40', index: 0, edit: true })
    expect((await listPrinters())[0].nickname).toBe('Pass')

    await removePrinter((await listPrinters())[0], 0)
    expect((await listPrinters()).map((printer) => printer.nickname)).toEqual(['Counter'])
    expect(listener).toHaveBeenCalledTimes(4)
    stop()
    await setAutoPrint(true)
    expect(listener).toHaveBeenCalledTimes(4)
  })

  it('stores the auto-print switch as the old screen did', async () => {
    expect(await getAutoPrint()).toBe(false)
    await setAutoPrint(true)
    expect(JSON.parse((await AsyncStorage.getItem('auto_print_after_accept_order')) as string)).toBe(true)
    expect(await getAutoPrint()).toBe(true)
  })

  it('stores the ticket options with their old key and shape', async () => {
    const saved = await setTicketOptions({ customerSection: false })
    expect(saved.customerSection).toBe(false)
    expect(Object.keys(JSON.parse((await AsyncStorage.getItem('ticket_print_options')) as string))).toHaveLength(25)
    expect((await getTicketOptions()).customerSection).toBe(false)
  })

  it('keeps the copies between 1 and 9', async () => {
    expect(await getCopies()).toBe(1)
    await setCopies(3)
    expect(await getCopies()).toBe(3)
    await setCopies(40)
    expect(await getCopies()).toBe(9)
    expect(clampCopies(0)).toBe(1)
    expect(clampCopies('x')).toBe(1)
  })

  it('records the last result of each printer by where it is, and forgets it with the printer', async () => {
    await storePrinter({ item: star, type: 2, ip: '192.168.1.40', index: null, isAdd: true })
    await recordResults([{ printer: star, result: { ok: false, at: 1000, message: 'Printer is offline.' } }])
    expect((await getLastResults())[printerKey(star)]).toEqual({ ok: false, at: 1000, message: 'Printer is offline.' })
    await recordResults([{ printer: star, result: { ok: true, at: 2000, test: true } }])
    expect((await getLastResults())[printerKey(star)]).toEqual({ ok: true, at: 2000, test: true })

    await removePrinter(star as any, 0)
    expect(await getLastResults()).toEqual({})
    expect(await AsyncStorage.getItem(PRINTER_RESULTS_STORAGE_KEY)).toBe('{}')
  })

  it('tells two printers apart by model and connection, not by the list order', () => {
    expect(printerKey(star)).not.toBe(printerKey({ ...star, ip: '192.168.1.41', portName: '192.168.1.41' }))
    expect(printerKey(star)).toBe(printerKey({ ...star, nickname: 'Renamed', paperWidthMm: 58 }))
  })
})
