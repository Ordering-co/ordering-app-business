import React from 'react'
import { render } from '@testing-library/react-native'

jest.mock('@ui', () => {
  const React = require('react')
  const { Text } = require('react-native')
  const stub = (name: string) => (props: any) => React.createElement(Text, { testID: name }, JSON.stringify({
    printer: props.printer ?? null,
    order: props.order ?? null,
    printerSettings: props.printerSettings ?? null,
    shouldPrintOnMount: props.shouldPrintOnMount ?? null,
    hasNavigation: !!props.navigation
  }))
  return {
    PrinterSettings: stub('printers'),
    PrinterEdition: (props: any) => React.createElement(Text, { testID: 'wizard', onPress: props.onClose }, JSON.stringify({ printer: props.printer })),
    PrintTicketSettings: stub('ticket-settings'),
    TicketPreview: stub('ticket-preview')
  }
})

import PrinterSetup from '../PrinterSetup'
import PrinterConfigure from '../PrinterConfigure'
import PrintTicketSettings from '../PrintTicketSettings'
import TicketPreview from '../TicketPreview'
import { printersScreens } from '../../navigators/routes/printers'
import { duplicateRouteNames } from '../../navigators/routes'

const read = (view: any, id: string) => JSON.parse(view.getByTestId(id).props.children)

describe('the printers pages', () => {
  it('lays out nothing of their own: the list, the settings and the wizard draw their screens', () => {
    const navigation = { navigate: jest.fn() }
    expect(read(render(<PrinterSetup navigation={navigation} route={{}} />), 'printers').hasNavigation).toBe(true)
    expect(read(render(<PrintTicketSettings navigation={navigation} route={{}} />), 'ticket-settings').hasNavigation).toBe(true)
  })

  it('opens the wizard to add, or to edit the printer of the route', () => {
    const goBack = jest.fn()
    const navigation = { goBack, canGoBack: () => true }
    const add = render(<PrinterConfigure navigation={navigation} route={{}} />)
    expect(JSON.parse(add.getByTestId('wizard').props.children).printer).toBeNull()
    add.getByTestId('wizard').props.onPress()
    expect(goBack).toHaveBeenCalled()
    const printer = { model: 'TSP100', index: 1 }
    const edit = render(<PrinterConfigure navigation={navigation} route={{ params: { printer } }} />)
    expect(JSON.parse(edit.getByTestId('wizard').props.children).printer).toEqual(printer)
  })

  it('gives the ticket the order with its status text, the printers it is limited to and whether to print at once', () => {
    const route = { params: { order: { id: 1053, status: 7 }, orderStatus: 'Accepted', printerSettings: [{ model: 'TSP100' }], shouldPrintOnMount: true } }
    const page = read(render(<TicketPreview navigation={{}} route={route} />), 'ticket-preview')
    expect(page).toMatchObject({ order: { id: 1053, status: 7, orderStatus: 'Accepted' }, printerSettings: [{ model: 'TSP100' }], shouldPrintOnMount: true })
  })

  it('keeps the order\'s own status text when the caller gives none, and opens with no printer given', () => {
    const route = { params: { order: { id: 1, orderStatus: 'Pending' } } }
    expect(read(render(<TicketPreview navigation={{}} route={route} />), 'ticket-preview')).toMatchObject({ order: { id: 1, orderStatus: 'Pending' }, printerSettings: null, shouldPrintOnMount: false })
  })
})

describe('the printers routes', () => {
  it('mounts the list as `Printers` (the profile\'s row), the wizard, the settings and the ticket, with no header', () => {
    const byName = Object.fromEntries(printersScreens.map((screen) => [screen.name, screen]))
    expect(Object.keys(byName).sort()).toEqual(['PrintTicketSettings', 'PrinterConfigure', 'Printers', 'TicketPreview'])
    expect(byName.Printers.component).toBe(PrinterSetup)
    expect(byName.TicketPreview.component).toBe(TicketPreview)
    expect(printersScreens.every((screen) => (screen.options as any)?.headerShown === false)).toBe(true)
  })

  it('has dropped the old route names nothing navigates to any more', () => {
    const names = printersScreens.map((screen) => screen.name)
    expect(names).not.toContain('PrinterSetup')
    expect(names).not.toContain('OrderSummary')
  })

  it('uses no route name twice', () => {
    expect(duplicateRouteNames(printersScreens)).toEqual([])
  })
})
