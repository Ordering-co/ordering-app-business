import React from 'react'
import { Linking } from 'react-native'
import dayjs from 'dayjs'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => require('./mocks').componentsMock())
jest.mock('@/printing/usePrinting', () => require('./mocks').printingMock())
jest.mock('react-native-maps', () => require('./mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(async () => []) }))

import Clipboard from '@react-native-clipboard/clipboard'
import { OrderActionsHost } from '..'
import { orderActions } from '../useOrderActions'
import { getRequest } from '../store'
import { order, renderHost, resetTestState, testState } from './setup'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const press = async (screen: any, id: string) => { await act(async () => { fireEvent.press(screen.getByTestId(id)) }) }

const accepted = (extra: any = {}) => order({ status: 7, prepared_in: 20, ...extra })

describe('the adjust-time sheet', () => {
  beforeEach(() => resetTestState())

  const open = async (opts: any, target: any = accepted()) => {
    const { screen } = await renderHost(OrderActionsHost)
    await act(async () => { orderActions.openPrepTime(target, opts) })
    return screen
  }

  it('shows the four adjustments with +5 chosen and sends the new total with no status', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7, prepared_in: 25 }))
    const screen = await open({ changeStatus, acceptedAt: dayjs().subtract(10, 'minute') })
    expect(screen.getByText('Adjust preparation time')).toBeTruthy()
    for (const text of ['-5 min', '+5 min', '+10 min', '+15 min']) expect(screen.getByText(text)).toBeTruthy()
    expect(screen.getByTestId('prep-adjust-5').props.accessibilityState.selected).toBe(true)
    expect(screen.getByText('The customer and the driver will be notified.')).toBeTruthy()
    await press(screen, 'prep-adjust-15')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 35, id: 1053 })
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('says how long is left and when it is promised, and the new promised time', async () => {
    const screen = await open({ changeStatus: jest.fn(), acceptedAt: dayjs().subtract(10, 'minute') })
    expect(screen.getByTestId('prep-now').props.children).toMatch(/^Now: ready in \d+ min · promised for \d{2}:\d{2}$/)
    expect(screen.getByTestId('prep-now').props.children).not.toMatch(/invalid/i)
    expect(screen.getByTestId('prep-new-time').props.children).toMatch(/^\d{2}:\d{2}$/)
    expect(screen.getByText('New promised time')).toBeTruthy()
  })

  // The API's history stamp is the business's own time, to the minute, with no zone; `updated_at` is UTC.
  const stamp = (moment: dayjs.Dayjs) => moment.format('YYYY-MM-DD HH:mm:ss')
  const bizOrder = (acceptedMinutesAgo: number, offsetHours: number, extra: any = {}) => {
    const acceptedUtc = dayjs.utc().subtract(acceptedMinutesAgo, 'minute').startOf('minute')
    return accepted({
      updated_at: stamp(acceptedUtc),
      history: [{ created_at: stamp(acceptedUtc.add(offsetHours, 'hour')), data: [{ attribute: 'status', old: 0, new: 7 }] }],
      ...extra
    })
  }

  it('reads the accept time from the order history, in the business time zone', async () => {
    // A business five hours behind UTC, accepted 3 minutes ago: read as the device's time the accept would be hours away.
    for (const offset of [-5, 0, 3]) {
      const screen = await open({ changeStatus: jest.fn() }, bizOrder(3, offset))
      expect(screen.getByTestId('prep-now').props.children).toMatch(/^Now: ready in (16|17) min · promised for \d{2}:\d{2}$/)
      for (const value of [-5, 5, 10, 15]) {
        expect(screen.getByTestId(`prep-adjust-${value}`).props.accessibilityState.disabled).toBe(false)
      }
      expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBeFalsy()
      screen.unmount()
    }
  })

  it('never draws "invalid format": a time that cannot be written is left out and the sheet stays usable', async () => {
    const screen = await open({ changeStatus: jest.fn() }, bizOrder(3, -5))
    const everyText = JSON.stringify(screen.toJSON())
    expect(everyText).not.toMatch(/invalid/i)
    testState.timeFormat = undefined
    const second = await open({ changeStatus: jest.fn(), acceptedAt: 'not a date' }, accepted({ history: 'garbage', updated_at: 'nope' }))
    expect(JSON.stringify(second.toJSON())).not.toMatch(/invalid/i)
    expect(second.queryByTestId('prep-now')).toBeNull()
    expect(second.getByTestId('prep-adjust-5').props.accessibilityState.disabled).toBe(false)
  })

  it('adjusts a late order from now, not from the promised time', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus }, bizOrder(30, -5))
    expect(screen.getByTestId('prep-now').props.children).toMatch(/^Now: ready in 0 min/)
    expect(screen.getByTestId('prep-adjust--5').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByTestId('prep-adjust-10').props.accessibilityState.disabled).toBe(false)
    await press(screen, 'prep-adjust-10')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 40, id: 1053 }) // 30 elapsed + 10
  })

  it('shows the new minutes when the accept time is unknown', async () => {
    const screen = await open({ changeStatus: jest.fn() })
    expect(screen.queryByTestId('prep-now')).toBeNull()
    expect(screen.getByTestId('prep-new-time').props.children).toBe('25 min')
    expect(screen.getByText('New preparation time')).toBeTruthy()
  })

  it('turns off -5 when the time would end before now', async () => {
    const screen = await open({ changeStatus: jest.fn(), acceptedAt: dayjs().subtract(18, 'minute') })
    expect(screen.getByTestId('prep-adjust--5').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByTestId('prep-adjust-5').props.accessibilityState.disabled).toBe(false)
  })

  it('stays open with the message when it fails, and is not queued offline', async () => {
    const changeStatus = jest.fn(async () => null)
    const screen = await open({ changeStatus })
    await press(screen, 'order-action')
    expect(screen.getByTestId('order-action-error')).toBeTruthy()
    expect(getRequest()).not.toBeNull()
  })

  it('tells the customer the new time itself when the list owns the request', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{ id: 1053, result: {}, error: false }])
    const screen = await open({ handleChangeOrderStatus })
    await press(screen, 'order-action')
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(7, [1053], { prepared_in: 25 }, { withDetails: true })
    await waitFor(() => expect(getRequest()).toBeNull())
    const body = JSON.parse((testState.fetch.mock.calls[0] as any)[1].body)
    expect(body).toEqual({ comment: 'Estimated preparation time: 25 min.', type: 2, can_see: '3', order_id: 1053 })
  })
})

describe('the assign-driver sheet', () => {
  beforeEach(() => {
    resetTestState()
    testState.drivers = [
      { id: 7, name: 'Omar', lastname: 'Haddad', available: true, assigned_orders_count: 0, location: { lat: 1.0, lng: 1.1 } },
      { id: 8, name: 'Lina', lastname: 'Perez', available: true, assigned_orders_count: 1, location: { lat: 1.0, lng: 1.3 } },
      { id: 9, name: 'Raj', lastname: 'Kumar', available: false, assigned_orders_count: 0 }
    ]
  })

  const open = async (opts: any = {}, target: any = accepted()) => {
    const { screen } = await renderHost(OrderActionsHost)
    await act(async () => { orderActions.openAssignDriver(target, opts) })
    return screen
  }

  it('lists the drivers of the order: available first, availability and active orders, the rest greyed', async () => {
    const screen = await open()
    await waitFor(() => expect(screen.getByTestId('driver-7')).toBeTruthy())
    // The sheet's title and the button that waits for a choice.
    expect(screen.getAllByText('Assign driver')).toHaveLength(2)
    expect(screen.getByText('Omar H.')).toBeTruthy()
    expect(screen.getAllByText('Available')).toHaveLength(1)
    expect(screen.getByText('Available · 1 active order')).toBeTruthy()
    expect(screen.queryByText(/ away/)).toBeNull()
    expect(screen.getByText('Not available')).toBeTruthy()
    expect(screen.getByTestId('driver-9').props.accessibilityState.disabled).toBe(true)
    expect(screen.queryByTestId('driver-none')).toBeNull()
    expect(testState.controlsGet).toHaveBeenCalledTimes(1)
  })

  it('assigns the chosen driver and closes', async () => {
    const onDone = jest.fn()
    const screen = await open({ onDone })
    await waitFor(() => expect(screen.getByTestId('driver-8')).toBeTruthy())
    // Nothing chosen yet: "Assign driver", disabled (never "Unassign driver" for an order with no driver).
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    expect(screen.queryByText('Unassign driver')).toBeNull()
    await press(screen, 'driver-8')
    expect(screen.getByText('Assign Lina P.')).toBeTruthy()
    await press(screen, 'order-action')
    expect(testState.save).toHaveBeenCalledWith({ driver_id: 8 })
    await waitFor(() => expect(getRequest()).toBeNull())
    expect(onDone).toHaveBeenCalledWith({ id: 1, driver_id: 7 })
  })

  it('does not choose a driver who is not available', async () => {
    const screen = await open()
    await waitFor(() => expect(screen.getByTestId('driver-9')).toBeTruthy())
    await press(screen, 'driver-9')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
  })

  it('unassigns when the order has a driver: No driver sends null', async () => {
    const screen = await open({}, accepted({ driver_id: 7, driver: { id: 7, name: 'Omar', lastname: 'Haddad' } }))
    await waitFor(() => expect(screen.getByTestId('driver-none')).toBeTruthy())
    expect(screen.getByTestId('driver-7').props.accessibilityState.checked).toBe(true)
    await press(screen, 'driver-none')
    expect(screen.getByText('Unassign driver')).toBeTruthy()
    await press(screen, 'order-action')
    expect(testState.save).toHaveBeenCalledWith({ driver_id: null })
  })

  it('shows the reason inline and stays open when the assignment fails', async () => {
    testState.save = jest.fn(async () => ({ content: { error: true, result: ['Driver is busy'] } }))
    const screen = await open()
    await waitFor(() => expect(screen.getByTestId('driver-8')).toBeTruthy())
    await press(screen, 'driver-8')
    await press(screen, 'order-action')
    expect(screen.getByTestId('order-action-error').props.children).toBe('Driver is busy')
    expect(getRequest()).not.toBeNull()
  })

  it('says it when the project has no drivers, and shows a load error', async () => {
    testState.drivers = []
    const empty = await open()
    await waitFor(() => expect(empty.getByTestId('drivers-empty')).toBeTruthy())
    // One empty state with a sentence a person reads, and no button to press: there is no driver to assign or to unassign.
    expect(empty.getByText('No drivers for this store yet')).toBeTruthy()
    expect(empty.getByText('Drivers appear here once the store belongs to a driver group.')).toBeTruthy()
    expect(empty.queryByTestId('order-action')).toBeNull()
    expect(empty.queryByText('Unassign driver')).toBeNull()
    testState.controlsError = true
    const failed = await open()
    await waitFor(() => expect(failed.getAllByTestId('order-action-error').length).toBeGreaterThan(0))
  })

  it('uses the drivers and the assignment the screen gives, and asks nothing', async () => {
    const handleAssignDriver = jest.fn(async () => ({ id: 1053, driver_id: 5 }))
    const screen = await open({ drivers: [{ id: 5, name: 'Ana', lastname: 'Ruiz', available: true }], handleAssignDriver })
    expect(screen.getByTestId('driver-5')).toBeTruthy()
    expect(testState.controlsGet).not.toHaveBeenCalled()
    await press(screen, 'driver-5')
    await press(screen, 'order-action')
    expect(handleAssignDriver).toHaveBeenCalledWith(5)
    await waitFor(() => expect(getRequest()).toBeNull())
  })
})

describe('the more sheet', () => {
  beforeEach(() => {
    resetTestState()
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
  })

  const open = async (target: any, handlers: any = {}) => {
    const { screen } = await renderHost(OrderActionsHost)
    await act(async () => { orderActions.openMore(target, handlers) })
    return screen
  }

  const rows = (screen: any) => ['print', 'copy', 'map', 'message', 'call', 'adjust', 'assign', 'share'].filter((key) => screen.queryByTestId(`more-${key}`))

  it('is titled with the order number and has a row for what the caller can do and what applies', async () => {
    const screen = await open(accepted({ status: 7 }), { onPrint: jest.fn(), onCopy: jest.fn(), onMessage: jest.fn(), onShare: jest.fn() })
    expect(screen.getByText('Order #1053')).toBeTruthy()
    // Not assignable (no config): print, copy details, map, message, call, adjust time, share.
    expect(rows(screen)).toEqual(['print', 'copy', 'map', 'message', 'call', 'adjust', 'share'])
    expect(screen.getByText('Copy order details')).toBeTruthy()
  })

  it('offers the assignment under today\'s conditions only', async () => {
    testState.configs = { assign_driver_enabled: { value: '1' } }
    const delivery = await open(accepted({ status: 7, delivery_type: 1 }))
    expect(rows(delivery)).toContain('assign')
    const pickup = await open(accepted({ status: 7, delivery_type: 2 }))
    expect(rows(pickup)).not.toContain('assign')
  })

  it('has no adjust-time row for a pending or a ready order', async () => {
    const pending = await open(order({ status: 0 }), { onPrint: jest.fn() })
    expect(rows(pending)).not.toContain('adjust')
    const ready = await open(order({ status: 4 }), { onPrint: jest.fn() })
    expect(rows(ready)).not.toContain('adjust')
  })

  it('copies the order number itself when the caller has no text to copy', async () => {
    const screen = await open(accepted())
    expect(screen.getByText('Copy order number')).toBeTruthy()
    await press(screen, 'more-copy')
    expect(Clipboard.setString).toHaveBeenCalledWith('1053')
    expect(getRequest()).toBeNull()
  })

  it('has no message or call for an ended order or when the contact is hidden', async () => {
    const ended = await open(order({ status: 1 }), { onMessage: jest.fn() })
    expect(rows(ended)).not.toContain('message')
    testState.configs = { hide_customer_contact_business_app: { value: '1' } }
    const hidden = await open(accepted(), { onMessage: jest.fn() })
    expect(rows(hidden)).not.toContain('message')
    expect(rows(hidden)).not.toContain('call')
  })

  it('has no map row without any coordinate', async () => {
    const screen = await open(order({ status: 7, business: { name: 'x' }, customer: { name: 'y' } }))
    expect(rows(screen)).not.toContain('map')
  })

  it('runs the caller\'s action after closing, and the call dials', async () => {
    const onPrint = jest.fn()
    const screen = await open(accepted(), { onPrint })
    await press(screen, 'more-print')
    expect(getRequest()).toBeNull()
    expect(onPrint).toHaveBeenCalledTimes(1)
    const again = await open(accepted())
    await press(again, 'more-call')
    expect(Linking.openURL).toHaveBeenCalledWith('tel:+14155550199')
  })

  it('leads to the adjust-time sheet in place, with the options the caller gave', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053 }))
    const screen = await open(accepted(), { prepTime: { changeStatus } })
    await press(screen, 'more-adjust')
    expect(getRequest()?.kind).toBe('prepTime')
    expect(screen.getByText('Adjust preparation time')).toBeTruthy()
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { prepared_in: 25, id: 1053 })
  })

  it('leads to the map after the sheet has gone', async () => {
    jest.useFakeTimers()
    try {
      const screen = await open(accepted())
      await press(screen, 'more-map')
      expect(getRequest()).toBeNull()
      await act(async () => { jest.runAllTimers() })
      expect(getRequest()?.kind).toBe('map')
      expect(screen.getByTestId('order-map')).toBeTruthy()
    } finally {
      jest.useRealTimers()
    }
  })

  it('hides the rows the theme turns off', async () => {
    const themeOverrides = themeWithValues((values) => {
      values.visibility['confirmation.order.print'] = false
      values.visibility['confirmation.order.directions'] = false
      values.visibility['confirmation.order.copy'] = false
      values.visibility['confirmation.order.messages'] = false
      values.visibility['ticket.pdf'] = false
    })
    const { screen } = await renderHost(OrderActionsHost, { themeOverrides })
    await act(async () => { orderActions.openMore(accepted(), { onPrint: jest.fn(), onCopy: jest.fn(), onMessage: jest.fn(), onShare: jest.fn() }) })
    expect(rows(screen)).toEqual(['call', 'adjust'])
  })
})
