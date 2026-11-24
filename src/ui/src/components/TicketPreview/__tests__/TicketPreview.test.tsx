import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { makePrinting, okOutcome } from '../../../../../../jest/helpers/b6PrintingFacade'
import { sampleTicketOrder } from '../../../../../../jest/helpers/b6PrinterDefaults'
import { printerKey } from '../../../../../printing/storage'

jest.mock('../../../../../printing/usePrinting', () => ({
  usePrinting: jest.fn(),
  PRINT_TIMEOUT_MS: 45000,
  CANVAS_WAIT_MS: 10000,
  DISCOVERY_TIMEOUT_MS: 30000
}))

let mockLayout: any = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false }
jest.mock('@/theme/platform', () => ({
  ...jest.requireActual('@/theme/platform'),
  useLayout: () => mockLayout
}))

import { usePrinting } from '../../../../../printing/usePrinting'
import { TicketPreview } from '..'

const kitchen = { model: 'TSP100IV', driver: 'star', printMode: 'append', type: 2, ip: '192.168.1.40', portName: '192.168.1.40', nickname: 'Kitchen', paperWidthMm: 80 }
const counter = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, bt: 'AA:BB', portName: 'AA:BB', nickname: 'Counter', paperWidthMm: 58 }
const order = { ...sampleTicketOrder, id: 1053 }

const show = (overrides: any = {}, props: any = {}, options: any = {}) => {
  const printing = makePrinting(overrides)
  ;(usePrinting as jest.Mock).mockReturnValue(printing)
  const navigation = { goBack: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn() }
  const view = renderWithProviders(<TicketPreview navigation={navigation} order={order} {...props} />, options)
  return { printing, navigation, ...view }
}

beforeEach(() => { mockLayout = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false } })

describe('the ticket preview with printers', () => {
  it('opens with every printer selected, the ticket of the first, and the button naming where it goes', () => {
    const { printing, getByTestId, getByText } = show({ printers: [kitchen, counter], copies: 2 })
    expect(getByText('Print ticket')).toBeTruthy()
    expect(getByText('Order #1053')).toBeTruthy()
    expect(getByTestId('ticket-chip-0').props.accessibilityState.selected).toBe(true)
    expect(getByTestId('ticket-chip-1').props.accessibilityState.selected).toBe(true)
    expect(getByText('Print on 2 printers')).toBeTruthy()
    expect(printing.ticketText).toHaveBeenLastCalledWith(order, { printer: kitchen })
    expect(getByTestId('ticket-paper-text').props.children).toBe('TICKET 1053 star')
    expect(getByText('2')).toBeTruthy()
  })

  it('keeps the printer chip row its full height and scrolls it with the page on the phone (it was squeezed and pinned)', () => {
    const { getByTestId } = show({ printers: [kitchen, counter] })
    const row = getByTestId('ticket-printers')
    expect(StyleSheet.flatten(row.props.style).flexShrink).toBe(0)
    // On the phone the chips are inside the page's vertical scroll, not above it.
    let node = row.parent
    let inPageScroll = false
    while (node) {
      if (node.props?.horizontal !== true && node.props?.contentContainerStyle && node.props?.showsVerticalScrollIndicator === false) inPageScroll = true
      node = node.parent
    }
    expect(inPageScroll).toBe(true)
  })

  it('warms the canvas of a TSP100 ticket while the ticket is read, with the printers it may go to', () => {
    const { printing } = show({ printers: [kitchen, counter] })
    expect(printing.warm).toHaveBeenCalledWith([kitchen, counter])
  })

  it('names the printer when only one is selected, and follows the first selected printer\'s paper', () => {
    const { printing, getByTestId, getByText } = show({ printers: [kitchen, counter] })
    fireEvent.press(getByTestId('ticket-chip-0'))
    expect(getByText('Print on Counter')).toBeTruthy()
    expect(printing.ticketText).toHaveBeenLastCalledWith(order, { printer: counter })
    expect(getByTestId('ticket-paper-text').props.children).toBe('TICKET 1053 generic')
  })

  it('disables the print button with no printer selected', () => {
    const { getByTestId } = show({ printers: [kitchen] })
    fireEvent.press(getByTestId('ticket-chip-0'))
    expect(getByTestId('ticket-print').props.accessibilityState.disabled).toBe(true)
  })

  it('marks a printer whose last ticket failed as offline, and keeps it selectable', () => {
    const results = { [printerKey(counter)]: { ok: false, at: 1, message: 'x' }, [printerKey(kitchen)]: { ok: true, at: 1 } }
    const { getByText, getByTestId } = show({ printers: [kitchen, counter], results })
    expect(getByText('Counter · offline')).toBeTruthy()
    expect(getByTestId('ticket-chip-1').props.accessibilityState.selected).toBe(true)
  })

  it('prints on the selected printers with the copies, and says it was printed', async () => {
    const { printing, getByTestId, findByTestId } = show({ printers: [kitchen, counter], copies: 3 })
    fireEvent.press(getByTestId('ticket-chip-1'))
    await act(async () => { fireEvent.press(getByTestId('ticket-print')) })
    expect(printing.print).toHaveBeenCalledWith({ order, printers: [kitchen], copies: 3 })
    expect(await findByTestId('ticket-printed')).toBeTruthy()
  })

  it('takes the copies from the stepper', async () => {
    const { printing, getByTestId, getByLabelText } = show({ printers: [kitchen] })
    fireEvent.press(getByLabelText('Increase'))
    fireEvent.press(getByLabelText('Increase'))
    await act(async () => { fireEvent.press(getByTestId('ticket-print')) })
    expect(printing.print).toHaveBeenCalledWith(expect.objectContaining({ copies: 3 }))
  })

  it('says which printer failed and why, and tries again on the failed ones only', async () => {
    const failed = (printer: any) => ({ ...okOutcome(printer), ok: false, message: 'Printer is out of paper.' })
    const print = jest.fn()
      .mockImplementationOnce(async ({ printers }: any) => [okOutcome(printers[0]), failed(printers[1])])
      .mockImplementationOnce(async ({ printers }: any) => printers.map(okOutcome))
    const { getByTestId, getByText, findByTestId, queryByTestId } = show({ printers: [kitchen, counter], print })
    await act(async () => { fireEvent.press(getByTestId('ticket-print')) })
    expect(await findByTestId('ticket-failed')).toBeTruthy()
    expect(getByText('Order not printed, connection failed')).toBeTruthy()
    expect(getByText('Counter: Printer is out of paper.')).toBeTruthy()
    expect(queryByTestId('ticket-printed')).toBeNull()
    await act(async () => { fireEvent.press(getByTestId('ticket-retry')) })
    expect(print).toHaveBeenLastCalledWith(expect.objectContaining({ printers: [counter] }))
    expect(await findByTestId('ticket-printed')).toBeTruthy()
    expect(queryByTestId('ticket-failed')).toBeNull()
  })

  it('shows the print button busy while it prints, and free again after an error', async () => {
    let finish: (value: any[]) => void = () => {}
    const print = jest.fn(() => new Promise<any[]>((resolve) => { finish = resolve }))
    const { getByTestId } = show({ printers: [kitchen], print })
    await act(async () => { fireEvent.press(getByTestId('ticket-print')) })
    // While it prints the other ways out wait (one thing at a time); an answer frees them.
    expect(getByTestId('ticket-share-pdf').props.accessibilityState.disabled).toBe(true)
    await act(async () => { finish([{ ...okOutcome(kitchen), ok: false, message: 'Printer timed out. Check the network and try again.' }]) })
    expect(getByTestId('ticket-share-pdf').props.accessibilityState.disabled).toBeFalsy()
    expect(getByTestId('ticket-failed')).toBeTruthy()
  })

  it('prints at once when the accept flow asks for it', async () => {
    const { printing } = show({ printers: [kitchen, counter] }, { shouldPrintOnMount: true })
    await waitFor(() => expect(printing.print).toHaveBeenCalledTimes(1))
    expect(printing.print).toHaveBeenCalledWith(expect.objectContaining({ printers: [kitchen, counter] }))
  })

  it('offers only the printers the caller gives, when it gives some', () => {
    const { queryByTestId, getByText } = show({ printers: [kitchen, counter] }, { printerSettings: [counter] })
    expect(queryByTestId('ticket-chip-1')).toBeNull()
    expect(getByText('Print on Counter')).toBeTruthy()
  })

  it('shares the PDF of the first selected printer\'s ticket, and the system print dialog stays reachable', async () => {
    const { printing, getByTestId } = show({ printers: [kitchen, counter] })
    await act(async () => { fireEvent.press(getByTestId('ticket-share-pdf')) })
    expect(printing.exportPdf).toHaveBeenCalledWith(order, { printer: kitchen })
    await act(async () => { fireEvent.press(getByTestId('ticket-system-print')) })
    expect(printing.systemPrint).toHaveBeenCalledWith(order, { printer: kitchen })
  })

  it('says the document failed when the system dialog or the PDF did not open', async () => {
    const { getByTestId, findByTestId } = show({ printers: [kitchen], exportPdf: jest.fn(async () => ({ ok: false })) })
    await act(async () => { fireEvent.press(getByTestId('ticket-share-pdf')) })
    expect(await findByTestId('ticket-document-failed')).toBeTruthy()
  })

  it('hides Share PDF with the theme\'s `ticket.pdf`', () => {
    const theme = themeWithValues((values) => { values.visibility['ticket.pdf'] = false })
    const { queryByTestId, getByTestId } = show({ printers: [kitchen] }, {}, { themeOverrides: theme })
    expect(queryByTestId('ticket-share-pdf')).toBeNull()
    expect(getByTestId('ticket-print')).toBeTruthy()
  })

  it('goes back from the bar', () => {
    const { getByLabelText, navigation } = show({ printers: [kitchen] })
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})

describe('the ticket preview with no printer saved', () => {
  it('still shows the ticket, with Share PDF and the system printer as the ways out', async () => {
    const { printing, queryByTestId, getByTestId, getByText } = show({ printers: [] })
    expect(queryByTestId('ticket-printers')).toBeNull()
    expect(queryByTestId('ticket-print')).toBeNull()
    expect(getByTestId('ticket-paper-text').props.children).toBe('TICKET 1053 default')
    expect(printing.ticketText).toHaveBeenLastCalledWith(order, { printer: undefined })
    // The bar's two buttons are the mockup's (Share PDF, Print); the system printer is the second one's meaning.
    expect(getByTestId('ticket-system-print').props.accessibilityLabel).toBe('Print with the system printer')
    expect(getByText('Print')).toBeTruthy()
    await act(async () => { fireEvent.press(getByTestId('ticket-share-pdf')) })
    expect(printing.exportPdf).toHaveBeenCalledWith(order, { printer: undefined })
    await act(async () => { fireEvent.press(getByTestId('ticket-system-print')) })
    expect(printing.systemPrint).toHaveBeenCalledTimes(1)
  })
})

describe('the ticket preview on a landscape tablet', () => {
  it('has the controls on the left and the paper on the right', () => {
    mockLayout = { landscapeTablet: true, panes: { list: 380, detail: 440 }, maxContentWidth: 600, contentWidth: 600, tablet: true }
    const { getByTestId } = show({ printers: [kitchen] })
    expect(getByTestId('ticket-panes')).toBeTruthy()
    expect(getByTestId('ticket-paper')).toBeTruthy()
    expect(getByTestId('ticket-print')).toBeTruthy()
  })

  it('with no printer the left pane says so (and where to share or print) instead of standing empty (IPAD2-C1)', () => {
    mockLayout = { landscapeTablet: true, panes: { list: 380, detail: 440 }, maxContentWidth: 600, contentWidth: 600, tablet: true }
    const { getByTestId, getByText, queryByTestId } = show({ printers: [] })
    expect(getByTestId('ticket-no-printers')).toBeTruthy()
    expect(getByText('No printers yet')).toBeTruthy()
    // The copies are a printer's: no stepper without one.
    expect(queryByTestId('ticket-copies')).toBeNull()
  })

  it('with a printer the left pane holds its chips and the copies, not the empty state', () => {
    mockLayout = { landscapeTablet: true, panes: { list: 380, detail: 440 }, maxContentWidth: 600, contentWidth: 600, tablet: true }
    const { getByTestId, queryByTestId } = show({ printers: [kitchen] })
    expect(queryByTestId('ticket-no-printers')).toBeNull()
    expect(getByTestId('ticket-printers')).toBeTruthy()
    expect(getByTestId('ticket-copies')).toBeTruthy()
  })
})
