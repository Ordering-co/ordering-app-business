import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { AppState, Linking, Platform, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { makePrinting } from '../../../../../../jest/helpers/b6PrintingFacade'

jest.mock('../../../../../printing/usePrinting', () => ({
  usePrinting: jest.fn(),
  PRINT_TIMEOUT_MS: 45000,
  CANVAS_WAIT_MS: 10000,
  DISCOVERY_TIMEOUT_MS: 30000
}))
jest.mock('../../../../../printing/storage', () => ({
  ...jest.requireActual('../../../../../printing/storage'),
  storePrinter: jest.fn().mockResolvedValue([])
}))

import { usePrinting } from '../../../../../printing/usePrinting'
import { storePrinter } from '../../../../../printing/storage'
import { PrinterEdition } from '..'

const device = (id: string, name: string, model?: string, brand: any = 'star', connection: any = 2) => ({ id, name, model, brand, connection })
const tsp = device('192.168.1.40', 'TSP100IV', 'TSP100IV')
const mc = device('192.168.1.52', 'mC_Print3', 'mC-Print3')

const open = (props: any = {}, printing: any = makePrinting({ discover: jest.fn(async () => ({ devices: [tsp, mc] })) })) => {
  ;(usePrinting as jest.Mock).mockReturnValue(printing)
  const onClose = jest.fn()
  const view = renderWithProviders(<PrinterEdition onClose={onClose} {...props} />)
  return { onClose, printing, ...view }
}

const roomUnder = (bar: any) => {
  for (let up = bar.parent; up; up = up.parent) {
    const flat: any = up.props?.style ? StyleSheet.flatten(up.props.style) : null
    if (flat && flat.paddingBottom !== undefined) return flat.paddingBottom
  }
  return undefined
}

describe('the add wizard: step 1', () => {
  it('has its bar leave 5 over the progress bar, and the progress adds no space of its own', () => {
    const { getByTestId } = open()
    expect(roomUnder(getByTestId('printer-wizard-bar'))).toBe(5)
    expect(StyleSheet.flatten(getByTestId('printer-wizard-progress').parent!.props.style)?.paddingTop).toBeUndefined()
  })

  it('starts on the brand, connection and paper, Star on the network at 80 mm', () => {
    const { getByText, getByTestId } = open()
    expect(getByText('Add printer')).toBeTruthy()
    expect(getByText('Step 1 of 2')).toBeTruthy()
    expect(getByTestId('brand-star').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('connection-2').props.accessibilityState.checked).toBe(true)
    expect(getByTestId('paper-80').props.accessibilityState.selected).toBe(true)
    expect(getByText('Find printers')).toBeTruthy()
  })

  it('sizes the brand tiles by their labels (one third each cut "Other (ESC/POS)"): none is a fixed equal share', () => {
    const { getByTestId } = open()
    let node: any = getByTestId('brand-generic').parent
    while (node && !(node.props?.style && StyleSheet.flatten(node.props.style)?.flexGrow !== undefined)) node = node.parent
    const tile = StyleSheet.flatten(node.props.style)
    expect(tile.flexBasis).toBe('auto')
    expect(tile.flexGrow).toBe(1)
    expect(tile.flexShrink).toBe(0)
  })

  it('offers each brand its own connections: Star no USB, generic Bluetooth only, Epson all three', () => {
    const { getByTestId, queryByTestId } = open()
    expect(queryByTestId('connection-3')).toBeNull()
    expect(queryByTestId('connection-1')).toBeTruthy()
    fireEvent.press(getByTestId('brand-generic'))
    expect(queryByTestId('connection-2')).toBeNull()
    expect(queryByTestId('connection-3')).toBeNull()
    expect(getByTestId('connection-1').props.accessibilityState.checked).toBe(true)
    fireEvent.press(getByTestId('brand-epson'))
    expect(queryByTestId('connection-1')).toBeTruthy()
    expect(queryByTestId('connection-2')).toBeTruthy()
    expect(queryByTestId('connection-3')).toBeTruthy()
  })

  it('has a USB row that cannot be chosen on iOS, and nothing to find', () => {
    const { getByTestId, getByText } = open()
    fireEvent.press(getByTestId('brand-epson'))
    expect(getByTestId('connection-3').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(getByTestId('connection-3'))
    expect(getByTestId('connection-3').props.accessibilityState.checked).toBe(false)
    expect(getByText('Android only')).toBeTruthy()
  })

  it('explains the chosen connection', () => {
    const { getByTestId, getByText } = open()
    expect(getByText('Turn the printer on and connect it to the same network as this device.')).toBeTruthy()
    fireEvent.press(getByTestId('connection-1'))
    expect(getByText(/Bluetooth can be unreliable/)).toBeTruthy()
  })

  it('asks no permission and starts no search until "Find printers"', () => {
    const { printing, getByTestId } = open()
    fireEvent.press(getByTestId('brand-generic'))
    expect(printing.discover).not.toHaveBeenCalled()
  })

  it('leaves the wizard from the back arrow of step 1', () => {
    const { onClose, getByLabelText } = open()
    fireEvent.press(getByLabelText('Go back'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('the add wizard: step 2', () => {
  const toStep2 = async (view: ReturnType<typeof open>) => {
    await act(async () => { fireEvent.press(view.getByTestId('printer-next')) })
    await waitFor(() => expect(view.queryByTestId('printer-searching')).toBeNull())
  }

  it('searches the chosen brand over the chosen connection and lists every printer found, the first selected', async () => {
    const view = open()
    fireEvent.press(view.getByTestId('paper-58'))
    await toStep2(view)
    expect(view.printing.discover).toHaveBeenCalledWith({ brand: 'star', connection: 2 })
    expect(view.getByText('Step 2 of 2')).toBeTruthy()
    expect(view.getByText('Found on your network')).toBeTruthy()
    expect(view.getByText('TSP100IV')).toBeTruthy()
    expect(view.getByText('mC-Print3')).toBeTruthy()
    expect(view.getByText('192.168.1.52')).toBeTruthy()
    expect(view.getByTestId('found-0').props.accessibilityState.checked).toBe(true)
    expect(view.getByTestId('found-1').props.accessibilityState.checked).toBe(false)
    // The name starts as the model; the model is not asked: the device said it.
    expect(view.getByDisplayValue('TSP100IV')).toBeTruthy()
    expect(view.queryByTestId('printer-model')).toBeNull()
  })

  it('saves the printer picked, with the record the old form saved', async () => {
    const view = open()
    fireEvent.press(view.getByTestId('paper-58'))
    await toStep2(view)
    fireEvent.press(view.getByTestId('found-1'))
    fireEvent.changeText(view.getByTestId('printer-name'), 'Kitchen')
    await act(async () => { fireEvent.press(view.getByTestId('printer-save')) })
    await waitFor(() => expect(storePrinter).toHaveBeenCalledTimes(1))
    expect(storePrinter).toHaveBeenCalledWith({
      item: {
        model: 'mC-Print3', driver: 'star', emulation: 'StarPRNT', printMode: 'append', paperWidthMm: 58, nickname: 'Kitchen',
        type: 2, ip: '192.168.1.52', bt: '', portName1: '', portName: '192.168.1.52'
      },
      type: 2,
      ip: '192.168.1.52',
      index: null,
      edit: false,
      isAdd: true
    })
    expect(view.onClose).toHaveBeenCalled()
  })

  it('searches again from the refresh button, and keeps the choice while it is still there', async () => {
    const view = open()
    await toStep2(view)
    fireEvent.press(view.getByTestId('found-1'))
    await act(async () => { fireEvent.press(view.getByTestId('printer-search')) })
    await waitFor(() => expect(view.printing.discover).toHaveBeenCalledTimes(2))
    expect(view.getByTestId('found-1').props.accessibilityState.checked).toBe(true)
  })

  it('tells a refused permission apart: says why, offers "Open settings", and searches again when the app comes back', async () => {
    const message = 'Bluetooth permission is required to find printers.'
    const discover = jest.fn(async () => ({ devices: [], message, permissionDenied: true }))
    const open$ = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
    let onChange: any
    const listen = jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: any, handler: any) => { onChange = handler; return { remove: jest.fn() } }) as any)
    const view = open({}, makePrinting({ discover }))
    await toStep2(view)
    expect(view.getByTestId('printer-permission-denied')).toBeTruthy()
    expect(view.getByText(message)).toBeTruthy()
    expect(view.queryByTestId('printer-none-found')).toBeNull()
    fireEvent.press(view.getByTestId('printer-open-settings'))
    expect(open$).toHaveBeenCalled()
    const before = discover.mock.calls.length
    await act(async () => { onChange('active') })
    await waitFor(() => expect(discover.mock.calls.length).toBe(before + 1))
    // Back from somewhere else (no settings opened): no extra search.
    await act(async () => { onChange('active') })
    expect(discover.mock.calls.length).toBe(before + 1)
    open$.mockRestore(); listen.mockRestore()
  })

  it('says why nothing was found, and lets the address be typed instead', async () => {
    const printing = makePrinting({ discover: jest.fn(async () => ({ devices: [], message: 'No printers found' })) })
    const view = open({}, printing)
    await toStep2(view)
    expect(view.getByTestId('printer-none-found')).toBeTruthy()
    expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(view.getByTestId('printer-enter-manually'))
    expect(view.getByText('Choose the printer model')).toBeTruthy()
    fireEvent.changeText(view.getByTestId('printer-address'), '192.168.1')
    expect(view.getByText('Invalid IP address')).toBeTruthy()
    expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(true)
  })

  describe('the address field keyboard', () => {
    const typedLan = async () => {
      const view = open({}, makePrinting({ discover: jest.fn(async () => ({ devices: [] })) }))
      fireEvent.press(view.getByTestId('brand-epson'))
      await toStep2(view)
      fireEvent.press(view.getByTestId('printer-enter-manually'))
      return view
    }
    const withOs = async (os: 'ios' | 'android', run: () => Promise<void>) => {
      const before = Platform.OS
      Platform.OS = os
      try { await run() } finally { Platform.OS = before }
    }

    it('is the digits-and-punctuation layout on iOS, with no autocorrect and no capitals', async () => {
      await withOs('ios', async () => {
        const input = (await typedLan()).getByTestId('printer-address')
        expect(input.props.keyboardType).toBe('numbers-and-punctuation')
        expect(input.props.autoCapitalize).toBe('none')
        expect(input.props.autoCorrect).toBe(false)
      })
    })

    it('is the decimal pad on Android (digits and the separator), with no autocorrect and no capitals', async () => {
      await withOs('android', async () => {
        const input = (await typedLan()).getByTestId('printer-address')
        expect(input.props.keyboardType).toBe('decimal-pad')
        expect(input.props.autoCapitalize).toBe('none')
        expect(input.props.autoCorrect).toBe(false)
      })
    })

    it('reads a comma, which some locales\' decimal pads type, as the dot, and keeps the whole address', async () => {
      const view = await typedLan()
      fireEvent.changeText(view.getByTestId('printer-address'), '192,168,1,60')
      expect(view.queryByText('Invalid IP address')).toBeNull()
    })

    it('keeps the full keyboard for a Bluetooth address (it has letters)', async () => {
      const view = open({}, makePrinting({ discover: jest.fn(async () => ({ devices: [] })) }))
      fireEvent.press(view.getByTestId('brand-generic'))
      fireEvent.press(view.getByTestId('connection-1'))
      await toStep2(view)
      fireEvent.press(view.getByTestId('printer-enter-manually'))
      expect(view.getByTestId('printer-address').props.keyboardType).toBe('default')
    })
  })

  it('saves a typed address with a picked model', async () => {
    const printing = makePrinting({ discover: jest.fn(async () => ({ devices: [] })) })
    const view = open({}, printing)
    fireEvent.press(view.getByTestId('brand-epson'))
    await toStep2(view)
    fireEvent.press(view.getByTestId('printer-enter-manually'))
    fireEvent.changeText(view.getByTestId('printer-address'), '192.168.1.60')
    fireEvent.press(view.getByTestId('printer-model'))
    fireEvent.press(await view.findByText('TM-T88V'))
    fireEvent.changeText(view.getByTestId('printer-name'), 'Bar')
    await waitFor(() => expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(false))
    await act(async () => { fireEvent.press(view.getByTestId('printer-save')) })
    await waitFor(() => expect(storePrinter).toHaveBeenCalled())
    expect(storePrinter).toHaveBeenCalledWith(expect.objectContaining({
      type: 2, ip: '192.168.1.60', isAdd: true,
      item: expect.objectContaining({ model: 'TM-T88V', driver: 'epson', nickname: 'Bar', portName: '192.168.1.60', ip: '192.168.1.60' })
    }))
  })

  it('asks for the model when the device did not say one the catalog knows', async () => {
    const printing = makePrinting({ discover: jest.fn(async () => ({ devices: [device('192.168.1.70', 'mC_Label3')] })) })
    const view = open({}, printing)
    await toStep2(view)
    expect(view.getByTestId('printer-model')).toBeTruthy()
    expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(true)
    fireEvent.press(view.getByTestId('printer-model'))
    fireEvent.press(await view.findByText('mPOP'))
    await waitFor(() => expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(false))
  })

  it('saves a Bluetooth generic printer picked from the list, with the generic model', async () => {
    const ble = device('AA:BB:CC', 'POS-58', 'ESC/POS (Bluetooth)', 'generic', 1)
    const printing = makePrinting({ discover: jest.fn(async () => ({ devices: [ble, device('DD:EE:FF', 'POS-80', 'ESC/POS (Bluetooth)', 'generic', 1)] })) })
    const view = open({}, printing)
    fireEvent.press(view.getByTestId('brand-generic'))
    await toStep2(view)
    expect(printing.discover).toHaveBeenCalledWith({ brand: 'generic', connection: 1 })
    expect(view.getByText('Found near you')).toBeTruthy()
    fireEvent.press(view.getByTestId('found-1'))
    await act(async () => { fireEvent.press(view.getByTestId('printer-save')) })
    await waitFor(() => expect(storePrinter).toHaveBeenCalled())
    expect(storePrinter).toHaveBeenCalledWith(expect.objectContaining({
      type: 1,
      item: expect.objectContaining({ driver: 'generic', model: 'ESC/POS (Bluetooth)', bt: 'DD:EE:FF', portName1: 'DD:EE:FF', portName: 'DD:EE:FF', nickname: 'ESC/POS (Bluetooth)' })
    }))
  })

  it('takes any one-line name, and does not save a name with a line break', async () => {
    const view = open()
    await toStep2(view)
    fireEvent.changeText(view.getByTestId('printer-name'), 'Kitchen #1 - hot')
    expect(view.queryByText('Invalid Nickname')).toBeNull()
    expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(false)
    fireEvent.changeText(view.getByTestId('printer-name'), 'Kitchen\n1')
    expect(view.getByText('Invalid Nickname')).toBeTruthy()
    expect(view.getByTestId('printer-save').props.accessibilityState.disabled).toBe(true)
  })

  it('prints a test ticket on the printer about to be saved, and says how it went', async () => {
    const printing = makePrinting({
      discover: jest.fn(async () => ({ devices: [tsp] })),
      testPrint: jest.fn(async (printer: any) => ({ printer, key: 'k', ok: true, at: new Date(2026, 0, 1, 12, 40).getTime() }))
    })
    const view = open({}, printing)
    await toStep2(view)
    await act(async () => { fireEvent.press(view.getByTestId('printer-test')) })
    expect(printing.testPrint).toHaveBeenCalledWith(expect.objectContaining({ model: 'TSP100IV', driver: 'star', type: 2, ip: '192.168.1.40', portName: '192.168.1.40' }))
    expect(await view.findByTestId('printer-test-ok')).toBeTruthy()
    expect(view.getByText(/Test ticket sent at .*12.*40/)).toBeTruthy()
    expect(storePrinter).not.toHaveBeenCalled()
  })

  it('says why a test ticket failed', async () => {
    const printing = makePrinting({
      discover: jest.fn(async () => ({ devices: [tsp] })),
      testPrint: jest.fn(async (printer: any) => ({ printer, key: 'k', ok: false, at: 1, message: 'Printer is out of paper.' }))
    })
    const view = open({}, printing)
    await toStep2(view)
    await act(async () => { fireEvent.press(view.getByTestId('printer-test')) })
    expect(await view.findByTestId('printer-test-failed')).toBeTruthy()
    expect(view.getByText('Printer is out of paper.')).toBeTruthy()
  })

  it('goes back to step 1 from the back arrow, and leaves from there', async () => {
    const view = open()
    await toStep2(view)
    fireEvent.press(view.getByLabelText('Go back'))
    expect(view.getByText('Step 1 of 2')).toBeTruthy()
    expect(view.onClose).not.toHaveBeenCalled()
  })
})

describe('Edit', () => {
  const stored = { model: 'TM-T20III', driver: 'epson', printMode: 'append', type: 2, ip: '192.168.1.80', portName: '192.168.1.80', portName1: '', bt: '', nickname: 'Epson kitchen', paperWidthMm: 58, index: 3 }

  it('reopens the wizard on the stored brand, connection and paper', () => {
    const { getByText, getByTestId } = open({ printer: stored })
    expect(getByText('Edit printer')).toBeTruthy()
    expect(getByTestId('brand-epson').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('connection-2').props.accessibilityState.checked).toBe(true)
    expect(getByTestId('paper-58').props.accessibilityState.selected).toBe(true)
    expect(getByText('Continue')).toBeTruthy()
  })

  it('shows the stored printer selected on step 2 without searching, and saves the change at its index', async () => {
    const view = open({ printer: stored })
    await act(async () => { fireEvent.press(view.getByText('Continue')) })
    expect(view.printing.discover).not.toHaveBeenCalled()
    expect(view.getByTestId('found-0').props.accessibilityState.checked).toBe(true)
    expect(view.getByText('192.168.1.80')).toBeTruthy()
    expect(view.getByDisplayValue('Epson kitchen')).toBeTruthy()
    fireEvent.changeText(view.getByTestId('printer-name'), 'Pass')
    await act(async () => { fireEvent.press(view.getByTestId('printer-save')) })
    await waitFor(() => expect(storePrinter).toHaveBeenCalled())
    expect(storePrinter).toHaveBeenCalledWith(expect.objectContaining({
      index: 3, edit: true, isAdd: false, type: 2, ip: '192.168.1.80',
      item: expect.objectContaining({ model: 'TM-T20III', driver: 'epson', nickname: 'Pass', paperWidthMm: 58, portName: '192.168.1.80' })
    }))
  })

  it('keeps the stored printer in the list when a new search does not find it', async () => {
    const view = open({ printer: stored })
    await act(async () => { fireEvent.press(view.getByText('Continue')) })
    await act(async () => { fireEvent.press(view.getByTestId('printer-search')) })
    await waitFor(() => expect(view.printing.discover).toHaveBeenCalled())
    expect(view.getByTestId('found-0').props.accessibilityState.checked).toBe(true)
    expect(view.getByTestId('found-2')).toBeTruthy()
  })
})

describe('on Android', () => {
  const original = Platform.OS
  beforeAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' }) })
  afterAll(() => { Object.defineProperty(Platform, 'OS', { configurable: true, get: () => original }) })

  it('lets an Epson printer be found over USB, and saves it with its target', async () => {
    const usb = device('USB:001', 'TM-T20III', 'TM-T20III', 'epson', 3)
    const printing = makePrinting({ discover: jest.fn(async () => ({ devices: [usb] })) })
    const view = open({}, printing)
    fireEvent.press(view.getByTestId('brand-epson'))
    fireEvent.press(view.getByTestId('connection-3'))
    await act(async () => { fireEvent.press(view.getByTestId('printer-next')) })
    await waitFor(() => expect(view.getByTestId('found-0')).toBeTruthy())
    expect(printing.discover).toHaveBeenCalledWith({ brand: 'epson', connection: 3 })
    expect(view.queryByTestId('printer-enter-manually')).toBeNull()
    await act(async () => { fireEvent.press(view.getByTestId('printer-save')) })
    await waitFor(() => expect(storePrinter).toHaveBeenCalled())
    expect(storePrinter).toHaveBeenCalledWith(expect.objectContaining({ type: 3, item: expect.objectContaining({ portName: 'USB:001', type: 3 }) }))
  })
})
