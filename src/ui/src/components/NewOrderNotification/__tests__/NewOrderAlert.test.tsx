import React from 'react'
import { act, fireEvent } from '@testing-library/react-native'
import { AppState, Vibration } from 'react-native'
import SoundPlayer from 'react-native-sound-player'

jest.mock('react-native-sound-player', () => ({ playAsset: jest.fn(), playUrl: jest.fn(), stop: jest.fn(), addEventListener: jest.fn(() => ({ remove: jest.fn() })) }))

const mockEmitter = () => {
  const listeners: Record<string, Function[]> = {}
  return {
    on: (name: string, fn: Function) => { listeners[name] = [...(listeners[name] ?? []), fn] },
    off: (name: string, fn: Function) => { listeners[name] = (listeners[name] ?? []).filter((other) => other !== fn) },
    emit: (name: string, value?: any) => (listeners[name] ?? []).forEach((fn) => fn(value))
  }
}
const mockState: any = {
  events: mockEmitter(),
  states: [] as number[],
  user: { id: 1, level: 0 },
  configs: {},
  save: jest.fn(),
  businesses: jest.fn(),
  chat: undefined as number | undefined
}
const mockActions = { openAccept: jest.fn() }
const mockNav = { openOrderDetails: jest.fn(), openOrdersTab: jest.fn(), openMessagesTab: jest.fn() }

jest.mock('@components', () => {
  const React = require('react')
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    NewOrderNotification: ({ UIComponent, ...props }: any) => <UIComponent {...props} orderStatus={mockState.states} />,
    useEvent: () => [mockState.events],
    useSession: () => [{ user: mockState.user, token: 'tkn' }, {}],
    useConfig: () => [{ configs: mockState.configs }],
    useApi: () => [{
      setAccessToken: () => ({
        orders: () => ({ save: mockState.save }),
        businesses: () => ({ asDashboard: () => ({ select: () => ({ get: mockState.businesses }) }) })
      })
    }, {}],
    useUtils: () => [{ parsePrice: (value: number) => `$${value.toFixed(2)}`, parseDate: (value: string) => value, timeFormat: 'HH:mm' }, {}]
  }
})
jest.mock('@/navigators/NavigationRef', () => ({
  openChatOrderId: () => mockState.chat,
  openOrderDetails: (...args: any[]) => mockNav.openOrderDetails(...args),
  openOrdersTab: (...args: any[]) => mockNav.openOrdersTab(...args),
  openMessagesTab: (...args: any[]) => mockNav.openMessagesTab(...args)
}))
jest.mock('../../OrderActions/useOrderActions', () => ({ useOrderActions: () => mockActions }))

import { NewOrderAlert, isAlertHostMounted } from '..'
import { RING_EVERY_MS, VIBRATION_PATTERN, alertSoundSource, playAlertSound, ringEveryMs } from '../alertRing'
import { requestTestAlert, resetAlertSettings, updateAlertSettings } from '../../AlertSettings'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const order = (id: number, extra: Record<string, any> = {}) => ({
  id,
  status: 0,
  delivery_type: 1,
  created_at: '2026-11-19 12:00:00',
  customer: { name: 'James', lastname: 'Carter' },
  products: [{ name: 'Pizza', quantity: 1 }, { name: 'Knots', quantity: 2 }, { name: 'Lemonade', quantity: 2 }],
  summary: { total: 32.37 },
  ...extra
})

const SHEET_WAIT_MS = 300
const arrive = (value: any) => act(() => { mockState.events.emit('order_added_notification', value) })
const settle = () => act(async () => { await Promise.resolve() })

/** Taps an Accept; the alert's sheet leaves first, then the accept sheet opens. */
const pressAccept = (screen: any, key: string) => {
  fireEvent.press(screen.getByTestId(`alert-accept-${key}`))
  act(() => { jest.advanceTimersByTime(SHEET_WAIT_MS) })
}

const renderAlert = async () => {
  const screen = renderWithProviders(<NewOrderAlert />)
  await settle()
  return screen
}

describe('NewOrderAlert', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    resetAlertSettings()
    mockState.events = mockEmitter()
    mockState.states = []
    mockState.user = { id: 1, level: 0 }
    mockState.configs = {}
    mockState.chat = undefined
    mockState.save.mockResolvedValue({ content: { result: {}, error: false } })
    mockState.businesses.mockResolvedValue({ content: { error: false, result: [{ id: 5 }] } })
    jest.spyOn(Vibration, 'vibrate').mockImplementation(() => {})
    jest.spyOn(Vibration, 'cancel').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('draws nothing while it has nothing to say', async () => {
    const { queryByTestId } = await renderAlert()
    expect(queryByTestId('new-order-alert')).toBeNull()
    expect(SoundPlayer.playAsset).not.toHaveBeenCalled()
  })

  it('opens with the count and the order: customer, products, total, its clock and an Accept', async () => {
    const { getByTestId, getByText } = await renderAlert()
    arrive(order(1053))
    expect(getByText('1 new order')).toBeTruthy()
    expect(getByText('#1053 · Delivery')).toBeTruthy()
    expect(getByText('James Carter · 3 products · $32.37')).toBeTruthy()
    expect(getByTestId('alert-clock-o:1053')).toBeTruthy()
    expect(getByTestId('alert-accept-o:1053')).toBeTruthy()
    expect(getByText('Ringing until you open or accept them.')).toBeTruthy()
  })

  it('gathers the orders that arrive while it is open, and counts the same order once', async () => {
    const { getByText, queryByTestId } = await renderAlert()
    arrive(order(1052))
    arrive(order(1053))
    arrive(order(1053))
    expect(getByText('2 new orders')).toBeTruthy()
    expect(queryByTestId('alert-line-o:1052')).toBeTruthy()
    expect(queryByTestId('alert-line-o:1053')).toBeTruthy()
    // The repeat did not ring a third arrival: two arrivals, two starts of the sound.
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(2)
  })

  it('lists three orders and says "and N more"', async () => {
    const { getByText, queryByTestId } = await renderAlert()
    ;[1, 2, 3, 4, 5].forEach((id) => arrive(order(id)))
    expect(getByText('5 new orders')).toBeTruthy()
    expect(getByText('and 2 more')).toBeTruthy()
    expect(queryByTestId('alert-line-o:5')).toBeTruthy()
    expect(queryByTestId('alert-line-o:1')).toBeNull()
  })

  it('rings until it is closed: the sound again every few seconds and a repeating vibration, both stopped on close', async () => {
    const { getByTestId, queryByTestId } = await renderAlert()
    arrive(order(1))
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
    expect(Vibration.vibrate).toHaveBeenCalledWith(VIBRATION_PATTERN, true)
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(2)
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(3)

    ;(SoundPlayer.stop as jest.Mock).mockClear()
    fireEvent.press(getByTestId('new-order-close'))
    expect(queryByTestId('new-order-alert')).toBeNull()
    expect(SoundPlayer.stop).toHaveBeenCalled()
    expect(Vibration.cancel).toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS * 2) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(3)
  })

  it('Mute silences it without closing it, and a new order rings again', async () => {
    const { getByTestId, getByText, queryByTestId } = await renderAlert()
    arrive(order(1))
    ;(Vibration.cancel as jest.Mock).mockClear()
    fireEvent.press(getByTestId('new-order-mute'))
    expect(getByTestId('new-order-alert')).toBeTruthy()
    expect(getByText('Muted. It rings again when a new order arrives.')).toBeTruthy()
    expect(queryByTestId('new-order-mute')).toBeNull()
    expect(Vibration.cancel).toHaveBeenCalled()
    const rung = (SoundPlayer.playAsset as jest.Mock).mock.calls.length
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS * 3) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(rung)

    arrive(order(2))
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(rung + 1)
    expect(getByTestId('new-order-mute')).toBeTruthy()
  })

  it('an order that stops being pending leaves the alert, and the alert closes when none is left', async () => {
    const { queryByTestId, getByText } = await renderAlert()
    arrive(order(1052))
    arrive(order(1053))
    // Still pending (an edit): it stays.
    act(() => { mockState.events.emit('order_updated', { id: 1052, status: 0 }) })
    expect(queryByTestId('alert-line-o:1052')).toBeTruthy()
    // Accepted on another device.
    act(() => { mockState.events.emit('order_updated', { id: 1052, status: 7 }) })
    expect(queryByTestId('alert-line-o:1052')).toBeNull()
    expect(getByText('1 new order')).toBeTruthy()
    // Rejected, cancelled.
    act(() => { mockState.events.emit('order_updated', { id: 1053, status: 5 }) })
    expect(queryByTestId('new-order-alert')).toBeNull()
    expect(Vibration.cancel).toHaveBeenCalled()
  })

  it('does not tell an order that left as an "updated order"', async () => {
    const { queryByText } = await renderAlert()
    arrive(order(1052))
    act(() => { mockState.events.emit('order_updated_notification', { id: 1052, status: 7 }) })
    act(() => { mockState.events.emit('order_updated', { id: 1052, status: 7 }) })
    expect(queryByText('New orders have been updated!')).toBeNull()
  })

  it('Accept opens the accept sheet of that order and steps aside, quiet, until it closes', async () => {
    const screen = await renderAlert()
    const { queryByTestId } = screen
    const first = order(1052)
    arrive(first)
    arrive(order(1053))
    ;(SoundPlayer.playAsset as jest.Mock).mockClear()

    fireEvent.press(screen.getByTestId('alert-accept-o:1052'))
    expect(queryByTestId('new-order-alert')).toBeNull()
    expect(mockActions.openAccept).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS * 2) })
    expect(SoundPlayer.playAsset).not.toHaveBeenCalled()
    expect(mockActions.openAccept).toHaveBeenCalledTimes(1)
    const [sent, options] = mockActions.openAccept.mock.calls[0]
    expect(sent).toMatchObject({ id: 1052 })
    expect(options.orders).toBeUndefined()
    // Not the order's own screen: the app says it was accepted, and "View order" opens its details.
    expect(options.from).toBe('list')
    options.viewOrder(first)
    expect(mockNav.openOrderDetails).toHaveBeenCalledWith(1052)

    // The sheet accepted it and closed: the other order is still waiting.
    act(() => { options.onDone([first]); options.onClosed() })
    expect(queryByTestId('alert-line-o:1052')).toBeNull()
    expect(queryByTestId('alert-line-o:1053')).toBeTruthy()
    expect(SoundPlayer.playAsset).toHaveBeenCalled()
  })

  it('Accept on the only order and the sheet accepting it leaves nothing open', async () => {
    const screen = await renderAlert()
    const { queryByTestId } = screen
    const only = order(7)
    arrive(only)
    pressAccept(screen, 'o:7')
    const [, options] = mockActions.openAccept.mock.calls[0]
    act(() => { options.onDone([only]); options.onClosed() })
    expect(queryByTestId('new-order-alert')).toBeNull()
  })

  it('Accept on a cart group speaks for all its orders; the sheet dismissed brings the alert back', async () => {
    const screen = await renderAlert()
    const { queryByTestId } = screen
    arrive(order(1, { cart_group_id: 9 }))
    arrive(order(2, { cart_group_id: 9 }))
    pressAccept(screen, 'g:9')
    const [, options] = mockActions.openAccept.mock.calls[0]
    expect(options.orders.map((entry: any) => entry.id)).toEqual([1, 2])
    act(() => { options.onClosed() })
    expect(queryByTestId('alert-line-g:9')).toBeTruthy()
  })

  it('the sheet changes the status through the API of the alert itself: one request per order', async () => {
    const screen = await renderAlert()
    arrive(order(1))
    pressAccept(screen, 'o:1')
    const [, options] = mockActions.openAccept.mock.calls[0]
    let answer: any
    await act(async () => { answer = await options.handleChangeOrderStatus(7, [1], { status: 7, prepared_in: 20 }) })
    expect(mockState.save).toHaveBeenCalledWith({ status: 7, prepared_in: 20, id: 1 })
    expect(answer).toEqual([expect.objectContaining({ id: 1, error: false })])

    mockState.save.mockRejectedValueOnce(new Error('boom'))
    await act(async () => { answer = await options.handleChangeOrderStatus(7, [1], { status: 7 }) })
    expect(answer).toEqual([{ id: 1, result: ['boom'], error: true }])
  })

  it('tells the lists of the order it changed, so they do not wait for a socket event', async () => {
    const screen = await renderAlert()
    arrive(order(1))
    pressAccept(screen, 'o:1')
    const [, options] = mockActions.openAccept.mock.calls[0]
    const heard = jest.fn()
    mockState.events.on('order_changed_by_app', heard)
    mockState.save.mockResolvedValueOnce({ content: { result: { id: 1, status: 7 }, error: false } })
    await act(async () => { await options.handleChangeOrderStatus(7, [1], { status: 7, prepared_in: 20 }) })
    expect(heard).toHaveBeenCalledWith({ id: 1, status: 7 })

    heard.mockClear()
    mockState.save.mockResolvedValueOnce({ content: { result: ['no'], error: true } })
    await act(async () => { await options.handleChangeOrderStatus(7, [1], { status: 7 }) })
    expect(heard).not.toHaveBeenCalled()
  })

  it('View opens the order when there is one and the New list when there are several; either closes the alert', async () => {
    const one = await renderAlert()
    arrive(order(1053))
    fireEvent.press(one.getByTestId('new-order-view'))
    expect(mockNav.openOrderDetails).toHaveBeenCalledWith(1053)
    expect(one.queryByTestId('new-order-alert')).toBeNull()
    one.unmount()

    const several = await renderAlert()
    arrive(order(1))
    arrive(order(2))
    fireEvent.press(several.getByTestId('new-order-view'))
    expect(mockNav.openOrdersTab).toHaveBeenCalledWith('new', 'pending')
    expect(several.queryByTestId('new-order-alert')).toBeNull()
  })

  it('View orders opens New on Preorder when every order that rang is a preorder, on Pending when one is not', async () => {
    const preorders = await renderAlert()
    arrive(order(1, { status: 13 }))
    arrive(order(2, { status: 13 }))
    fireEvent.press(preorders.getByTestId('new-order-view'))
    expect(mockNav.openOrdersTab).toHaveBeenLastCalledWith('new', 'preorder')
    preorders.unmount()

    const mixed = await renderAlert()
    arrive(order(3, { status: 13 }))
    arrive(order(4, { status: 0 }))
    fireEvent.press(mixed.getByTestId('new-order-view'))
    expect(mockNav.openOrdersTab).toHaveBeenLastCalledWith('new', 'pending')
  })

  it('tells an updated order and a message after the new orders, one close each', async () => {
    const { getByText, getByTestId, queryByText } = await renderAlert()
    arrive(order(1))
    act(() => { mockState.events.emit('order_updated_notification', { id: 40, status: 7 }) })
    act(() => { mockState.events.emit('message_added_notification', { order: { id: 41 }, author_id: 99 }) })
    expect(getByText('1 new order')).toBeTruthy()
    fireEvent.press(getByTestId('new-order-close'))
    expect(getByText('New orders have been updated!')).toBeTruthy()
    expect(getByText('Order #40 has been updated.')).toBeTruthy()
    fireEvent.press(getByTestId('new-order-close'))
    expect(getByText('New messages have been received!')).toBeTruthy()
    expect(getByText('Order #41 has unread messages.')).toBeTruthy()
    fireEvent.press(getByTestId('new-order-view'))
    expect(mockNav.openOrderDetails).toHaveBeenCalledWith(41)
    expect(queryByText('New messages have been received!')).toBeNull()
  })

  it('ignores what the business itself did, a message of the chat on screen and the statuses the project does not notify', async () => {
    const { queryByTestId } = await renderAlert()
    arrive(order(1, { author_id: 1 }))
    expect(queryByTestId('new-order-alert')).toBeNull()

    mockState.chat = 41
    act(() => { mockState.events.emit('message_added_notification', { order: { id: 41 }, author_id: 99 }) })
    expect(queryByTestId('new-order-alert')).toBeNull()

    mockState.states = [0]
    const filtered = await renderAlert()
    arrive(order(2, { status: 7 }))
    expect(filtered.queryByTestId('alert-line-o:2')).toBeNull()
    arrive(order(3, { status: 0 }))
    expect(filtered.queryByTestId('alert-line-o:3')).toBeTruthy()
  })

  it('a store owner is told only about their own stores', async () => {
    mockState.user = { id: 1, level: 2 }
    const { queryByTestId } = await renderAlert()
    await settle()
    arrive(order(1, { business_id: 9 }))
    expect(queryByTestId('new-order-alert')).toBeNull()
    arrive(order(2, { business_id: 5 }))
    expect(queryByTestId('alert-line-o:2')).toBeTruthy()
  })

  it('hides the customer when the project asks, and writes the external id when it is the number', async () => {
    mockState.configs = { hide_customer_contact_business_app: { value: '1' }, change_order_id: { value: '1' } }
    const { getByText } = await renderAlert()
    arrive(order(1, { external_id: 'A-1' }))
    expect(getByText('#A-1 · Delivery')).toBeTruthy()
    expect(getByText('Customer · 3 products · $32.37')).toBeTruthy()
  })

  it('does not ring while the app is not in front, and rings when it comes back', async () => {
    let change: (state: string) => void = () => {}
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, handler: any) => { change = handler; return { remove: jest.fn() } }) as any)
    const { getByTestId } = await renderAlert()
    act(() => change('background'))
    arrive(order(1))
    expect(getByTestId('new-order-alert')).toBeTruthy()
    expect(SoundPlayer.playAsset).not.toHaveBeenCalled()
    expect(Vibration.vibrate).not.toHaveBeenCalled()
    act(() => change('active'))
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
  })

  it('follows the settings: ring once, and no vibration', async () => {
    updateAlertSettings({ ringUntilOpened: false, vibrate: false })
    const { queryByTestId } = await renderAlert()
    arrive(order(1))
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS * 4) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
    expect(Vibration.vibrate).not.toHaveBeenCalled()
    // Nothing "rings until opened": there is no Mute line either.
    expect(queryByTestId('new-order-ringing')).toBeNull()
  })

  it('plays the chosen sound through the one function that maps it', async () => {
    updateAlertSettings({ sound: 'chime' })
    await renderAlert()
    arrive(order(1))
    expect(SoundPlayer.playAsset).toHaveBeenCalledWith(alertSoundSource('chime').asset)
    expect(SoundPlayer.playAsset).not.toHaveBeenCalledWith(alertSoundSource('bell').asset)
    expect(SoundPlayer.playUrl).not.toHaveBeenCalled()
  })

  it('the test alert plays the sound that is chosen, not the first one', async () => {
    updateAlertSettings({ sound: 'alarm' })
    await renderAlert()
    act(() => requestTestAlert())
    expect(SoundPlayer.playAsset).toHaveBeenCalledWith(alertSoundSource('alarm').asset)
  })

  it('rings the Kitchen alarm again only after it has finished (it lasts 3 s)', async () => {
    updateAlertSettings({ sound: 'alarm' })
    await renderAlert()
    arrive(order(1))
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
    act(() => { jest.advanceTimersByTime(RING_EVERY_MS) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
    act(() => { jest.advanceTimersByTime(ringEveryMs('alarm') - RING_EVERY_MS) })
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(2)
  })

  it('the settings test alert shows a sample order marked as a test, with no Accept and no API call', async () => {
    const { getByText, getByTestId, queryByTestId } = await renderAlert()
    act(() => requestTestAlert())
    expect(getByText('Test order · Delivery')).toBeTruthy()
    expect(queryByTestId('alert-accept-o:test')).toBeNull()
    expect(SoundPlayer.playAsset).toHaveBeenCalledTimes(1)
    expect(mockState.save).not.toHaveBeenCalled()
    expect(mockNav.openOrderDetails).not.toHaveBeenCalled()
    // Its button only closes it.
    fireEvent.press(getByTestId('new-order-view'))
    expect(queryByTestId('new-order-alert')).toBeNull()
    expect(mockNav.openOrderDetails).not.toHaveBeenCalled()
  })

  it('says it is mounted, for the single buzz that stays only when the alert cannot show', async () => {
    expect(isAlertHostMounted()).toBe(false)
    const { unmount } = await renderAlert()
    expect(isAlertHostMounted()).toBe(true)
    unmount()
    expect(isAlertHostMounted()).toBe(false)
  })
})

describe('the alert sounds', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps each id to its own bundled file, and an unknown id to the Bell', () => {
    const assets = (['bell', 'chime', 'alarm'] as const).map((id) => alertSoundSource(id).asset)
    expect(new Set(assets).size).toBe(3)
    expect(alertSoundSource('nope' as any).asset).toBe(alertSoundSource('bell').asset)
    expect(alertSoundSource('chime').fallbackUrl).toMatch(/^https:/)
  })

  it('plays the bundled file of the id, and stops it', () => {
    const stop = playAlertSound('chime')
    expect(SoundPlayer.playAsset).toHaveBeenCalledWith(alertSoundSource('chime').asset)
    expect(SoundPlayer.playUrl).not.toHaveBeenCalled()
    stop()
    expect(SoundPlayer.stop).toHaveBeenCalled()
  })

  it('falls back to the remote file when the bundled one throws, and never throws itself', () => {
    ;(SoundPlayer.playAsset as jest.Mock).mockImplementationOnce(() => { throw new Error('no file') })
    expect(() => playAlertSound('bell')).not.toThrow()
    expect(SoundPlayer.playUrl).toHaveBeenCalledWith(alertSoundSource('bell').fallbackUrl)
  })

  it('falls back to the remote file when the system reports the bundled one could not be set up', () => {
    let report: () => void = () => {}
    ;(SoundPlayer.addEventListener as jest.Mock).mockImplementationOnce((_name: string, handler: () => void) => { report = handler; return { remove: jest.fn() } })
    playAlertSound('alarm')
    expect(SoundPlayer.playUrl).not.toHaveBeenCalled()
    report()
    expect(SoundPlayer.playUrl).toHaveBeenCalledWith(alertSoundSource('alarm').fallbackUrl)
  })
})
