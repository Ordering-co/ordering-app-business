import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import TicketPreview from '../TicketPreview'

describe('TicketPreview', () => {
  it('renders ticket with merged order params', () => {
    const { getByTestId } = renderPage(TicketPreview, {
      route: {
        params: {
          order: { id: 7, total: 12 },
          orderStatus: { slug: 'COMPLETED' },
          printerSettings: { paper: '58mm' }
        }
      }
    })
    expect(getByTestId('ticket-preview')).toBeTruthy()
    expect(getByTestId('ticket-order-id').props.children).toBe(7)
    expect(getByTestId('ticket-order-status').props.children).toBe('COMPLETED')
    expect(getByTestId('ticket-printer-settings').props.children).toBe('configured')
    expect(getByTestId('container')).toBeTruthy()
  })

  it('passes shouldPrintOnMount from route params', () => {
    const { getByTestId } = renderPage(TicketPreview, {
      route: {
        params: {
          order: { id: 7 },
          orderStatus: { slug: 'COMPLETED' },
          printerSettings: { paper: '58mm' },
          shouldPrintOnMount: true
        }
      }
    })
    expect(getByTestId('ticket-should-print-on-mount').props.children).toBe('auto')
  })
})
