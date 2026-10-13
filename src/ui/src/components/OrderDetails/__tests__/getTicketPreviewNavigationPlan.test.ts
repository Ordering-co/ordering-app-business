import {
  TICKET_PREVIEW_ENTRY,
  getTicketPreviewNavigationPlan
} from '../getTicketPreviewNavigationPlan'

const order = { id: 42 }
const printers = [{ model: 'TM-T20III', driver: 'epson', type: 2 }]

describe('getTicketPreviewNavigationPlan', () => {
  it('opens Order Summary when there are no printers', () => {
    expect(getTicketPreviewNavigationPlan({
      printerSettings: '',
      order,
      orderStatus: 'Accepted',
      entry: TICKET_PREVIEW_ENTRY.acceptAutoPrint,
      autoPrintEnabled: true
    })).toEqual({
      screen: 'OrderSummary',
      params: {
        printerSettings: '',
        order,
        orderStatus: 'Accepted',
        shouldPrintOnMount: false
      }
    })
  })

  it('does not auto-print when opening preview from the printer icon', () => {
    expect(getTicketPreviewNavigationPlan({
      printerSettings: printers,
      order,
      orderStatus: 'Accepted',
      autoPrintEnabled: true
    }).params.shouldPrintOnMount).toBe(false)

    expect(getTicketPreviewNavigationPlan({
      printerSettings: printers,
      order,
      orderStatus: 'Accepted',
      entry: TICKET_PREVIEW_ENTRY.preview,
      autoPrintEnabled: true
    })).toEqual({
      screen: 'TicketPreview',
      params: {
        printerSettings: printers,
        order,
        orderStatus: 'Accepted',
        shouldPrintOnMount: false
      }
    })
  })

  it('auto-prints on mount only after accept when the setting is on', () => {
    expect(getTicketPreviewNavigationPlan({
      printerSettings: printers,
      order,
      orderStatus: 'Accepted',
      entry: TICKET_PREVIEW_ENTRY.acceptAutoPrint,
      autoPrintEnabled: true
    })).toEqual({
      screen: 'TicketPreview',
      params: {
        printerSettings: printers,
        order,
        orderStatus: 'Accepted',
        shouldPrintOnMount: true
      }
    })
  })

  it('does not auto-print after accept when the setting is off', () => {
    expect(getTicketPreviewNavigationPlan({
      printerSettings: printers,
      order,
      orderStatus: 'Accepted',
      entry: TICKET_PREVIEW_ENTRY.acceptAutoPrint,
      autoPrintEnabled: false
    }).params.shouldPrintOnMount).toBe(false)
  })
})
