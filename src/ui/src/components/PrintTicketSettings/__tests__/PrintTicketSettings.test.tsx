import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { fireEvent } from '@testing-library/react-native'

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
  setTicketOptions: jest.fn().mockResolvedValue({}),
  setCopies: jest.fn().mockResolvedValue(undefined)
}))

let mockLayout: any = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false }
jest.mock('@/theme/platform', () => ({
  ...jest.requireActual('@/theme/platform'),
  useLayout: () => mockLayout
}))

import { usePrinting } from '../../../../../printing/usePrinting'
import { setCopies, setTicketOptions } from '../../../../../printing/storage'
import { DEFAULT_TICKET_PRINT_OPTIONS } from '../../../../../printing/ticketPrintOptions'
import { PrintTicketSettings } from '..'

const generic = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, bt: 'AA:BB', portName: 'AA:BB', nickname: 'Counter', paperWidthMm: 58 }

const show = (overrides: any = {}) => {
  const printing = makePrinting({ printers: [generic], copies: 2, ...overrides })
  ;(usePrinting as jest.Mock).mockReturnValue(printing)
  const navigation = { goBack: jest.fn(), canGoBack: jest.fn(() => true), navigate: jest.fn() }
  return { printing, navigation, ...renderWithProviders(<PrintTicketSettings navigation={navigation} />) }
}

describe('the ticket settings', () => {
  beforeEach(() => { mockLayout = { landscapeTablet: false, panes: {}, maxContentWidth: 0, contentWidth: 390, tablet: false } })

  it('draws the six switches from the stored options, and the copies', () => {
    const { getByText, getByTestId } = show({ options: { ...DEFAULT_TICKET_PRINT_OPTIONS, businessSection: false, payments: false } })
    for (const title of ['Customer details', 'Store details', 'Order note', 'Product options and notes', 'Totals breakdown', 'Payments']) {
      expect(getByText(title)).toBeTruthy()
    }
    expect(getByTestId('print-option-customer-switch').props.accessibilityState.checked).toBe(true)
    expect(getByTestId('print-option-business-switch').props.accessibilityState.checked).toBe(false)
    expect(getByTestId('print-option-payments-switch').props.accessibilityState.checked).toBe(false)
    expect(getByText('Copies per order')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(getByText('The order number, products and total always print.')).toBeTruthy()
    expect(getByText('These options apply to generic (ESC/POS) printers.')).toBeTruthy()
  })

  it('stores a switch at once, the full set of options', () => {
    const { getByTestId } = show()
    fireEvent.press(getByTestId('print-option-customer-switch'))
    expect(setTicketOptions).toHaveBeenCalledWith({ ...DEFAULT_TICKET_PRINT_OPTIONS, customerSection: false })
    expect(getByTestId('print-option-customer-switch').props.accessibilityState.checked).toBe(false)
  })

  it('drives a whole group with one switch: product options and notes are three stored options', () => {
    const { getByTestId } = show()
    fireEvent.press(getByTestId('print-option-products-switch'))
    expect(setTicketOptions).toHaveBeenCalledWith({
      ...DEFAULT_TICKET_PRINT_OPTIONS, productOptions: false, productComments: false, productIngredients: false
    })
    fireEvent.press(getByTestId('print-option-products-switch'))
    expect(setTicketOptions).toHaveBeenLastCalledWith(DEFAULT_TICKET_PRINT_OPTIONS)
  })

  it('shows a group on when any of its options is on', () => {
    const { getByTestId } = show({ options: { ...DEFAULT_TICKET_PRINT_OPTIONS, productOptions: false, productComments: true, productIngredients: false } })
    expect(getByTestId('print-option-products-switch').props.accessibilityState.checked).toBe(true)
  })

  it('keeps the 25 options behind "Details": each group, a section switch where there is one, hidden when the section is off', () => {
    const { getByTestId, queryByTestId, getByText } = show()
    expect(queryByTestId('print-group-header')).toBeNull()
    fireEvent.press(getByTestId('print-details-toggle'))
    for (const group of ['header', 'customer', 'business', 'products', 'totals']) expect(getByTestId(`print-group-${group}`)).toBeTruthy()
    expect(getByText('Delivery Preference')).toBeTruthy()
    expect(getByTestId('print-option-customerEmail')).toBeTruthy()
    fireEvent.press(getByTestId('print-option-customerEmail'))
    expect(setTicketOptions).toHaveBeenCalledWith({ ...DEFAULT_TICKET_PRINT_OPTIONS, customerEmail: false })
    fireEvent.press(getByTestId('print-option-customerSection'))
    expect(queryByTestId('print-option-customerEmail')).toBeNull()
    expect(getByTestId('print-option-businessName')).toBeTruthy()
  })

  it('stores the copies from the stepper', () => {
    const { getByLabelText, getByText } = show()
    fireEvent.press(getByLabelText('Increase'))
    expect(setCopies).toHaveBeenCalledWith(3)
    expect(getByText('3')).toBeTruthy()
  })

  it('shows the real ticket with the options as they are, and updates it as a switch changes', () => {
    const { printing, getByTestId } = show()
    expect(getByTestId('ticket-settings-paper-text').props.children).toContain('TICKET 1053 generic')
    expect(printing.ticketText).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 1053 }),
      expect.objectContaining({ printer: generic, options: DEFAULT_TICKET_PRINT_OPTIONS })
    )
    fireEvent.press(getByTestId('print-option-payments-switch'))
    expect(printing.ticketText).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ options: expect.objectContaining({ payments: false }) })
    )
  })

  describe('the short paper on a phone', () => {
    // A 40-line ticket whose lines depend on the options, the way the real one does: each switch owns its lines.
    const longTicket = (order: any, { options }: any = {}) => {
      const o = options ?? DEFAULT_TICKET_PRINT_OPTIONS
      const lines = ['Order No. 1053']
      for (let i = 1; i <= 8; i++) lines.push(`header ${i}`)
      if (o.customerSection) lines.push('Customer details', 'Full Name: Alex')
      for (let i = 1; i <= 10; i++) lines.push(`product line ${i}`)
      if (o.productOptions) lines.push('Size Large')
      if (o.totalsBreakdown) lines.push('Subtotal $24.00', 'Delivery Fee $3.50')
      lines.push('Total $28.50')
      if (o.payments) lines.push('Payments', 'Cash -$28.50')
      return lines.join('\n')
    }
    const paperText = (api: any) => api.getByTestId('ticket-settings-paper-text').props.children as string

    it('starts at the top of a long ticket and marks that it goes on', () => {
      const { printing, getByTestId } = show()
      ;(printing.ticketText as jest.Mock).mockImplementation(longTicket)
      fireEvent.press(getByTestId('print-option-note-switch'))
      const text = paperText({ getByTestId })
      expect(text).toContain('Order No. 1053')
      expect(text).not.toContain('Total $28.50')
      expect(text.split('\n').pop()).toBe('...')
    })

    it.each([
      ['customer', 'Full Name: Alex'],
      ['products', 'Size Large'],
      ['totals', 'Subtotal $24.00'],
      ['payments', 'Cash -$28.50']
    ])('shows what the %s switch changes, wherever it is in the ticket', (id, line) => {
      const { printing, getByTestId } = show()
      ;(printing.ticketText as jest.Mock).mockImplementation(longTicket)
      fireEvent.press(getByTestId('print-option-note-switch'))
      fireEvent.press(getByTestId('print-option-note-switch'))
      fireEvent.press(getByTestId(`print-option-${id}-switch`))
      const off = paperText({ getByTestId })
      fireEvent.press(getByTestId(`print-option-${id}-switch`))
      const on = paperText({ getByTestId })
      expect(on).toContain(line)
      expect(off).not.toContain(line)
      expect(on).not.toBe(off)
    })

    it('reaches the total when the last lines are the ones that change', () => {
      const { printing, getByTestId } = show()
      ;(printing.ticketText as jest.Mock).mockImplementation(longTicket)
      fireEvent.press(getByTestId('print-option-note-switch'))
      fireEvent.press(getByTestId('print-option-note-switch'))
      fireEvent.press(getByTestId('print-option-payments-switch'))
      expect(paperText({ getByTestId })).toContain('Total $28.50')
    })
  })

  it('goes back from the bar', () => {
    const { getByLabelText, navigation } = show()
    fireEvent.press(getByLabelText('Go back'))
    expect(navigation.goBack).toHaveBeenCalled()
  })
})

describe('the ticket settings on a landscape tablet', () => {
  it('has the whole paper beside the switches', () => {
    mockLayout = { landscapeTablet: true, panes: { list: 380, detail: 440 }, maxContentWidth: 600, contentWidth: 600, tablet: true }
    const { getByTestId } = show()
    expect(getByTestId('ticket-settings-panes')).toBeTruthy()
    expect(getByTestId('ticket-settings-paper')).toBeTruthy()
    expect(getByTestId('print-option-customer-switch')).toBeTruthy()
  })
})
