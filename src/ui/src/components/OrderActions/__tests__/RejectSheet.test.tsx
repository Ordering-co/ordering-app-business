import React from 'react'
import { Keyboard, Linking } from 'react-native'
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

const press = async (screen: any, id: string) => { await act(async () => { fireEvent.press(screen.getByTestId(id)) }) }
const type = async (screen: any, id: string, text: string) => { await act(async () => { fireEvent.changeText(screen.getByTestId(id), text) }) }

describe('the reject sheet', () => {
  beforeEach(() => {
    resetTestState()
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any)
  })

  const open = async (opts: any = { changeStatus: jest.fn(async () => ({ id: 1053, status: 5 })) }, target: any = order(), offlineValue?: any) => {
    const { screen } = await renderHost(OrderActionsHost, { offlineValue })
    await act(async () => { orderActions.openReject(target, opts) })
    return screen
  }

  it('offers the five reasons, the first chosen, a note and the destructive button', async () => {
    const screen = await open()
    expect(screen.getByText('Reject order #1053')).toBeTruthy()
    expect(screen.getByText('Why are you rejecting it?')).toBeTruthy()
    expect(screen.getByText('The customer gets a notification with this reason.')).toBeTruthy()
    for (const label of ['Item out of stock', 'Too busy right now', 'Closing soon', "Can't deliver to this address", 'Other']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByTestId('reject-reason-out_of_stock').props.accessibilityState.selected).toBe(true)
    expect(screen.getByText('Add a note (optional)')).toBeTruthy()
    expect(screen.getByText("This can't be undone.")).toBeTruthy()
    expect(screen.getByText('Reject order')).toBeTruthy()
  })

  it('sends the reason label as reject_reason, no reasons without a note', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 5 }))
    const screen = await open({ changeStatus })
    await press(screen, 'reject-reason-too_busy')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(5, { status: 5, reject_reason: 'Too busy right now', id: 1053 })
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('sends the note as reasons next to the label', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 5 }))
    const screen = await open({ changeStatus })
    await type(screen, 'reject-note', '  Out of dough  ')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(5, { status: 5, reject_reason: 'Item out of stock', reasons: 'Out of dough', id: 1053 })
  })

  it('needs a note for Other and sends it as the reason', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 5 }))
    const screen = await open({ changeStatus })
    await press(screen, 'reject-reason-other')
    expect(screen.getByText('Add a note')).toBeTruthy()
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    await press(screen, 'order-action')
    expect(changeStatus).not.toHaveBeenCalled()
    await type(screen, 'reject-note', '   ')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    await type(screen, 'reject-note', 'Power cut')
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBeFalsy()
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(5, { status: 5, reject_reason: 'Power cut', reasons: 'Power cut', id: 1053 })
  })

  it('stays open with the message when the request fails', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{ id: 1053, result: ['Cannot reject now'], error: true }])
    const screen = await open({ handleChangeOrderStatus })
    await press(screen, 'order-action')
    expect(getRequest()).not.toBeNull()
    expect(screen.getByTestId('order-action-error').props.children).toBe('Cannot reject now')
  })

  describe('the call to the customer', () => {
    it('calls the customer by first name with the number the order details dial', async () => {
      const screen = await open()
      expect(screen.getByText('Call James first')).toBeTruthy()
      await press(screen, 'reject-call')
      expect(Linking.openURL).toHaveBeenCalledWith('tel:+14155550199')
    })

    it('is hidden when the project hides the customer contact', async () => {
      testState.configs = { hide_customer_contact_business_app: { value: '1' } }
      const screen = await open()
      expect(screen.queryByTestId('reject-call')).toBeNull()
    })

    it('is hidden when the customer has no phone', async () => {
      const screen = await open(undefined, order({ customer: { name: 'James' } }))
      expect(screen.queryByTestId('reject-call')).toBeNull()
    })
  })

  describe('a group', () => {
    it('names the group in the title and the button, sends every id', async () => {
      const orders = [order({ id: 21 }), order({ id: 22 })]
      const handleChangeOrderStatus = jest.fn(async () => [{ id: 21, result: {}, error: false }, { id: 22, result: {}, error: false }])
      const { screen } = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openReject(orders[0], { orders, handleChangeOrderStatus }) })
      expect(screen.getAllByText('Reject 2 orders').length).toBeGreaterThan(1)
      await press(screen, 'order-action')
      expect(handleChangeOrderStatus).toHaveBeenCalledWith(5, [21, 22], { status: 5, reject_reason: 'Item out of stock' }, { withDetails: true })
      await waitFor(() => expect(getRequest()).toBeNull())
    })

    it('has no call for orders of different customers, and one for the same customer', async () => {
      const different = [order({ id: 21, customer_id: 1 }), order({ id: 22, customer_id: 2 })]
      const a = await renderHost(OrderActionsHost)
      await act(async () => { orderActions.openReject(different[0], { orders: different, handleChangeOrderStatus: jest.fn() }) })
      expect(a.screen.queryByTestId('reject-call')).toBeNull()
      const same = [order({ id: 21, customer_id: 1 }), order({ id: 22, customer_id: 1 })]
      await act(async () => { orderActions.openReject(same[0], { orders: same, handleChangeOrderStatus: jest.fn() }) })
      expect(a.screen.getByTestId('reject-call')).toBeTruthy()
    })
  })

  it('queues the rejection offline', async () => {
    const queue = offline({ isNetConnected: false, canSaveChangesOffline: true })
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 5, oldStatus: 0 }))
    const screen = await open({ changeStatus }, order(), queue.value)
    await press(screen, 'order-action')
    expect(queue.applyOffAction).toHaveBeenCalledWith({
      event: 'evt_off_change_order_status',
      data: { orderId: 1053, body: { status: 5, reject_reason: 'Item out of stock', id: 1053 } }
    })
    expect(queue.registerOffOrder).toHaveBeenCalled()
  })
})

describe('a rejection either sends or stays open with its error', () => {
  beforeEach(() => resetTestState())

  const openReject = async (opts: any, offlineValue?: any) => {
    const { screen } = await renderHost(OrderActionsHost, { offlineValue })
    await act(async () => { orderActions.openReject(order(), opts) })
    return screen
  }

  it('sends it when the connection is not known yet, even where the project saves offline', async () => {
    // NetInfo's first reading is null: `!null` took it for offline, queued the change and closed the sheet, rejecting nothing.
    const queue = offline({ isNetConnected: null, canSaveChangesOffline: true })
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 5 }))
    const screen = await openReject({ changeStatus }, queue.value)
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(5, expect.objectContaining({ status: 5 }))
    expect(queue.applyOffAction).not.toHaveBeenCalled()
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('stays open with the message when the request fails', async () => {
    const screen = await openReject({ changeStatus: jest.fn(async () => ({ error: ['Not allowed'] })) })
    await press(screen, 'order-action')
    expect(getRequest()).not.toBeNull()
    expect(screen.getByText('Not allowed')).toBeTruthy()
  })

  it('does not close from the dimmed page while the request is on its way', async () => {
    let finish: (value: any) => void = () => {}
    const changeStatus = jest.fn(() => new Promise((resolve) => { finish = resolve }))
    const screen = await openReject({ changeStatus })
    await press(screen, 'order-action')
    await press(screen, 'sheet-backdrop')
    expect(getRequest()).not.toBeNull()
    await act(async () => { finish({ id: 1053, status: 5 }) })
    await waitFor(() => expect(getRequest()).toBeNull())
  })

  it('puts the keyboard away on the first touch of the dimmed page and closes on the next', async () => {
    const visible = jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true)
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {})
    const screen = await openReject({ changeStatus: jest.fn() })
    await press(screen, 'sheet-backdrop')
    expect(dismiss).toHaveBeenCalled()
    expect(getRequest()).not.toBeNull()
    visible.mockReturnValue(false)
    await press(screen, 'sheet-backdrop')
    expect(getRequest()).toBeNull()
    visible.mockRestore(); dismiss.mockRestore()
  })
})

describe('the status regression sheet', () => {
  beforeEach(() => resetTestState())

  it('asks for a reason and sends the refused change with it', async () => {
    const changeStatus = jest.fn(async () => ({ id: 1053, status: 0 }))
    const { screen } = await renderHost(OrderActionsHost)
    await act(async () => { orderActions.openForceStatus(order({ status: 7 }), { changeStatus, pendingStatusBody: { status: 0, id: 1053 } }) })
    expect(screen.getByText('Reason required')).toBeTruthy()
    expect(screen.getByTestId('order-action').props.accessibilityState.disabled).toBe(true)
    await type(screen, 'force-status-reason', 'Sent by mistake')
    await press(screen, 'order-action')
    expect(changeStatus).toHaveBeenCalledWith(0, { status: 0, id: 1053, reasons: 'Sent by mistake' })
    await waitFor(() => expect(getRequest()).toBeNull())
  })
})
