import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'
import { freezeClock, restoreClock } from '../../../../../../jest/helpers/fakeClock'
import dayjs from '@/utils/dayjs'
import { defaultAppTheme } from '@/theme/engine'
import { formatClock } from '../../PreviousOrders/orderTimes'
import { orderTypeVariant } from '../../shared/orderTypeVariant'
import { OrderDetailsUI } from '../OrderDetailsPage'
import { ORDER_CHANGED_EVENT } from '../../OrdersOption/orderChanges'
import { RECONNECT_SETTLE_MS, SocketReconnectProvider } from '../../../../../context/SocketReconnectContext'

jest.mock('react-native-maps', () => require('../../OrderActions/__tests__/mocks').mapsMock())
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn() } }))

const mockActions = {
  openAccept: jest.fn(),
  openReject: jest.fn(),
  openPrepTime: jest.fn(),
  openAssignDriver: jest.fn(),
  openMore: jest.fn(),
  openForceStatus: jest.fn(),
  openMap: jest.fn(),
  openReview: jest.fn(),
  close: jest.fn()
}
jest.mock('../../OrderActions/useOrderActions', () => ({ useOrderActions: () => mockActions }))

const mockOffline: { state: any, functions: any } = { state: {}, functions: {} }
jest.mock('../../../context/OfflineActions', () => ({
  useOfflineActions: () => [mockOffline.state, mockOffline.functions]
}))

const components = require('@components')

const NOW = Date.parse('2026-11-19T12:26:00Z')
/** A moment of the tests as the page writes it: in the device's own time zone. */
const clockOf = (utc: string) => dayjs(Date.parse(utc)).format('HH:mm')
const parsePrice = (value: number) => `$${Number(value).toFixed(2)}`

const setup = ({ configs = {}, user = { id: 1, level: 2 }, messages }: { configs?: any, user?: any, messages?: any } = {}) => {
  components.useConfig.mockReturnValue([{ configs }])
  components.useSession.mockReturnValue([{ user }, {}])
  components.useUtils.mockReturnValue([{ parsePrice, parseNumber: (value: number) => value, timeFormat: 'HH:mm', dateFormat: 'DD/MM/YYYY' }, {}])
  void messages
}

const baseOrder = (extra: any = {}) => ({
  id: 1053,
  status: 0,
  delivery_type: 1,
  created_at: '2026-11-19 12:25:18',
  updated_at: '2026-11-19 12:25:18',
  delivery_datetime: '2026-11-19 12:25:18',
  customer_id: 3,
  business: { name: 'Luna Pizza', location: { lat: 4.6, lng: -74.1 } },
  customer: { name: 'James', lastname: 'Carter', cellphone: '4155550199', country_phone_code: '1', address: '58 Maple Ave', location: { lat: 4.7, lng: -74 } },
  paymethod: { gateway: 'stripe', name: 'Card' },
  payment_events: [{ id: 1, event: 'payment', amount: 32.37, paymethod: { gateway: 'stripe', name: 'Card' } }],
  products: [
    { id: 11, quantity: 1, name: 'Margherita pizza', price: 18, options: [{ name: 'Size', suboptions: [{ name: 'Large', quantity: 1, price: 0 }] }], comment: 'Well done, please' },
    { id: 12, quantity: 2, name: 'Lemonade', price: 2.5 }
  ],
  summary: { subtotal: 23, total: 32.37, delivery_price: 2.5, tax: 2.37, driver_tip: 3 },
  comment: 'Allergic to nuts.',
  ...extra
})

const history = (entries: Array<[string, number]>) =>
  entries.map(([created_at, status]) => ({ type: 2, created_at, data: [{ attribute: 'status', old: 0, new: status }] }))

/** An order accepted at 12:18 UTC (the business is 5 hours behind UTC): the order's last change is its acceptance. */
const preparing = (extra: any = {}) => baseOrder({
  status: 7,
  prepared_in: 20,
  updated_at: '2026-11-19 12:18:30',
  history: history([['2026-11-19 07:18:00', 7]]),
  ...extra
})

/** The mini map is hidden from a screen reader on purpose: the tests still look at it. */
const hiddenToo = { includeHiddenElements: true }

let navigation: any
const props = (order: any, extra: any = {}) => ({
  navigation,
  presentation: 'screen',
  order: { order, loading: false, error: null },
  drivers: { drivers: [], loadingDriver: false },
  handleChangeOrderStatus: jest.fn(async () => order),
  handleAssignDriver: jest.fn(),
  clearError: jest.fn(),
  getOrder: jest.fn(),
  readMessages: jest.fn(),
  loadMessages: jest.fn(),
  setShowReservationAlert: jest.fn(),
  clearRegressionRequest: jest.fn(),
  messages: { messages: [] },
  ...extra
})

const render = (ui: any, options?: any) => renderWithProviders(<OrderDetailsUI {...ui} />, options)

let dialogs: ReturnType<typeof captureDialogs>

beforeEach(async () => {
  await AsyncStorage.clear()
  freezeClock(NOW)
  navigation = { navigate: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) }
  mockOffline.state = { isNetConnected: true, canSaveChangesOffline: true }
  mockOffline.functions = { applyOffAction: jest.fn(), registerOffOrder: jest.fn() }
  setup()
  dialogs = captureDialogs()
})

afterEach(() => {
  dialogs.off()
  restoreClock()
})

describe('the shell of the page', () => {
  it('titles the page with the order, its store and when it was placed, and prints and opens more from the bar', () => {
    const ui = props(baseOrder())
    const { getByText, getByTestId } = render(ui)
    expect(getByText('Order #1053')).toBeTruthy()
    // The store's name and the time are two texts: only the name gives way when the line is short.
    expect(getByText('Luna Pizza')).toBeTruthy()
    expect(getByText(` · placed ${clockOf('2026-11-19T12:25:18Z')}`)).toBeTruthy()
    expect(getByText('Luna Pizza').props.numberOfLines).toBe(1)

    fireEvent.press(getByTestId('header-print'))
    expect(navigation.navigate).toHaveBeenCalledWith('TicketPreview', { order: ui.order.order, orderStatus: 'Pending' })

    fireEvent.press(getByTestId('header-more'))
    expect(mockActions.openMore).toHaveBeenCalledTimes(1)
    const handlers = mockActions.openMore.mock.calls[0][1]
    expect(handlers.onPrint).toBeInstanceOf(Function)
    expect(handlers.onCopy).toBeInstanceOf(Function)
    expect(handlers.onMessage).toBeInstanceOf(Function)
  })

  it('goes back, or to the orders tab when it was opened from a push with nothing behind it', () => {
    const { getByLabelText } = render(props(baseOrder()))
    fireEvent.press(getByLabelText(/back/i))
    expect(navigation.goBack).toHaveBeenCalled()

    navigation.canGoBack.mockReturnValue(false)
    fireEvent.press(getByLabelText(/back/i))
    expect(navigation.navigate).toHaveBeenCalledWith('BottomTab', { screen: 'Orders' })
  })

  it('the tablet panel closes with its arrow instead of leaving the screen', () => {
    const onClose = jest.fn()
    const { getByLabelText } = render(props(baseOrder(), { presentation: 'panel', onClose }), { platform: 'tablet' })
    fireEvent.press(getByLabelText(/back/i))
    expect(onClose).toHaveBeenCalled()
    expect(navigation.goBack).not.toHaveBeenCalled()
  })

  it('copies the order to the clipboard from the more sheet, Pending included', () => {
    const { getByTestId } = render(props(baseOrder()))
    fireEvent.press(getByTestId('header-more'))
    mockActions.openMore.mock.calls[0][1].onCopy()
    expect((Clipboard.setString as jest.Mock).mock.calls[0][0]).toContain('Order #1053 is Pending')
    expect(components.useToast.mock.results[0].value[1].showToast).toHaveBeenCalledWith('info', 'Copied', 1000)
  })

  it('the message button opens the chat and reads the messages', () => {
    const ui = props(baseOrder())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('customer-message'))
    expect(navigation.navigate).toHaveBeenCalledWith('OrderMessage', { orderId: 1053 })
    expect(ui.readMessages).toHaveBeenCalled()
    expect(ui.loadMessages).toHaveBeenCalled()
  })

  it('counts the messages the business has not read on the card\'s message button only: the header carries no mark', () => {
    const messages = { messages: [{ id: 1, author_id: 99, read: false }, { id: 2, author_id: 99, read: false }, { id: 3, author_id: 1, read: false }] }
    const { getByTestId, queryByTestId, getByText } = render(props(baseOrder(), { messages }))
    expect(getByTestId('customer-message-count')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(queryByTestId('header-more-dot')).toBeNull()
    expect(queryByTestId('header-message')).toBeNull()
  })
})

describe('a new order (stage new)', () => {
  it('says what the address note is: "Notes: 15", never a bare number under the address', () => {
    const { getByTestId } = render(props(baseOrder({ customer: { ...baseOrder().customer, address_notes: '15' } })))
    const flat = (node: any): string => [].concat(node.props.children).map((child: any) => (typeof child === 'string' ? child : child?.props ? flat(child) : '')).join('')
    expect(flat(getByTestId('customer-address-notes'))).toBe('Notes: 15')
  })

  it('draws the customer, the note, the products, the payment and the bill, and no preparation pieces', () => {
    const { getByTestId, getByText, queryByTestId } = render(props(baseOrder()))
    expect(getByTestId('status-chip')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
    expect(getByText('Waiting 00:42')).toBeTruthy()
    expect(getByTestId('customer-name').props.children).toBe('James Carter')
    expect(getByTestId('customer-address')).toBeTruthy()
    expect(getByText('Order note')).toBeTruthy()
    expect(getByText('Allergic to nuts.')).toBeTruthy()
    expect(getByText('2 products · 3 items')).toBeTruthy()
    expect(getByText('Size: Large')).toBeTruthy()
    expect(getByText('Note: Well done, please')).toBeTruthy()
    expect(getByTestId('payment-amount').props.children).toBe('$32.37')
    expect(getByTestId('payment-paid')).toBeTruthy()
    expect(getByTestId('order-bill')).toBeTruthy()
    expect(queryByTestId('prep-card')).toBeNull()
    expect(queryByTestId('product-check-11')).toBeNull()
    expect(queryByTestId('driver-card')).toBeNull()
  })

  it('has Reject and Accept in the bar; Accept opens the sheet at once (never guarded), Reject opens its own sheet', () => {
    const ui = props(baseOrder())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-accept'))
    // From the order's own screen: the sheet is told so, and no notice follows an accept there.
    expect(mockActions.openAccept).toHaveBeenCalledWith(ui.order.order, { changeStatus: expect.any(Function), from: 'details' })
    fireEvent.press(getByTestId('bar-reject'))
    expect(mockActions.openReject).toHaveBeenCalledWith(ui.order.order, { changeStatus: expect.any(Function) })
    expect(dialogs.requests).toHaveLength(0)
    expect(ui.handleChangeOrderStatus).not.toHaveBeenCalled()
  })

  it('disables the bar while a change is going on', () => {
    const ui = props(baseOrder())
    ui.order.loading = true
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-accept'))
    expect(mockActions.openAccept).not.toHaveBeenCalled()
  })

  it('a pre-order has the new layout without a bar and says when it is for', () => {
    const { getByText, queryByTestId, getByTestId } = render(props(baseOrder({ status: 13, delivery_datetime: '2026-12-01 18:30:00' })))
    expect(getByText('Preorder')).toBeTruthy()
    expect(getByTestId('status-clock')).toBeTruthy()
    expect(getByText('01/12/2026 18:30')).toBeTruthy()
    expect(queryByTestId('order-bar')).toBeNull()
  })

  it('a pre-order that is a reservation reads Reservation', () => {
    const { getByTestId } = render(props(baseOrder({ status: 13, delivery_type: 9, reservation: { reserve_date: '2026-12-01 18:30:00', guests_reservation: 4 } })))
    expect(getByTestId('status-chip').findByProps({ children: 'Reservation' })).toBeTruthy()
    expect(getByTestId('customer-reservation')).toBeTruthy()
  })
})

describe('an order being made (stage preparing)', () => {
  it('counts down to the promised time with a bar, and offers Adjust time', () => {
    const ui = props(preparing())
    const { getByTestId, getByText } = render(ui)
    // accepted 12:18, 20 minutes: promised 12:38, 12 minutes left now
    expect(getByTestId('prep-figure').props.children).toBe('12:00')
    expect(getByText(`Promised for ${clockOf('2026-11-19T12:38:00Z')}`)).toBeTruthy()
    expect(getByTestId('prep-progress').props.accessibilityValue.now).toBe(40)
    fireEvent.press(getByTestId('prep-adjust'))
    expect(mockActions.openPrepTime).toHaveBeenCalledWith(ui.order.order, { changeStatus: expect.any(Function) })
  })

  it('says how late it is, and the bar is full, once the promised time has gone', () => {
    const order = preparing({ prepared_in: 5 })
    const { getByTestId, getByText } = render(props(order))
    expect(getByText('Late by')).toBeTruthy()
    expect(getByTestId('prep-figure').props.children).toBe('03:00')
    expect(getByTestId('prep-progress').props.accessibilityValue.now).toBe(100)
  })

  it('hides the figure and the bar with the countdown key, keeping the promised time and Adjust time', () => {
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.countdown'] = false })
    const { queryByTestId, getByText } = render(props(preparing()), { themeOverrides: theme })
    expect(queryByTestId('prep-figure')).toBeNull()
    expect(queryByTestId('prep-progress')).toBeNull()
    expect(getByText(`Promised for ${clockOf('2026-11-19T12:38:00Z')}`)).toBeTruthy()
    expect(queryByTestId('prep-adjust')).toBeTruthy()
  })

  it('has a checkbox on each product, counted, kept on the device', async () => {
    const { getByTestId, getByText } = render(props(preparing()))
    await act(async () => {})
    expect(getByTestId('products-done').props.children).toBe('0 of 2 done')
    await act(async () => { fireEvent.press(getByTestId('product-check-11')) })
    expect(getByTestId('products-done').props.children).toBe('1 of 2 done')
    expect(getByText('Margherita pizza')).toBeTruthy()
  })

  it('has no checkboxes when the theme turns the checklist off', () => {
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.checklist'] = false })
    const { queryByTestId } = render(props(preparing()), { themeOverrides: theme })
    expect(queryByTestId('product-check-11')).toBeNull()
    expect(queryByTestId('products-done')).toBeNull()
  })

  it('words the ready button by the kind of order, as the card does: Mark ready on a delivery, for pickup on a pickup', () => {
    expect(render(props(preparing({ delivery_type: 1 }))).getByText('Mark ready')).toBeTruthy()
    expect(render(props(preparing({ delivery_type: 2 }))).getByText('Mark ready for pickup')).toBeTruthy()
  })

  it('marks it ready with one tap, no question', () => {
    const ui = props(preparing())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-ready'))
    expect(dialogs.requests).toHaveLength(0)
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledWith(4)
  })

  it('shows the total as a folded row that opens to the bill', () => {
    const { getByTestId, queryByTestId } = render(props(preparing()))
    expect(queryByTestId('order-bill')).toBeNull()
    fireEvent.press(getByTestId('payment-folded'))
    expect(getByTestId('order-bill')).toBeTruthy()
  })

  it('assigns the driver from its card when the project and the user allow it', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const ui = props(preparing())
    const { getByTestId, getByText } = render(ui)
    expect(getByText('Not assigned yet')).toBeTruthy()
    fireEvent.press(getByTestId('driver-assign'))
    expect(mockActions.openAssignDriver).toHaveBeenCalledWith(ui.order.order, { drivers: [], handleAssignDriver: expect.any(Function) })
  })

  it('shows the assigned driver without a button when assignment is not enabled, and nothing when there is none', () => {
    const withDriver = render(props(preparing({ driver: { id: 5, name: 'Omar', lastname: 'Hassan' } })))
    expect(withDriver.getByTestId('driver-name').props.children).toBe('Omar H.')
    expect(withDriver.queryByTestId('driver-assign')).toBeNull()
    withDriver.unmount()
    const without = render(props(preparing()))
    expect(without.queryByTestId('driver-card')).toBeNull()
  })

  it('has no Assign (and no driver card on an order in preparation) when the project has manual assignment off or the store app switch is 0', () => {
    for (const configs of [
      {},
      { assign_driver_enabled: { value: '0' } },
      { assign_driver_enabled: { value: '1' }, store_app_manual_driver_assignment_enabled: { value: '0' } }
    ]) {
      setup({ configs })
      const screen = render(props(preparing()))
      expect(screen.queryByTestId('driver-assign')).toBeNull()
      expect(screen.queryByTestId('driver-card')).toBeNull()
      screen.unmount()
    }
  })

  it('has Assign on an unassigned delivery in preparation with the project\'s switch on (and the store app\'s on or missing)', () => {
    for (const configs of [
      { assign_driver_enabled: { value: '1' } },
      { assign_driver_enabled: { value: '1' }, store_app_manual_driver_assignment_enabled: { value: '1' } }
    ]) {
      setup({ configs })
      const screen = render(props(preparing()))
      expect(screen.getByTestId('driver-assign')).toBeTruthy()
      screen.unmount()
    }
  })

  it('has Change when a driver is already there, and it opens the same sheet', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const ui = props(preparing({ driver: { id: 5, name: 'Omar', lastname: 'Hassan' } }))
    const { getByTestId, getByText } = render(ui)
    expect(getByText('Change')).toBeTruthy()
    fireEvent.press(getByTestId('driver-assign'))
    expect(mockActions.openAssignDriver).toHaveBeenCalledWith(ui.order.order, { drivers: [], handleAssignDriver: expect.any(Function) })
  })

  it('also offers the assignment from the More sheet\'s options with the same call', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const ui = props(preparing())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('header-more'))
    expect(mockActions.openMore.mock.calls[0][1].assignDriver).toEqual({ drivers: [], handleAssignDriver: expect.any(Function) })
  })

  it('no driver card for a pickup order', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const { queryByTestId } = render(props(preparing({ delivery_type: 2 })))
    expect(queryByTestId('driver-card')).toBeNull()
  })

  it('a reservation says when it is for as a notice, and answers customer arrived or not (the first one asks)', () => {
    const order = preparing({ delivery_type: 9, reservation: { reserve_date: '2026-11-19 20:00:00', guests_reservation: 2 } })
    const ui = props(order)
    const { getByTestId, queryByTestId, getByText } = render(ui)
    expect(getByTestId('reservation-notice')).toBeTruthy()
    expect(getByText('Scheduled for: 19/11/2026 20:00')).toBeTruthy()
    expect(queryByTestId('bar-ready')).toBeNull()
    // "Customer not arrived" beside "Customer arrived": both labels are as long, the pair stays 1 : 1.
    const flexOf = (id: string) => require('react-native').StyleSheet.flatten(getByTestId(id).props.style).flex
    expect(flexOf('bar-not_arrived-cell')).toBe(1)
    expect(flexOf('bar-arrived-cell')).toBe(1)

    fireEvent.press(getByTestId('bar-arrived'))
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledWith(15)

    fireEvent.press(getByTestId('bar-not_arrived'))
    expect(dialogs.requests).toHaveLength(1)
    expect(dialogs.last()).toMatchObject({ acceptText: 'Customer not arrived', destructive: true })
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledTimes(1)
    act(() => { dialogs.accept() })
    expect(ui.handleChangeOrderStatus).toHaveBeenLastCalledWith(17)
  })

  it('consumes the controller\'s reservation alert (the page never raises a system alert)', () => {
    const ui = props(preparing({ delivery_type: 9, reservation: { reserve_date: '2026-11-19 20:00:00', guests_reservation: 2 } }), { showReservationAlert: true })
    render(ui)
    expect(ui.setShowReservationAlert).toHaveBeenCalledWith(false)
  })

  it('opens the reason sheet when the API refuses a status regression', () => {
    const ui = props(preparing(), { regressionRequest: { status: 4, body: { status: 4 } } })
    render(ui)
    expect(mockActions.openForceStatus).toHaveBeenCalledWith(ui.order.order, { changeStatus: expect.any(Function), pendingStatusBody: { status: 4 } })
    expect(ui.clearRegressionRequest).toHaveBeenCalled()
  })
})

describe('an order ready for pickup (stage ready_handoff)', () => {
  const ready = (extra: any = {}) => baseOrder({
    status: 4,
    delivery_type: 2,
    updated_at: '2026-11-19 12:21:30',
    history: history([['2026-11-19 07:21:00', 4]]),
    ...extra
  })

  it('has the hand-off card instead of the customer card, the notice and how long it has waited', () => {
    const { getByTestId, queryByTestId, getByText } = render(props(ready()))
    expect(getByTestId('handoff-name').props.children).toBe('James Carter')
    expect(getByText('Ask for order #1053')).toBeTruthy()
    expect(queryByTestId('customer-card')).toBeNull()
    expect(getByText(`We told the customer the order is ready at ${clockOf('2026-11-19T12:21:00Z')}.`)).toBeTruthy()
    expect(getByText('Waiting 05:00')).toBeTruthy()
    expect(getByText('Ready for pickup')).toBeTruthy()
  })

  it('counts the wait from the moment it was ready even when the order has no history (only its last change)', () => {
    const { getByTestId, getByText } = render(props(ready({ history: undefined })))
    expect(getByText('Waiting 04:30')).toBeTruthy()
    expect(getByTestId('status-clock')).toBeTruthy()
  })

  it('writes a long wait as the orders list does, never as h:mm:ss', () => {
    const { getByText } = render(props(ready({ history: undefined, updated_at: '2026-11-19 09:20:00' })))
    expect(getByText(`Waiting ${formatClock(3 * 3600 + 6 * 60, undefined)}`)).toBeTruthy()
    expect(getByText('Waiting 3h 6m')).toBeTruthy()
  })

  it('has the call and message buttons on plain white boxes (not outlined black) as the mockup draws them', () => {
    const { getByTestId } = render(props(ready()))
    for (const id of ['handoff-call', 'handoff-message']) {
      const given = getByTestId(id).props.style
      const flat = require('react-native').StyleSheet.flatten(typeof given === 'function' ? given({ pressed: false }) : given) ?? {}
      expect(flat.borderWidth ?? 0).toBe(0)
      expect(flat.backgroundColor === undefined || flat.backgroundColor === 'transparent').toBe(true)
    }
    expect(getByTestId('handoff-message')).toBeTruthy()
  })

  it('keeps the 1 : 2 bar of reject and accept on a new order', () => {
    const { getByTestId } = render(props(baseOrder()))
    const flexOf = (id: string) => require('react-native').StyleSheet.flatten(getByTestId(id).props.style).flex
    expect(flexOf('bar-reject-cell')).toBe(1)
    expect(flexOf('bar-accept-cell')).toBe(2)
  })

  it('the hand-off bar is 1 : 2 as the mockup draws it: "Not picked up" beside "Picked up"', () => {
    const { getByTestId } = render(props(ready()))
    const flexOf = (id: string) => require('react-native').StyleSheet.flatten(getByTestId(id).props.style).flex
    expect(flexOf('bar-not_picked_up-cell')).toBe(1)
    expect(flexOf('bar-picked_up-cell')).toBe(2)
  })

  it('shows the customer card when the theme hides the hand-off card', () => {
    const theme = themeWithValues((values) => {
      values.pages.order_details.sections = values.pages.order_details.sections.map((section: any) => section.key === 'handoff' ? { ...section, visible: false } : section)
    })
    const { getByTestId, queryByTestId } = render(props(ready()), { themeOverrides: theme })
    expect(queryByTestId('handoff-card')).toBeNull()
    expect(getByTestId('customer-card')).toBeTruthy()
  })

  it('picked up is one tap; not picked up asks first', () => {
    const ui = props(ready())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-picked_up'))
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledWith(15)
    expect(dialogs.requests).toHaveLength(0)

    fireEvent.press(getByTestId('bar-not_picked_up'))
    expect(dialogs.last()).toMatchObject({ acceptText: 'Not picked up', destructive: true })
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledTimes(1)
    act(() => { dialogs.cancel() })
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledTimes(1)
    fireEvent.press(getByTestId('bar-not_picked_up'))
    act(() => { dialogs.accept() })
    expect(ui.handleChangeOrderStatus).toHaveBeenLastCalledWith(17)
  })
})

describe('an order with a driver (stage with_driver)', () => {
  const onTheWay = (extra: any = {}) => baseOrder({
    status: 9,
    driver: { id: 5, name: 'Omar', lastname: 'Hassan', cellphone: '4155550300', country_phone_code: '1', location: { lat: 4.65, lng: -74.05 } },
    updated_at: '2026-11-19 12:14:30',
    history: history([['2026-11-19 07:00:00', 7], ['2026-11-19 07:08:00', 4], ['2026-11-19 07:14:00', 9]]),
    ...extra
  })

  it('leads with the driver, then the timeline, and has no bar and no assign button once it is on the way', () => {
    const { getByTestId, queryByTestId, getByText } = render(props(onTheWay()))
    expect(getByTestId('driver-name').props.children).toBe('Omar H.')
    expect(getByTestId('timeline-step-accepted')).toBeTruthy()
    expect(getByTestId('timeline-step-ready')).toBeTruthy()
    expect(getByTestId('timeline-step-picked_up_by_driver')).toBeTruthy()
    expect(getByTestId('timeline-step-on_the_way')).toBeTruthy()
    expect(queryByTestId('order-bar')).toBeNull()
    expect(queryByTestId('driver-assign')).toBeNull()
    expect(getByText("The driver completes this order. We'll let you know when it's delivered.")).toBeTruthy()
  })

  it('tracks the driver on the map', () => {
    const ui = props(onTheWay(), { driverLocation: { lat: 4.66, lng: -74.04 } })
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('driver-track'))
    expect(mockActions.openMap).toHaveBeenCalledWith(ui.order.order, { driverLocation: { lat: 4.66, lng: -74.04 } })
  })

  it('hides Track on map with the directions key', () => {
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.directions'] = false })
    const { queryByTestId } = render(props(onTheWay()), { themeOverrides: theme })
    expect(queryByTestId('driver-track')).toBeNull()
  })

  it('folds the products and the total', () => {
    const { getByTestId, queryByTestId } = render(props(onTheWay()))
    expect(queryByTestId('products-card')).toBeNull()
    expect(getByTestId('products-folded')).toBeTruthy()
    expect(getByTestId('payment-folded')).toBeTruthy()
  })

  it('has no timeline without a history', () => {
    const { queryByTestId } = render(props(onTheWay({ history: undefined })))
    expect(queryByTestId('timeline-card')).toBeNull()
  })

  it('a ready delivery with no driver offers the assignment', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const ui = props(baseOrder({ status: 4, delivery_type: 1 }))
    const { getByTestId, getByText } = render(ui)
    expect(getByText('Not assigned yet')).toBeTruthy()
    fireEvent.press(getByTestId('driver-assign'))
    expect(mockActions.openAssignDriver).toHaveBeenCalledWith(ui.order.order, { drivers: [], handleAssignDriver: expect.any(Function) })
  })

  it('a ready delivery with no driver shows the card without the button when the project has assignment off', () => {
    const { getByTestId, queryByTestId, getByText } = render(props(baseOrder({ status: 4, delivery_type: 1 })))
    expect(getByTestId('driver-card')).toBeTruthy()
    expect(getByText('Not assigned yet')).toBeTruthy()
    expect(queryByTestId('driver-assign')).toBeNull()
  })

  it('has no assignment once the driver is on the way (only status 7 and 4 allow it)', () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    expect(render(props(onTheWay())).queryByTestId('driver-assign')).toBeNull()
  })

  it('the driver\'s name leads and "Driver" is under it; without a driver "Driver" leads', () => {
    const texts = (screen: any) => screen.getByTestId('driver-card').findAllByType(require('react-native').Text).map((node: any) => String(node.props.children))
    const withDriver = render(props(onTheWay()))
    const lines = texts(withDriver)
    expect(lines.indexOf('Omar H.')).toBeGreaterThanOrEqual(0)
    expect(lines.indexOf('Driver')).toBe(lines.indexOf('Omar H.') + 1)
    withDriver.unmount()
    const without = render(props(baseOrder({ status: 4, delivery_type: 1 })))
    const empty = texts(without)
    expect(empty.indexOf('Not assigned yet')).toBe(empty.indexOf('Driver') + 1)
  })

  describe('the mini map', () => {
    it('draws the store, the customer and the driver as markers, and cannot be moved', () => {
      const { getByTestId, getAllByTestId } = render(props(onTheWay()))
      const map = getByTestId('map-view', hiddenToo)
      expect(getAllByTestId('map-marker', hiddenToo)).toHaveLength(3)
      for (const party of ['store', 'customer', 'driver']) expect(getByTestId(`map-marker-${party}`, hiddenToo)).toBeTruthy()
      expect(map.props).toMatchObject({ scrollEnabled: false, zoomEnabled: false, rotateEnabled: false, pitchEnabled: false })
      expect(getByTestId('mini-map', hiddenToo).props.pointerEvents).toBe('none')
      // A picture for the eye only: a screen reader goes on to the "Track on map" button.
      expect(getByTestId('mini-map', hiddenToo).props.importantForAccessibility).toBe('no-hide-descendants')
    })

    it('frames the places with the marker\'s size as room on every side, so no disc sits on the box\'s edge', () => {
      const { testState } = require('../../OrderActions/__tests__/setup')
      testState.mapFit.mockClear()
      render(props(onTheWay()))
      const [coordinates, options] = testState.mapFit.mock.calls[0]
      expect(coordinates).toHaveLength(3)
      expect(options.edgePadding).toEqual({ top: 44, right: 44, bottom: 44, left: 44 })
    })

    it('does not draw a place the API never located (0, 0): no map frames it with its customer', () => {
      const { getAllByTestId, queryByTestId } = render(props(onTheWay({ business: { name: 'Luna Pizza', location: { lat: 0, lng: 0, zipcode: -1, zoom: 15 } }, driver: { id: 5, name: 'Omar', lastname: 'Hassan' } })))
      expect(getAllByTestId('map-marker', hiddenToo)).toHaveLength(1)
      expect(queryByTestId('map-marker-store', hiddenToo)).toBeNull()
    })

    it('follows the driver\'s live position when the page has it', () => {
      const { getAllByTestId } = render(props(onTheWay(), { driverLocation: { lat: 4.66, lng: -74.04 } }))
      const driver = getAllByTestId('map-marker', hiddenToo).find((node: any) => node.props.coordinate.latitude === 4.66)
      expect(driver).toBeTruthy()
    })

    it('draws only the places the order has, and nothing when it has none', () => {
      const some = render(props(onTheWay({ driver: { id: 5, name: 'Omar', lastname: 'Hassan' }, customer: { name: 'James', lastname: 'Carter', address: '58 Maple Ave' } })))
      expect(some.getAllByTestId('map-marker', hiddenToo)).toHaveLength(1)
      some.unmount()
      const none = render(props(onTheWay({ business: { name: 'Luna Pizza' }, driver: { id: 5, name: 'Omar', lastname: 'Hassan' }, customer: { name: 'James', lastname: 'Carter', address: '58 Maple Ave' } })))
      expect(none.queryByTestId('mini-map', hiddenToo)).toBeNull()
      expect(none.queryByTestId('map-view', hiddenToo)).toBeNull()
    })

    it('is for the delivery stage only, and the theme can hide it (map.mini_map)', () => {
      expect(render(props(preparing())).queryByTestId('mini-map', hiddenToo)).toBeNull()
      const theme = themeWithValues((values) => { values.visibility['map.mini_map'] = false })
      const hidden = render(props(onTheWay()), { themeOverrides: theme })
      expect(hidden.queryByTestId('mini-map', hiddenToo)).toBeNull()
      expect(hidden.getByTestId('driver-track')).toBeTruthy()
    })

    it('sits between the driver\'s line and "Track on map"', () => {
      const { getByTestId } = render(props(onTheWay()))
      const ids = getByTestId('driver-card').findAll((node: any) => ['driver-name', 'mini-map', 'driver-track'].includes(node.props.testID), { deep: true }).map((node: any) => node.props.testID)
      expect(Array.from(new Set(ids))).toEqual(['driver-name', 'mini-map', 'driver-track'])
    })
  })
})

describe('a finished order (stage done)', () => {
  const done = (extra: any = {}) => baseOrder({
    status: 1,
    updated_at: '2026-11-19 12:48:30',
    created_at: '2026-11-19 12:20:00',
    history: history([['2026-11-19 07:22:00', 7], ['2026-11-19 07:35:00', 4], ['2026-11-19 07:48:00', 1]]),
    ...extra
  })

  it('asks for a review first, shows how long it took and folds the timeline, with no message button', () => {
    const ui = props(done())
    const { getByTestId, queryByTestId, getByText } = render(ui)
    expect(getByText('Completed')).toBeTruthy()
    expect(getByText('Took 28 min')).toBeTruthy()
    expect(getByTestId('review-card')).toBeTruthy()
    expect(getByTestId('timeline-folded')).toBeTruthy()
    expect(queryByTestId('customer-message')).toBeNull()
    expect(queryByTestId('order-bill')).toBeTruthy()
    fireEvent.press(getByTestId('review-write'))
    expect(mockActions.openReview).toHaveBeenCalledWith(ui.order.order, undefined)
    expect(getByTestId('review-star-4').props.accessibilityLabel).toBe('4 of 5 stars')
    expect(getByTestId('review-star-1').props.accessibilityLabel).toBe('1 of 5 stars')
    fireEvent.press(getByTestId('review-star-4'))
    expect(mockActions.openReview).toHaveBeenLastCalledWith(ui.order.order, { qualification: 4 })
  })

  it('does not ask for a review when the customer was already reviewed or there is none', () => {
    expect(render(props(done({ user_review: { qualification: 5 } }))).queryByTestId('review-card')).toBeNull()
    expect(render(props(done({ customer_id: null }))).queryByTestId('review-card')).toBeNull()
  })

  it('a completed pickup (15) can be reviewed too', () => {
    const { getByTestId } = render(props(done({ status: 15, delivery_type: 2 })))
    expect(getByTestId('review-card')).toBeTruthy()
  })

  it('has only Print ticket in the bar, which opens the ticket', () => {
    const ui = props(done())
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-print'))
    expect(navigation.navigate).toHaveBeenCalledWith('TicketPreview', { order: ui.order.order, orderStatus: 'Completed' })
    expect(ui.handleChangeOrderStatus).not.toHaveBeenCalled()
  })

  it('has neither print icon nor print button when the theme hides print', () => {
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.print'] = false })
    const { queryByTestId } = render(props(done()), { themeOverrides: theme })
    expect(queryByTestId('header-print')).toBeNull()
    expect(queryByTestId('bar-print')).toBeNull()
    expect(queryByTestId('order-bar')).toBeNull()
  })
})

describe('a closed order (stage closed)', () => {
  const closed = (extra: any = {}) => baseOrder({ status: 5, reject_reason: 'Item out of stock', ...extra })

  it('is the finished layout with a red chip, the reason as a note and a print button', () => {
    const { getByTestId, getByText } = render(props(closed()))
    expect(getByText('Rejected by business')).toBeTruthy()
    expect(getByTestId('closed-reason')).toBeTruthy()
    expect(getByText('Item out of stock')).toBeTruthy()
    expect(getByTestId('bar-print')).toBeTruthy()
    expect(getByTestId('review-card')).toBeTruthy()
  })

  it('has no reason note when there is none', () => {
    const { queryByTestId } = render(props(closed({ reject_reason: undefined })))
    expect(queryByTestId('closed-reason')).toBeNull()
  })
})

describe('a failed step (the page stays)', () => {
  it('shows the failure as a notice with Try again, keeps the page and the bar, and repeats the step', async () => {
    const ui = props(preparing())
    const { getByTestId, queryByTestId, rerender, getByText } = render(ui)
    await act(async () => { fireEvent.press(getByTestId('bar-ready')) })
    expect(queryByTestId('order-error')).toBeNull()

    // The controller reports the failure on the order's state.
    const failed = { ...ui, order: { order: ui.order.order, loading: false, error: ['Network request failed'] } }
    rerender(<OrderDetailsUI {...failed} />)
    expect(getByTestId('order-error')).toBeTruthy()
    expect(getByText("Couldn't mark the order as ready")).toBeTruthy()
    expect(getByText('Network request failed')).toBeTruthy()
    expect(getByTestId('customer-card')).toBeTruthy()
    expect(getByTestId('bar-ready')).toBeTruthy()

    await act(async () => { fireEvent.press(getByTestId('order-error-retry')) })
    expect(ui.clearError).toHaveBeenCalled()
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledTimes(2)
    expect(ui.handleChangeOrderStatus).toHaveBeenLastCalledWith(4)
  })

  it('names the step that failed', async () => {
    const ui = props(baseOrder({ status: 4, delivery_type: 2 }))
    const { getByTestId, rerender, getByText } = render(ui)
    await act(async () => { fireEvent.press(getByTestId('bar-picked_up')) })
    rerender(<OrderDetailsUI {...ui} order={{ order: ui.order.order, loading: false, error: ['x'] }} />)
    expect(getByText("Couldn't mark the order as picked up")).toBeTruthy()
  })

  it('with a controller that cannot clear its error the notice still shows, and an error from before the step is not shown', async () => {
    const stale = ['An old failure']
    const ui = props(preparing(), { clearError: undefined, order: { order: preparing(), loading: false, error: stale } })
    const { getByTestId, queryByTestId, rerender } = render(ui)
    expect(queryByTestId('order-error')).toBeNull()
    await act(async () => { fireEvent.press(getByTestId('bar-ready')) })
    // Still the same old error after the step: not a failure of the step.
    rerender(<OrderDetailsUI {...ui} />)
    expect(queryByTestId('order-error')).toBeNull()
    // A new error (a new array): the step failed.
    rerender(<OrderDetailsUI {...ui} order={{ order: ui.order.order, loading: false, error: ['A new failure'] }} />)
    expect(getByTestId('order-error')).toBeTruthy()
    await act(async () => { fireEvent.press(getByTestId('order-error-retry')) })
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledTimes(2)
  })

  it('does not draw the notice for an error of a sheet (it shows its own)', () => {
    const { queryByTestId } = render(props(preparing(), { order: { order: preparing(), loading: false, error: ['Sheet failure'] } }))
    expect(queryByTestId('order-error')).toBeNull()
  })
})

describe('loading and not found', () => {
  it('draws the skeleton with the bar and its back arrow while the order loads', () => {
    const { getByTestId, getByLabelText, queryByTestId } = render(props(null, { order: { order: null, loading: true, error: null } }))
    expect(getByTestId('order-skeleton')).toBeTruthy()
    expect(getByLabelText(/back/i)).toBeTruthy()
    expect(queryByTestId('order-bar')).toBeNull()
  })

  it('a load error keeps the bar, says why and tries again', () => {
    const ui = props(null, { order: { order: null, loading: false, error: ['Order not found'] } })
    const { getByTestId, getByText, getByLabelText } = render(ui)
    expect(getByText('Order not found')).toBeTruthy()
    expect(getByLabelText(/back/i)).toBeTruthy()
    fireEvent.press(getByTestId('order-load-retry'))
    expect(ui.clearError).toHaveBeenCalled()
    expect(ui.getOrder).toHaveBeenCalled()
    fireEvent.press(getByTestId('order-go-orders'))
    expect(navigation.navigate).toHaveBeenCalledWith('BottomTab', { screen: 'Orders' })
  })
})

describe('what the server\'s configuration decides', () => {
  it('hides the customer\'s name, phone, call and message buttons when the business hides the contact, and keeps the address', () => {
    setup({ configs: { hide_customer_contact_business_app: { value: '1' } } })
    const { getByTestId, queryByTestId, getByText } = render(props(baseOrder()))
    expect(getByTestId('customer-name').props.children).toBe('Customer')
    expect(queryByTestId('customer-phone')).toBeNull()
    expect(queryByTestId('customer-call')).toBeNull()
    expect(queryByTestId('customer-message')).toBeNull()
    expect(getByTestId('customer-address')).toBeTruthy()
    expect(getByText('58 Maple Ave')).toBeTruthy()
  })

  it('hides the hand-off card\'s name and buttons too', () => {
    setup({ configs: { hide_customer_contact_business_app: { value: '1' } } })
    const { getByTestId, queryByTestId } = render(props(baseOrder({ status: 4, delivery_type: 2 })))
    expect(getByTestId('handoff-name').props.children).toBe('Customer')
    expect(queryByTestId('handoff-call')).toBeNull()
    expect(queryByTestId('handoff-message')).toBeNull()
  })

  it('writes the external id as the order number when the project asks, and not again in More details', () => {
    setup({ configs: { change_order_id: { value: '1' } } })
    const { getByText, getByTestId, queryByTestId } = render(props(baseOrder({ external_id: 'EXT-77' })))
    expect(getByText('Order #EXT-77')).toBeTruthy()
    fireEvent.press(getByTestId('more-details'))
    expect(queryByTestId('more-external_id')).toBeNull()
  })

  it('lists the external id in More details otherwise', () => {
    const { getByTestId } = render(props(baseOrder({ external_id: 'EXT-77' })))
    fireEvent.press(getByTestId('more-details'))
    expect(getByTestId('more-external_id')).toBeTruthy()
  })

  it('draws no bill for an order that costs nothing', () => {
    const { queryByTestId } = render(props(baseOrder({ summary: { total: 0 } })))
    expect(queryByTestId('payment-card')).toBeNull()
  })

  it('has no message button for an ended order or when the theme hides messages', () => {
    expect(render(props(baseOrder({ status: 1 }))).queryByTestId('customer-message')).toBeNull()
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.messages'] = false })
    expect(render(props(baseOrder()), { themeOverrides: theme }).queryByTestId('customer-message')).toBeNull()
  })

  it('keeps the distance in the project\'s unit', () => {
    setup({ configs: { distance_unit: { value: 'mi' } } })
    const { getByTestId } = render(props(baseOrder()))
    expect(getByTestId('customer-where').props.children).toMatch(/mi from the store/)
  })

  it('hides a section the theme hides', () => {
    const theme = themeWithValues((values) => {
      values.pages.order_details.sections = values.pages.order_details.sections.map((section: any) => ['bill', 'more_details'].includes(section.key) ? { ...section, visible: false } : section)
    })
    const { queryByTestId } = render(props(baseOrder()), { themeOverrides: theme })
    expect(queryByTestId('payment-card')).toBeNull()
    expect(queryByTestId('more-details')).toBeNull()
  })

  it('paints the type chip with the colour of the order type (a type the app does not know is neutral)', () => {
    const variants = (defaultAppTheme() as any).native.components.badge.variants
    const chipBackground = (type: any) => {
      const { getByTestId } = render(props(baseOrder({ delivery_type: type })))
      return StyleSheet.flatten(getByTestId('type-chip').props.style).backgroundColor
    }
    // With a driver, collected by the customer, in the store: each its own colour, whatever the type's number.
    expect(chipBackground(1)).toBe(variants[orderTypeVariant(1)].background)
    expect(chipBackground(2)).toBe(variants[orderTypeVariant(2)].background)
    expect(chipBackground(3)).toBe(variants[orderTypeVariant(3)].background)
    expect(chipBackground(99)).toBe(variants.neutral.background)
    expect(new Set([1, 2, 3].map(chipBackground)).size).toBe(3)
    expect(chipBackground(1)).not.toBe(variants.neutral.background)
  })

  it('hides the type chip with the type key and the total with the total key', () => {
    const theme = themeWithValues((values) => {
      values.visibility['confirmation.order.type'] = false
      values.visibility['confirmation.order.total'] = false
    })
    const { queryByTestId } = render(props(baseOrder()), { themeOverrides: theme })
    expect(queryByTestId('type-chip')).toBeNull()
    expect(queryByTestId('payment-total')).toBeNull()
  })
})

describe('offline', () => {
  it('queues a step when the device is offline and the project saves offline', async () => {
    mockOffline.state = { isNetConnected: false, canSaveChangesOffline: true }
    const updated = { ...preparing(), status: 4 }
    const ui = props(preparing(), { handleChangeOrderStatus: jest.fn(async () => updated) })
    const { getByTestId } = render(ui)
    await act(async () => { fireEvent.press(getByTestId('bar-ready')) })
    const body = { status: 4, id: 1053 }
    expect(mockOffline.functions.applyOffAction).toHaveBeenCalledWith({ event: 'evt_off_change_order_status', data: { orderId: 1053, body } })
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledWith(4, body, { dataToSave: { ...body, unsync: true } })
    await waitFor(() => expect(mockOffline.functions.registerOffOrder).toHaveBeenCalledWith(updated))
  })

  it('goes to the server when the project does not save offline', async () => {
    mockOffline.state = { isNetConnected: false, canSaveChangesOffline: false }
    const ui = props(preparing())
    const { getByTestId } = render(ui)
    await act(async () => { fireEvent.press(getByTestId('bar-ready')) })
    expect(mockOffline.functions.applyOffAction).not.toHaveBeenCalled()
    expect(ui.handleChangeOrderStatus).toHaveBeenCalledWith(4)
  })
})

describe('the lists and the board learn of the page\'s own changes', () => {
  const emitted = () => components.useEvent()[0].emit as jest.Mock
  const told = () => emitted().mock.calls.filter(([event]: any[]) => event === ORDER_CHANGED_EVENT).map(([, order]: any[]) => order)

  beforeEach(() => { emitted().mockClear() })

  it('tells once, with the order the server answered, after a step of the bar', async () => {
    const ui = props(preparing())
    ui.handleChangeOrderStatus = jest.fn(async () => ({ ...ui.order.order, status: 4, updated_at: '2026-11-19 12:26:00' }))
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-ready'))
    await waitFor(() => expect(told()).toHaveLength(1))
    expect(told()[0]).toMatchObject({ id: 1053, status: 4, updated_at: '2026-11-19 12:26:00' })
  })

  it('tells nothing when the change failed (no order, an error answer or an exception)', async () => {
    for (const answer of [null, { error: true }, undefined]) {
      const ui = props(preparing())
      ui.handleChangeOrderStatus = jest.fn(async () => answer)
      const screen = render(ui)
      fireEvent.press(screen.getByTestId('bar-ready'))
      await waitFor(() => expect(ui.handleChangeOrderStatus).toHaveBeenCalled())
      screen.unmount()
    }
    expect(told()).toHaveLength(0)
  })

  it('tells nothing for a change that was only queued offline (nothing was answered)', async () => {
    mockOffline.state = { isNetConnected: false, canSaveChangesOffline: true }
    const ui = props(preparing())
    ui.handleChangeOrderStatus = jest.fn(async (_status: any, body: any) => ({ ...ui.order.order, ...body, unsync: true }))
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-ready'))
    await waitFor(() => expect(mockOffline.functions.registerOffOrder).toHaveBeenCalled())
    expect(told()).toHaveLength(0)
  })

  it('tells for the changes the sheets make through the page\'s own request (accept, reject, prep time, forced status, More)', async () => {
    const ui = props(baseOrder())
    ui.handleChangeOrderStatus = jest.fn(async (status?: number) => ({ ...ui.order.order, status: status ?? ui.order.order.status }))
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('bar-accept'))
    await mockActions.openAccept.mock.calls[0][1].changeStatus(7, { status: 7, prepared_in: 20 })
    expect(told()).toHaveLength(1)
    expect(told()[0]).toMatchObject({ id: 1053, status: 7 })

    fireEvent.press(getByTestId('bar-reject'))
    await mockActions.openReject.mock.calls[0][1].changeStatus(5, { status: 5, reject_reason: 'Out of stock' })
    expect(told()).toHaveLength(2)
    expect(told()[1]).toMatchObject({ id: 1053, status: 5 })

    fireEvent.press(getByTestId('header-more'))
    await mockActions.openMore.mock.calls[0][1].prepTime.changeStatus(undefined, { prepared_in: 25 })
    expect(told()).toHaveLength(3)
  })

  it('tells for a change after the API refused a regression and the reason was given', async () => {
    const ui = props(preparing(), { regressionRequest: { status: 4, body: { status: 4 } } })
    ui.handleChangeOrderStatus = jest.fn(async () => ({ ...ui.order.order, status: 4 }))
    render(ui)
    await mockActions.openForceStatus.mock.calls[0][1].changeStatus(4, { status: 4, reasons: 'Sorry' })
    expect(told()).toHaveLength(1)
  })

  it('tells once after a driver is assigned, with the driver, and nothing when the assignment did not happen', async () => {
    setup({ configs: { assign_driver_enabled: { value: '1' } } })
    const order = preparing()
    const ui = props(order)
    // The controller answers with nothing and updates the order it holds in place.
    ui.handleAssignDriver = jest.fn(async (id: number | null) => { Object.assign(order, { driver_id: id, driver: id ? { id, name: 'Omar' } : null }) })
    const { getByTestId } = render(ui)
    fireEvent.press(getByTestId('driver-assign'))
    const assign = mockActions.openAssignDriver.mock.calls[0][1].handleAssignDriver
    await assign(5)
    expect(told()).toEqual([{ id: 1053, status: 7, driver_id: 5, driver: { id: 5, name: 'Omar' } }])

    emitted().mockClear()
    ui.handleAssignDriver.mockImplementationOnce(async () => {})
    await assign(6)
    expect(told()).toHaveLength(0)
  })
})

describe('the paid rule and the money row', () => {
  const flat = (node: any) => require('react-native').StyleSheet.flatten(node.props.style)
  const cashOrder = (extra: any = {}) => baseOrder({
    paymethod: { gateway: 'cash', name: 'Cash' },
    payment_events: [{ id: 1, event: 'payment', amount: 32.37, paymethod: { gateway: 'cash', name: 'Cash' } }],
    ...extra
  })

  it('says "Unpaid" for a cash order even when a payment event is on it, and "Paid" for a card one', () => {
    const cash = render(props(cashOrder()))
    expect(cash.queryByTestId('payment-paid')).toBeNull()
    expect(cash.getByText('Unpaid')).toBeTruthy()
    const card = render(props(baseOrder()))
    expect(card.getByTestId('payment-paid')).toBeTruthy()
    expect(card.queryByText('Unpaid')).toBeNull()
  })

  it('says "Unpaid" for card on delivery and for an order with a payment that is partly cash', () => {
    const onDelivery = baseOrder({ paymethod: { gateway: 'card_delivery', name: 'Card on delivery' }, payment_events: [{ id: 1, event: 'payment', paymethod: { gateway: 'card_delivery' } }] })
    expect(render(props(onDelivery)).getByTestId('payment-unpaid')).toBeTruthy()
    const mixed = baseOrder({
      payment_events: [
        { id: 1, event: 'payment', amount: 10, wallet_event: { wallet: { type: 'credit_point' } } },
        { id: 2, event: 'payment', amount: 22.37, paymethod: { gateway: 'cash', name: 'Cash' } }
      ]
    })
    expect(render(props(mixed)).getByTestId('payment-unpaid')).toBeTruthy()
  })

  it('puts the chip on the amount\'s centre line, paid or not', () => {
    expect(flat(render(props(baseOrder())).getByTestId('payment-paid')).alignSelf).toBe('center')
    expect(flat(render(props(cashOrder())).getByTestId('payment-unpaid')).alignSelf).toBe('center')
  })
})

describe('the body of a folded row', () => {
  const flat = (node: any) => require('react-native').StyleSheet.flatten(node.props.style)
  it('gives the body of a folded row the same space on top as under it', () => {
    const { getByTestId } = render(props(preparing()))
    fireEvent.press(getByTestId('payment-folded'))
    const body = flat(getByTestId('payment-folded-body'))
    // One padding on all four sides: the top one is the sides' and the bottom one's.
    expect(body.padding).toBeGreaterThan(0)
    expect(body.paddingTop).toBeUndefined()
    fireEvent.press(getByTestId('more-details'))
    expect(flat(getByTestId('more-details-body')).padding).toBe(body.padding)
  })
})

describe('the addresses of the page open the app\'s map', () => {
  it('opens the app\'s map from the customer\'s address and from the store\'s address, and never leaves the app', () => {
    const { Linking } = require('react-native')
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
    const ui = props(baseOrder(), { driverLocation: { lat: 4.66, lng: -74.04 } })
    const { getByTestId } = render({ ...ui, order: { order: { ...ui.order.order, business: { ...ui.order.order.business, address: '1 Main St' } }, loading: false, error: null } })
    fireEvent.press(getByTestId('customer-address'))
    expect(mockActions.openMap).toHaveBeenLastCalledWith(expect.objectContaining({ id: 1053 }), { driverLocation: { lat: 4.66, lng: -74.04 } })
    fireEvent.press(getByTestId('more-details'))
    fireEvent.press(getByTestId('more-store-address'))
    expect(mockActions.openMap).toHaveBeenCalledTimes(2)
    expect(open).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('leaves the address as plain text when the order has no place to draw or the theme hides directions', () => {
    mockActions.openMap.mockClear()
    const none = baseOrder({ business: { name: 'Luna Pizza' }, customer: { name: 'James', address: '58 Maple Ave' } })
    const { getByTestId } = render(props(none))
    expect(getByTestId('customer-address').props.accessibilityState?.disabled).toBe(true)
    fireEvent.press(getByTestId('customer-address'))
    const theme = themeWithValues((values) => { values.visibility['confirmation.order.directions'] = false })
    const hidden = render(props(baseOrder()), { themeOverrides: theme })
    fireEvent.press(hidden.getAllByTestId('customer-address')[0])
    expect(mockActions.openMap).not.toHaveBeenCalled()
  })
})

describe('the timeline card', () => {
  const flat = (node: any) => require('react-native').StyleSheet.flatten(node.props.style)
  it('ends the timeline card at its last step: no space under it that the top does not have', () => {
    const onTheWay = baseOrder({
      status: 4,
      history: history([['2026-11-19 07:00:00', 7], ['2026-11-19 07:08:00', 4]]),
      driver: { id: 5, name: 'Omar', location: { lat: 4.65, lng: -74.05 } }
    })
    const { getByTestId } = render(props(onTheWay))
    const texts = (key: string) => flat(getByTestId(`timeline-step-${key}`).children[1] as any)
    expect(texts('accepted').paddingBottom).toBeGreaterThan(0)
    expect(texts('ready').paddingBottom).toBeUndefined()
  })

  it('centres each timeline dot on the line of its step\'s name, with the rail\'s line whole through it', () => {
    const onTheWay = baseOrder({
      status: 4,
      history: history([['2026-11-19 07:00:00', 7], ['2026-11-19 07:08:00', 4]]),
      driver: { id: 5, name: 'Omar', location: { lat: 4.65, lng: -74.05 } }
    })
    const { getByTestId } = render(props(onTheWay))
    const box = getByTestId('timeline-dot-accepted')
    const [above, dot, below] = box.children as any[]
    // The dot's box is as high as the name's line (never lower than the dot) and the dot sits between two equal joins.
    const height = flat(box).height
    expect(height).toBeGreaterThanOrEqual(flat(dot).height)
    expect(flat(above).flex).toBe(1)
    expect(flat(below).flex).toBe(1)
    // The first step has nothing above it to join; the line leaves it below.
    expect(flat(above).backgroundColor).toBeUndefined()
    expect(flat(below).backgroundColor).toBeDefined()
    // The step's name is written on a line of that height, and so is its hour.
    const lines = getByTestId('timeline-step-accepted')
      .findAll((node: any) => typeof node.type === 'string' && typeof flat(node)?.lineHeight === 'number')
      .map((node: any) => flat(node).lineHeight)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(Math.max(...lines)).toBe(height)
    expect(lines[lines.length - 1]).toBe(height)
  })
})

describe('a socket reconnect (the changes of the gap are lost)', () => {
  const socketHandlers: Record<string, Array<() => void>> = {}
  const emit = (name: string) => act(() => { socketHandlers[name]?.forEach((handler) => handler()) })
  const settle = () => act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })
  const withSocket = (ui: any) => renderWithProviders(<SocketReconnectProvider><OrderDetailsUI {...ui} /></SocketReconnectProvider>)

  beforeEach(() => {
    // The page tests keep the timers real; the reconnect's wait is the one thing here that runs on the fake clock.
    jest.useFakeTimers({ now: NOW })
    for (const key of Object.keys(socketHandlers)) delete socketHandlers[key]
    components.useWebsocket.mockReturnValue({
      on: (name: string, handler: () => void) => { (socketHandlers[name] ??= []).push(handler) },
      off: (name: string, handler: () => void) => { socketHandlers[name] = (socketHandlers[name] ?? []).filter((item) => item !== handler) }
    })
  })
  afterEach(() => { components.useWebsocket.mockReturnValue([{ socket: null }]) })

  it('reads the open order again once, and the page stays on screen', () => {
    const ui = props(preparing())
    const { getByTestId } = withSocket(ui)
    expect(ui.getOrder).not.toHaveBeenCalled()
    emit('disconnect')
    emit('connect')
    settle()
    expect(ui.getOrder).toHaveBeenCalledTimes(1)
    expect(getByTestId('customer-card')).toBeTruthy()
    // A connect with no drop in between is not a catch-up.
    emit('connect')
    settle()
    expect(ui.getOrder).toHaveBeenCalledTimes(1)
  })

  it('does not read it while the page has a request of its own running, nor offline', () => {
    const loading = props(preparing(), { order: { order: preparing(), loading: true, error: null } })
    withSocket(loading)
    emit('disconnect')
    emit('connect')
    settle()
    expect(loading.getOrder).not.toHaveBeenCalled()

    mockOffline.state = { isNetConnected: false, canSaveChangesOffline: true }
    const offline = props(preparing())
    withSocket(offline)
    emit('disconnect')
    emit('connect')
    settle()
    expect(offline.getOrder).not.toHaveBeenCalled()
  })

  it('reads again an order that failed to load, as the panel of the tablet board does', () => {
    const failed = props(null, { presentation: 'panel', order: { order: null, loading: false, error: ['Network request failed'] } })
    withSocket(failed)
    emit('disconnect')
    emit('connect')
    settle()
    expect(failed.getOrder).toHaveBeenCalledTimes(1)
  })
})
