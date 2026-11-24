import React from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => require('./mocks').componentsMock())
jest.mock('@/printing/usePrinting', () => require('./mocks').printingMock())
jest.mock('react-native-maps', () => require('./mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))
jest.mock('react-native-map-link', () => ({ getApps: jest.fn(async () => []) }))

import { OrderActionsHost } from '..'
import { orderActions } from '../useOrderActions'
import { getRequest } from '../store'
import { offline, order, renderHost, resetTestState, testState } from './setup'

const press = async (screen: any, id: string) => {
  await act(async () => { fireEvent.press(screen.getByTestId(id)) })
}

describe('the accept sheet', () => {
  beforeEach(() => resetTestState())

  const open = async (opts: any = {}, extra: any = {}, offlineValue?: any) => {
    const { screen } = await renderHost(OrderActionsHost, { offlineValue })
    await act(async () => { orderActions.openAccept(order(), opts) })
    return screen
  }

  it('opens with 20 minutes chosen, the five presets, "Ready by" and the button naming the time', async () => {
    const screen = await open({ changeStatus: jest.fn() })
    expect(screen.getByText('Accept order #1053')).toBeTruthy()
    expect(screen.getByText('Preparation time')).toBeTruthy()
    expect(screen.getByText('The customer and the driver see this estimate.')).toBeTruthy()
    for (const preset of [10, 15, 20, 30, 45]) expect(screen.getByTestId(`prep-preset-${preset}`)).toBeTruthy()
    expect(screen.getByTestId('prep-preset-20').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('prep-preset-30').props.accessibilityState.selected).toBe(false)
    expect(screen.getByTestId('prep-minutes').props.children).toBe('20 min')
    expect(screen.getByTestId('prep-ready-by').props.children).toMatch(/^Ready by \d{2}:\d{2}$/)
    expect(screen.getByTestId('prep-ready-by').props.children).not.toMatch(/invalid/i)
    expect(screen.getByText('Accept · 20 min')).toBeTruthy()
  })

  it('writes "Ready by" in the project time format', async () => {
    testState.timeFormat = 'hh:mm A'
    const screen = await open({ changeStatus: jest.fn() })
    expect(screen.getByTestId('prep-ready-by').props.children).toMatch(/^Ready by \d{2}:\d{2} (AM|PM)$/)
  })

  it('takes a preset and steps by 5 inside 0 and 180', async () => {
    const screen = await open({ changeStatus: jest.fn() })
    await press(screen, 'prep-preset-45')
    expect(screen.getByText('Accept · 45 min')).toBeTruthy()
    await press(screen, 'prep-plus')
    expect(screen.getByText('Accept · 50 min')).toBeTruthy()
    await press(screen, 'prep-minus')
    await press(screen, 'prep-minus')
    expect(screen.getByText('Accept · 40 min')).toBeTruthy()
    // Not a preset any more once stepped to a number that is not one.
    expect(screen.getByTestId('prep-preset-45').props.accessibilityState.selected).toBe(false)
  })

  it('stops at the minimum and the maximum', async () => {
    const screen = await open({ changeStatus: jest.fn(), defaultMinutes: 5 })
    expect(screen.getByTestId('prep-minus').props.accessibilityState.disabled).toBe(false)
    await press(screen, 'prep-minus')
    // No preparation time: the lowest the stepper goes.
    expect(screen.getByText('Accept · 0 min')).toBeTruthy()
    expect(screen.getByTestId('prep-minus').props.accessibilityState.disabled).toBe(true)
    const high = await open({ changeStatus: jest.fn(), defaultMinutes: 500 })
    expect(high.getByTestId('prep-plus').props.accessibilityState.disabled).toBe(true)
    expect(high.getByText('Accept · 180 min')).toBeTruthy()
  })

  it('sends status 7 and prepared_in through the details request, and closes when it changed', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const onDone = jest.fn()
    const onClosed = jest.fn()
    const screen = await open({ changeStatus, onDone, onClosed })
    await press(screen, 'prep-preset-30')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 30, id: 1053 })
    await waitFor(() => expect(getRequest()).toBeNull())
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('sends the default 20 minutes on one tap (the card opens it preselected)', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 7 }))
    const screen = await open({ changeStatus })
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 20, id: 1053 })
  })

  it('stays open on a failure with the message, and sends again on the next tap', async () => {
    const changeStatus = jest.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 1053, status: 7 })
    const screen = await open({ changeStatus })
    await press(screen, 'order-action')
    expect(getRequest()).not.toBeNull()
    expect(screen.getByTestId('order-action-error').props.children).toBe('The change was not saved. Try again.')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBeFalsy()
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('shows what the request threw', async () => {
    const screen = await open({ changeStatus: jest.fn(async () => { throw new Error('Network Error') }) })
    await press(screen, 'order-action')
    expect(screen.getByTestId('order-action-error').props.children).toBe('Network Error')
    expect(getRequest()).not.toBeNull()
  })

  it('does not send twice while the request runs', async () => {
    let finish: any
    const changeStatus = jest.fn(() => new Promise((resolve) => { finish = resolve }))
    const screen = await open({ changeStatus })
    await press(screen, 'order-action')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledTimes(1)
    await act(async () => { finish({ id: 1053 }) })
  })

  it('is the list request for a card: one call with the id, the answers read per order', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{ id: 1053, result: { id: 1053 }, error: false }])
    const screen = await open({ handleChangeOrderStatus })
    await press(screen, 'order-action')
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(7, [1053], { status: 7, prepared_in: 20 }, { withDetails: true })
    await waitFor(() => expect(getRequest()).toBeNull())
    // The list's request does not tell the customer the time: the sheet does.
    expect(testState.fetch).toHaveBeenCalledWith('https://api.test/orders/1053/messages', expect.objectContaining({ method: 'POST' }))
  })

  describe('a group', () => {
    const orders = [order({ id: 11 }), order({ id: 12 })]

    it('names the group in its title and sends every id once', async () => {
      const handleChangeOrderStatus = jest.fn(async () => [
        { id: 11, result: {}, error: false }, { id: 12, result: {}, error: false }
      ])
      const { screen } = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openAccept(orders[0], { orders, handleChangeOrderStatus }) })
      expect(screen.getByText('Accept 2 orders')).toBeTruthy()
      await press(screen, 'prep-preset-15')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(7, [11, 12], { status: 7, prepared_in: 15 }, { withDetails: true })
      await waitFor(() => expect(getRequest()).toBeNull())
    })

    it('stays open when one order failed and retries only that one', async () => {
      const handleChangeOrderStatus = jest.fn()
        .mockResolvedValueOnce([{ id: 11, result: {}, error: false }, { id: 12, result: ['Out of range'], error: true }])
        .mockResolvedValueOnce([{ id: 12, result: {}, error: false }])
      const { screen } = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openAccept(orders[0], { orders, handleChangeOrderStatus }) })
      await press(screen, 'order-action')
      expect(getRequest()).not.toBeNull()
      expect(screen.getByTestId('order-action-error').props.children).toBe('Orders that did not change: 1 · Out of range')
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenLastCalledWith(7, [12], { status: 7, prepared_in: 20 }, { withDetails: true })
      await waitFor(() => expect(getRequest()).toBeNull())
    })
  })

  describe('the printer', () => {
    it('says which printer prints when auto-print is on', async () => {
      testState.printing = { host: null, autoTargets: [{ nickname: 'Kitchen', model: 'Star' }], printOrder: jest.fn(async () => []) }
      const screen = await open({ changeStatus: jest.fn() })
      expect(screen.getByTestId('prep-printer-note').findByType).toBeTruthy()
      expect(screen.getByText('The ticket prints on Kitchen when you accept.')).toBeTruthy()
    })

    it('says nothing without an auto-print printer', async () => {
      const screen = await open({ changeStatus: jest.fn() })
      expect(screen.queryByTestId('prep-printer-note')).toBeNull()
    })

    it('prints the accepted order, from the sheet whatever the entry', async () => {
      const printOrder = jest.fn(async () => [])
      testState.printing = { host: null, autoTargets: [], printOrder }
      const screen = await open({ handleChangeOrderStatus: jest.fn(async () => [{ id: 1053, result: {}, error: false }]) })
      await press(screen, 'prep-preset-10')
      await press(screen, 'order-action')
      expect(printOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 1053, status: 7, prepared_in: 10 }))
    })

    it('does not print an order that was not accepted', async () => {
      const printOrder = jest.fn(async () => [])
      testState.printing = { host: null, autoTargets: [], printOrder }
      const screen = await open({ changeStatus: jest.fn(async () => null) })
      await press(screen, 'order-action')
      expect(printOrder).not.toHaveBeenCalled()
    })
  })

  describe('offline', () => {
    it('queues the change, registers the order and closes (with the details request)', async () => {
      const queue = offline({ isNetConnected: false, canSaveChangesOffline: true })
      const changeStatus = jest.fn(async () => ({ id: 1053, status: 7, oldStatus: 0 }))
      const screen = await open({ changeStatus }, {}, queue.value)
      await press(screen, 'order-action')
      expect(queue.applyOffAction).toHaveBeenCalledWith({
        event: 'evt_off_change_order_status',
        data: { orderId: 1053, body: { status: 7, prepared_in: 20, id: 1053 } }
      })
      expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 20, id: 1053 }, { dataToSave: { status: 7, prepared_in: 20, id: 1053, unsync: true } })
      expect(queue.registerOffOrder).toHaveBeenCalledWith({ id: 1053, status: 7, oldStatus: 0 })
      await waitFor(() => expect(getRequest()).toBeNull())
    })

    it('queues every order of a group without calling the network', async () => {
      const queue = offline({ isNetConnected: false, canSaveChangesOffline: true })
      const handleChangeOrderStatus = jest.fn()
      const orders = [order({ id: 11 }), order({ id: 12 })]
      const { screen } = await renderHost(OrderActionsHost, { offlineValue: queue.value })
      await act(async () => { orderActions.openAccept(orders[0], { orders, handleChangeOrderStatus }) })
      await press(screen, 'order-action')
      expect(queue.applyOffAction).toHaveBeenCalledTimes(2)
      expect(queue.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 12, status: 7, prepared_in: 20, unsync: true, oldStatus: 0 }))
      expect(handleChangeOrderStatus).not.toHaveBeenCalled()
      await waitFor(() => expect(getRequest()).toBeNull())
    })

    it('goes to the network when offline saving is not allowed', async () => {
      const queue = offline({ isNetConnected: false, canSaveChangesOffline: false })
      const changeStatus = jest.fn(async () => ({ id: 1053 }))
      const screen = await open({ changeStatus }, {}, queue.value)
      await press(screen, 'order-action')
      expect(queue.applyOffAction).not.toHaveBeenCalled()
      expect(changeStatus).toHaveBeenCalledWith(7, { status: 7, prepared_in: 20, id: 1053 })
    })
  })

  it('is a centered card on a tablet and the same sheet', async () => {
    const { screen } = await renderHost(OrderActionsHost, { platform: 'tablet' })
    await act(async () => { orderActions.openAccept(order(), { changeStatus: jest.fn() }) })
    expect(screen.getByTestId('order-sheet-accept')).toBeTruthy()
    expect(screen.queryByTestId('sheet-handle', { includeHiddenElements: true })).toBeNull()
  })

  it('closing the sheet tells the screen that opened it', async () => {
    const onClosed = jest.fn()
    const screen = await open({ changeStatus: jest.fn(), onClosed })
    await act(async () => { fireEvent.press(screen.getByLabelText('Close')) })
    expect(getRequest()).toBeNull()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })
})
