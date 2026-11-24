import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { makePrinting } from '../../../../../../jest/helpers/b6PrintingFacade'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'
import { printerKey } from '../../../../../printing/storage'

jest.mock('../../../../../printing/usePrinting', () => ({
  usePrinting: jest.fn(),
  PRINT_TIMEOUT_MS: 45000,
  CANVAS_WAIT_MS: 10000,
  DISCOVERY_TIMEOUT_MS: 30000
}))
jest.mock('../../../../../printing/storage', () => ({
  ...jest.requireActual('../../../../../printing/storage'),
  setAutoPrint: jest.fn(),
  removePrinter: jest.fn().mockResolvedValue([]),
  storePrinter: jest.fn()
}))

let mockLayout: any = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false }
jest.mock('@/theme/platform', () => ({
  ...jest.requireActual('@/theme/platform'),
  useLayout: () => mockLayout
}))

import { usePrinting } from '../../../../../printing/usePrinting'
import { setAutoPrint, removePrinter } from '../../../../../printing/storage'
import { PrinterSettings } from '..'

const star = { model: 'TSP100IV', driver: 'star', printMode: 'append', type: 2, ip: '192.168.1.40', portName: '192.168.1.40', nickname: 'Kitchen', paperWidthMm: 80 }
const generic = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, bt: 'AA:BB', portName: 'AA:BB', portName1: 'AA:BB', nickname: 'Counter', paperWidthMm: 58 }

const navigation = () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) })
const show = (printing: any, nav = navigation()) => {
  ;(usePrinting as jest.Mock).mockReturnValue(printing)
  return { nav, ...renderWithProviders(<PrinterSettings navigation={nav} />) }
}

describe('PrinterSettings: no printer', () => {
  beforeEach(() => { mockLayout = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false } })

  it('shows the empty state with the PDF hint and opens the wizard from its button', () => {
    const { nav, getByTestId, getByText, queryByTestId } = show(makePrinting())
    expect(getByText('No printers yet')).toBeTruthy()
    expect(getByText('Without a printer you can still share any ticket as a PDF.')).toBeTruthy()
    expect(queryByTestId('printers-auto-print')).toBeNull()
    expect(queryByTestId('printers-add')).toBeNull()
    fireEvent.press(getByTestId('printers-add-empty'))
    expect(nav.navigate).toHaveBeenCalledWith('PrinterConfigure', { printer: null })
  })

  it('shows a spinner, not the empty state, while the printers load', () => {
    const { queryByTestId } = show(makePrinting({ loaded: false }))
    expect(queryByTestId('printers-empty')).toBeNull()
  })
})

describe('PrinterSettings: with printers', () => {
  beforeEach(() => { mockLayout = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false } })

  it('draws one card per printer: name, what it is, and how its last ticket went', () => {
    const results = {
      [printerKey(star)]: { ok: true, at: 1000 },
      [printerKey(generic)]: { ok: false, at: new Date(2026, 0, 1, 12, 14).getTime(), message: 'Printer is out of paper.' }
    }
    const { getByText, queryByText } = show(makePrinting({ printers: [star, generic], results }))
    expect(getByText('Kitchen')).toBeTruthy()
    expect(getByText('Star TSP100IV · LAN 192.168.1.40 · 80 mm')).toBeTruthy()
    expect(getByText('Generic ESC/POS · Bluetooth · 58 mm')).toBeTruthy()
    expect(getByText('Ready')).toBeTruthy()
    expect(getByText('Offline')).toBeTruthy()
    expect(getByText(/The last ticket failed at .*12.*14/)).toBeTruthy()
    expect(getByText('Printer is out of paper.')).toBeTruthy()
    // A failed printer offers to reconnect, a healthy one to test.
    expect(getByText('Test print')).toBeTruthy()
    expect(getByText('Reconnect')).toBeTruthy()
    expect(queryByText('Not tested yet')).toBeNull()
  })

  it('says "Not tested yet" for a printer that has not printed', () => {
    const { getByText } = show(makePrinting({ printers: [star] }))
    expect(getByText('Not tested yet')).toBeTruthy()
  })

  it('sends a test ticket to the printer whose button was pressed', async () => {
    const printing = makePrinting({ printers: [star, generic] })
    const { getByTestId } = show(printing)
    fireEvent.press(getByTestId('printer-1-test'))
    await waitFor(() => expect(printing.testPrint).toHaveBeenCalledWith(generic))
    expect(printing.testPrint).toHaveBeenCalledTimes(1)
  })

  it('opens the wizard on the printer to edit, with its index', () => {
    const { nav, getByTestId } = show(makePrinting({ printers: [star, generic] }))
    fireEvent.press(getByTestId('printer-1-edit'))
    expect(nav.navigate).toHaveBeenCalledWith('PrinterConfigure', { printer: { ...generic, index: 1 } })
  })

  it('opens the wizard to add from the bar\'s plus', () => {
    const { nav, getByTestId } = show(makePrinting({ printers: [star] }))
    fireEvent.press(getByTestId('printers-add'))
    expect(nav.navigate).toHaveBeenCalledWith('PrinterConfigure', { printer: null })
  })

  it('asks before removing a printer, and removes it only when accepted', async () => {
    const dialogs = captureDialogs()
    const { getByTestId } = show(makePrinting({ printers: [star, generic] }))
    fireEvent.press(getByTestId('printer-0-delete'))
    expect(dialogs.last()).toMatchObject({ title: 'Remove printer', message: 'Kitchen will no longer receive tickets from this device.', acceptText: 'Remove', destructive: true })
    expect(removePrinter).not.toHaveBeenCalled()
    dialogs.cancel()
    expect(removePrinter).not.toHaveBeenCalled()
    fireEvent.press(getByTestId('printer-0-delete'))
    dialogs.accept()
    await waitFor(() => expect(removePrinter).toHaveBeenCalledWith(star, 0))
    dialogs.off()
  })

  it('stores the auto-print switch', () => {
    const { getByTestId } = show(makePrinting({ printers: [star], autoPrint: false }))
    fireEvent.press(getByTestId('printers-auto-print-switch'))
    expect(setAutoPrint).toHaveBeenCalledWith(true)
  })

  it('shows the switch on when auto-print is on', () => {
    const { getByTestId } = show(makePrinting({ printers: [star], autoPrint: true }))
    expect(getByTestId('printers-auto-print-switch').props.accessibilityState.checked).toBe(true)
  })

  it('offers the Ticket row only when a generic printer exists (the options apply to those)', () => {
    const none = show(makePrinting({ printers: [star] }))
    expect(none.queryByTestId('print-settings-button')).toBeNull()
    none.unmount()
    const some = show(makePrinting({ printers: [star, generic] }))
    fireEvent.press(some.getByTestId('print-settings-button'))
    expect(some.nav.navigate).toHaveBeenCalledWith('PrintTicketSettings')
  })

  it('goes back from the bar', () => {
    const { nav, getByLabelText } = show(makePrinting({ printers: [star] }))
    fireEvent.press(getByLabelText('Go back'))
    expect(nav.goBack).toHaveBeenCalled()
  })
})

describe('PrinterSettings: a landscape tablet', () => {
  beforeEach(() => { mockLayout = { landscapeTablet: true, panes: { list: 380, detail: 440 }, maxContentWidth: 600, contentWidth: 600, tablet: true } })

  it('keeps the list and puts the wizard beside it instead of navigating', () => {
    const { nav, getByTestId, queryByTestId, getByText } = show(makePrinting({ printers: [star, generic] }))
    expect(getByTestId('printers-panes')).toBeTruthy()
    expect(getByTestId('printers-detail-hint')).toBeTruthy()
    fireEvent.press(getByTestId('printer-0-edit'))
    expect(nav.navigate).not.toHaveBeenCalled()
    expect(queryByTestId('printers-detail-hint')).toBeNull()
    expect(getByText('Edit printer')).toBeTruthy()
    expect(getByTestId('printer-wizard-close')).toBeTruthy()
    fireEvent.press(getByTestId('printer-wizard-close'))
    expect(getByTestId('printers-detail-hint')).toBeTruthy()
  })

  it('opens the wizard for a new printer on its own when there is none', () => {
    const { getByText, queryByTestId, getByTestId } = show(makePrinting({ printers: [] }))
    expect(getByText('Add printer')).toBeTruthy()
    expect(queryByTestId('printers-detail-hint')).toBeNull()
    // The list pane says there is none (the one empty state), not only the auto-print switch of nothing; the wizard beside it is the add.
    expect(getByTestId('printers-empty')).toBeTruthy()
    expect(getByText('No printers yet')).toBeTruthy()
    expect(queryByTestId('printers-auto-print')).toBeNull()
    expect(queryByTestId('printers-add-empty')).toBeNull()
    // It is the pane's only content: a close button that did nothing would be a dead control (TAB2).
    expect(queryByTestId('printer-wizard-close')).toBeNull()
  })
})

describe('the printer card summary', () => {
  it('keeps each dot with the word before it and the paper width with its unit, so no line starts with a dot', () => {
    const { keepSummaryTogether } = require('../PrinterCard')
    expect(keepSummaryTogether('Generic ESC/POS · Bluetooth · 80 mm')).toBe('Generic ESC/POS · Bluetooth · 80 mm')
    // no ordinary space stands before a dot, none inside "80 mm"
    expect(keepSummaryTogether('Star TSP100IV · LAN 192.168.1.40 · 58 mm')).not.toMatch(/ ·| mm/)
  })
})
