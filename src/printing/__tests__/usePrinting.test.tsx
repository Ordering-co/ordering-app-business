import '../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { Platform, Share } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../usePrinterCommands', () => {
  const { usePrinterCommandsMockApi } = require('../../../jest/helpers/b6PrinterDefaults')
  return { usePrinterCommands: () => usePrinterCommandsMockApi }
})

// A real toast state, so what a print path tells the user (an error toast) reaches the facade as it does in the app.
let mockSetToast: (toast: any) => void = () => {}
jest.mock('@components', () => {
  const React = require('react')
  const mockOrdering = require('../../../jest/helpers/mockOrdering')
  const ToastCtx = React.createContext([null, { showToast: jest.fn() }])
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useToast: () => React.useContext(ToastCtx),
    __ToastCtx: ToastCtx
  }
})

import { generatePDF } from 'react-native-html-to-pdf'
import RNPrint from 'react-native-print'
import * as components from '@components'
import { usePrinterCommands } from '../usePrinterCommands'
import { CANVAS_WAIT_MS, PRINT_TIMEOUT_MS, usePrinting } from '../usePrinting'
import { getLastResults, listPrinters, setAutoPrint, setCopies, storePrinter, printerKey } from '../storage'
import { sampleTicketOrder, samplePrinterBt, samplePrinterLan, samplePrinterEpsonLan } from '../../../jest/helpers/b6PrinterDefaults'

const api = usePrinterCommands() as any
const Ctx = (components as any).__ToastCtx

const Wrapper = ({ children }: any) => {
  const [toast, setToast] = React.useState<any>(null)
  mockSetToast = setToast
  return <Ctx.Provider value={[toast, { showToast: jest.fn() }]}>{children}</Ctx.Provider>
}

const hook = async () => {
  const view = renderHook(() => usePrinting(), { wrapper: Wrapper })
  await waitFor(() => expect(view.result.current.loaded).toBe(true))
  return view
}

const withPrinters = async (...printers: any[]) => {
  for (const printer of printers) {
    await storePrinter({ item: printer, type: printer.type, ip: printer.ip, index: null, isAdd: true })
  }
}

describe('usePrinting: printing an order', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    api.printButton.mockReset().mockResolvedValue(true)
  })

  it('prints on each printer through the unchanged print path, one outcome each, and stores the results', async () => {
    await withPrinters(samplePrinterBt, samplePrinterEpsonLan)
    const { result } = await hook()
    let outcomes: any[] = []
    await act(async () => { outcomes = await result.current.print({ order: sampleTicketOrder }) })

    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, true])
    expect(api.printButton).toHaveBeenCalledTimes(2)
    expect(api.printButton).toHaveBeenCalledWith(expect.objectContaining({ driver: 'star', type: 1, showAlert: false, deviceName: 'mPOP' }))
    expect(api.printButton).toHaveBeenCalledWith(expect.objectContaining({ driver: 'epson', type: 2, ip: '192.168.1.80', showAlert: false }))
    const stored = await getLastResults()
    expect(stored[printerKey(samplePrinterBt)]).toEqual({ ok: true, at: expect.any(Number) })
    expect(stored[printerKey(samplePrinterEpsonLan)]).toEqual({ ok: true, at: expect.any(Number) })
    await waitFor(() => expect(result.current.resultOf(samplePrinterBt)?.ok).toBe(true))
  })

  it('says why a ticket failed: what the print path told the user', async () => {
    await withPrinters(samplePrinterBt)
    api.printButton.mockImplementationOnce(async () => {
      act(() => mockSetToast({ type: 'error', message: 'Printer is out of paper.' }))
      return false
    })
    const { result } = await hook()
    // Outside `act`, as the app runs: the toast the print path shows reaches the hook as a render.
    const outcomes: any[] = await result.current.print({ order: sampleTicketOrder })

    expect(outcomes[0]).toMatchObject({ ok: false, message: 'Printer is out of paper.' })
    expect((await getLastResults())[printerKey(samplePrinterBt)]).toMatchObject({ ok: false, message: 'Printer is out of paper.' })
    await waitFor(() => expect(result.current.resultOf(samplePrinterBt)?.ok).toBe(false))
  })

  it('falls back to the print failure text when the print path said nothing', async () => {
    await withPrinters(samplePrinterBt)
    api.printButton.mockResolvedValueOnce(false)
    const { result } = await hook()
    let outcomes: any[] = []
    await act(async () => { outcomes = await result.current.print({ order: sampleTicketOrder }) })
    expect(outcomes[0].message).toBe('Order not printed, connection failed')
  })

  it('ends a print that never answers with a timeout error, so the button never spins forever', async () => {
    jest.useFakeTimers()
    try {
      await withPrinters(samplePrinterBt)
      api.printButton.mockImplementationOnce(() => new Promise(() => {}))
      const { result } = await hook()
      let outcomes: any[] = []
      const done = act(async () => { outcomes = await result.current.print({ order: sampleTicketOrder }) })
      await act(async () => { await jest.advanceTimersByTimeAsync(PRINT_TIMEOUT_MS + 10) })
      await done
      expect(outcomes[0]).toMatchObject({ ok: false, message: 'Printer timed out. Check the network and try again.' })
    } finally {
      jest.useRealTimers()
    }
  })

  it('prints each copy, and stops giving copies to a printer that fails', async () => {
    await withPrinters(samplePrinterBt, samplePrinterEpsonLan)
    api.printButton
      .mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(true) // bt copies 1-3
      .mockResolvedValueOnce(true).mockResolvedValueOnce(false) // epson: copy 1 ok, copy 2 fails
    const { result } = await hook()
    let outcomes: any[] = []
    await act(async () => { outcomes = await result.current.print({ order: sampleTicketOrder, copies: 3 }) })
    expect(api.printButton).toHaveBeenCalledTimes(5)
    expect(outcomes.map((outcome) => outcome.ok)).toEqual([true, false])
  })

  it('prints nothing without printers or an order', async () => {
    const { result } = await hook()
    await act(async () => {
      expect(await result.current.print({ order: sampleTicketOrder })).toEqual([])
      expect(await result.current.print({ order: null, printers: [samplePrinterBt] as any })).toEqual([])
    })
    expect(api.printButton).not.toHaveBeenCalled()
  })

  it('fails a Star TSP100 ticket when the canvas that draws it never comes up', async () => {
    jest.useFakeTimers()
    try {
      await withPrinters(samplePrinterLan)
      const { result } = await hook()
      let outcomes: any[] = []
      const done = act(async () => { outcomes = await result.current.print({ order: sampleTicketOrder }) })
      await act(async () => { await jest.advanceTimersByTimeAsync(CANVAS_WAIT_MS + 200) })
      await done
      expect(outcomes[0]).toMatchObject({ ok: false })
      expect(api.printButton).not.toHaveBeenCalled()
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('usePrinting: printing after an accept', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    api.printButton.mockReset().mockResolvedValue(true)
  })

  it('prints nothing while the auto-print switch is off', async () => {
    await withPrinters(samplePrinterBt)
    const { result } = await hook()
    await act(async () => { expect(await result.current.printOrder({ ...sampleTicketOrder, status: 7 })).toEqual([]) })
    expect(api.printButton).not.toHaveBeenCalled()
  })

  it('prints nothing with the switch on and no printer', async () => {
    await setAutoPrint(true)
    const { result } = await hook()
    await act(async () => { expect(await result.current.printOrder(sampleTicketOrder)).toEqual([]) })
  })

  it('reads the switch at the call, prints on every saved printer, the stored copies, with the banner meanwhile', async () => {
    await withPrinters(samplePrinterBt, samplePrinterEpsonLan)
    const { result } = await hook()
    expect(result.current.autoPrint).toBe(false)
    await act(async () => { await setAutoPrint(true); await setCopies(2) })

    let release: (value: boolean) => void = () => {}
    api.printButton.mockImplementationOnce(() => new Promise<boolean>((resolve) => { release = resolve }))
    let pending: Promise<any> = Promise.resolve()
    await act(async () => { pending = result.current.printOrder({ ...sampleTicketOrder, orderStatus: undefined, status: 7 }) })
    await waitFor(() => expect((result.current.host as any).props.banner).toBe(true))
    await act(async () => { release(true); await pending })

    expect(api.printButton).toHaveBeenCalledTimes(4)
    expect((result.current.host as any).props.banner).toBe(false)
    // The ticket carries the order's status text, which the caller need not fill.
    expect(api.generateCommands).toHaveBeenCalledWith(expect.objectContaining({ orderStatus: expect.any(String) }), expect.any(Number))
  })

  it('follows the switch and the printers as the settings screens change them', async () => {
    const { result } = await hook()
    expect(result.current.autoTargets).toEqual([])
    await act(async () => { await withPrinters(samplePrinterBt); await setAutoPrint(true) })
    await waitFor(() => expect(result.current.autoTargets).toHaveLength(1))
    expect(result.current.printers).toHaveLength(1)
  })
})

describe('usePrinting: the test ticket', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    api.printButton.mockReset().mockResolvedValue(true)
  })

  it('prints a short ticket naming the printer, and stores the result as a test', async () => {
    await withPrinters(samplePrinterEpsonLan)
    const { result } = await hook()
    let outcome: any
    await act(async () => { outcome = await result.current.testPrint((await listPrinters())[0]) })

    expect(outcome.ok).toBe(true)
    const call = api.printButton.mock.calls[0][0]
    expect(call).toMatchObject({ driver: 'epson', type: 2, ip: '192.168.1.80', showAlert: false, image: null })
    expect(call.commandsText).toContain('Test ticket')
    expect(call.commandsText).toContain('Epson kitchen')
    expect(call.commandsText.split('\n').length).toBeLessThan(10)
    expect((await getLastResults())[printerKey(samplePrinterEpsonLan)]).toMatchObject({ ok: true, test: true })
  })

  it('reports a failed test with its reason', async () => {
    await withPrinters(samplePrinterBt)
    api.printButton.mockImplementationOnce(async () => {
      act(() => mockSetToast({ type: 'error', message: 'Printer cover is open.' }))
      return false
    })
    const { result } = await hook()
    const outcome: any = await result.current.testPrint((await listPrinters())[0])
    expect(outcome).toMatchObject({ ok: false, message: 'Printer cover is open.' })
  })
})

describe('usePrinting: the ticket text', () => {
  beforeEach(async () => { await AsyncStorage.clear() })

  it('breaks the ticket where the printer will: the brand\'s text at its paper width', async () => {
    const { result } = await hook()
    result.current.ticketText(sampleTicketOrder, { printer: { driver: 'star', paperWidthMm: 80 } })
    expect(api.generateCommands).toHaveBeenLastCalledWith(expect.objectContaining({ id: 42 }), 37)
    result.current.ticketText(sampleTicketOrder, { printer: { driver: 'epson', paperWidthMm: 58 } })
    expect(api.generateCommands).toHaveBeenLastCalledWith(expect.objectContaining({ id: 42 }), 24)
    result.current.ticketText(sampleTicketOrder, { printer: { driver: 'generic', paperWidthMm: 58 }, options: { payments: false } })
    expect(api.generateGenericCommands).toHaveBeenLastCalledWith(expect.objectContaining({ id: 42 }), 32, expect.objectContaining({ payments: false, customerName: true }))
    result.current.ticketText(sampleTicketOrder)
    expect(api.generateCommands).toHaveBeenLastCalledWith(expect.objectContaining({ id: 42 }), 37)
    expect(result.current.ticketText(null)).toBe('')
  })
})

describe('usePrinting: discovery', () => {
  beforeEach(async () => { await AsyncStorage.clear() })

  it('returns every device the brand\'s discovery found', async () => {
    api.discoveryPrinterPort.mockResolvedValueOnce([
      { connectionSettings: { identifier: '192.168.1.40' }, information: { model: 'TSP100IV' } },
      { connectionSettings: { identifier: '192.168.1.52' }, information: { model: 'mC_Print3' } }
    ])
    const { result } = await hook()
    let found: any
    await act(async () => { found = await result.current.discover({ brand: 'star', connection: 2 }) })
    expect(api.discoveryPrinterPort).toHaveBeenCalledWith(2, 'star')
    expect(found.devices.map((device: any) => [device.id, device.model])).toEqual([['192.168.1.40', 'TSP100IV'], ['192.168.1.52', 'mC-Print3']])
    expect(found.message).toBeUndefined()
  })

  it('returns the discovery\'s own message when it found nothing', async () => {
    api.discoveryPrinterPort.mockResolvedValueOnce('Bluetooth permission is required to find printers.')
    const { result } = await hook()
    let found: any
    await act(async () => { found = await result.current.discover({ brand: 'epson', connection: 1 }) })
    // A refused system permission is flagged, so the wizard offers the settings.
    expect(found).toEqual({ devices: [], message: 'Bluetooth permission is required to find printers.', permissionDenied: true })
    api.discoveryPrinterPort.mockResolvedValueOnce('Bluetooth is off. Turn it on and try again.')
    await act(async () => { found = await result.current.discover({ brand: 'epson', connection: 1 }) })
    expect(found).toEqual({ devices: [], message: 'Bluetooth is off. Turn it on and try again.' })
    api.discoveryPrinterPort.mockRejectedValueOnce(new Error('boom'))
    await act(async () => { found = await result.current.discover({ brand: 'star', connection: 2 }) })
    expect(found).toEqual({ devices: [], message: 'boom' })
  })
})

describe('usePrinting: the ticket as a document', () => {
  beforeEach(async () => { await AsyncStorage.clear(); jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' }) })

  it('makes a PDF of the ticket text and shares it (iOS), with no printer saved', async () => {
    expect(Platform.OS).toBe('ios')
    api.generateCommands.mockReturnValueOnce('Order No. 42\n<b> & co')
    const { result } = await hook()
    let done: any
    await act(async () => { done = await result.current.exportPdf(sampleTicketOrder) })
    expect(done.ok).toBe(true)
    expect((generatePDF as jest.Mock).mock.calls[0][0]).toMatchObject({ fileName: 'order_42', base64: false })
    expect((generatePDF as jest.Mock).mock.calls[0][0].html).toContain('Order No. 42\n&lt;b&gt; &amp; co')
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file:///tmp/order_42.pdf' }))
  })

  it('hands the ticket to the system print dialog as HTML on Android, with no PDF library (its "Save as PDF" writes the file)', async () => {
    api.generateCommands.mockReturnValueOnce('Order No. 42\n<b> & co')
    const original = Platform.OS
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' })
    try {
      const { result } = await hook()
      let done: any
      await act(async () => { done = await result.current.exportPdf(sampleTicketOrder) })
      expect(done.ok).toBe(true)
      expect(generatePDF as jest.Mock).not.toHaveBeenCalled()
      expect(Share.share).not.toHaveBeenCalled()
      expect(RNPrint.print).toHaveBeenCalledWith({ html: expect.stringContaining('Order No. 42\n&lt;b&gt; &amp; co'), jobName: 'Order No. 42' })
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original })
    }
  })

  it('opens the system print dialog with the ticket', async () => {
    const { result } = await hook()
    let done: any
    await act(async () => { done = await result.current.systemPrint(sampleTicketOrder) })
    expect(done.ok).toBe(true)
    expect(RNPrint.print).toHaveBeenCalledWith(expect.objectContaining({ jobName: 'Order No. 42', html: expect.stringContaining('Order No. 42') }))
  })

  it('says the document failed instead of throwing', async () => {
    ;(RNPrint.print as jest.Mock).mockRejectedValueOnce(new Error('no dialog'))
    const { result } = await hook()
    let done: any
    await act(async () => { done = await result.current.systemPrint(sampleTicketOrder) })
    expect(done).toEqual({ ok: false, message: 'no dialog' })
  })
})
