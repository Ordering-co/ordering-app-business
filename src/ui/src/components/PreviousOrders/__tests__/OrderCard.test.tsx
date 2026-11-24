import React from 'react'
import { StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { useConfig, useEvent, useUtils } from '@components'

const mockActions = { openAccept: jest.fn(), openReject: jest.fn(), openReview: jest.fn(), openAssignDriver: jest.fn() }
const mockCanReview = jest.fn(() => true)
jest.mock('@ui', () => ({
  useOrderActions: () => mockActions,
  canReviewCustomer: (order: any) => mockCanReview(order)
}))

jest.mock('../orderCardData', () => {
  const actual = jest.requireActual('../orderCardData')
  return { ...actual, customerText: jest.fn(actual.customerText) }
})

import { customerText } from '../orderCardData'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { OrderCard } from '../OrderCard'
import { ORDER_CHANGED_EVENT } from '../../OrdersOption/orderChanges'
import { makeFormats } from '../../../../../hooks/useFormats'
import { makeOrder } from '../../OrdersOption/__tests__/fixtures'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { defaultAppTheme } from '../../../../../theme/engine'

const utils = {
  parsePrice: (value: number) => `$${value.toFixed(2)}`,
  timeFormat: 'h:mm A',
  dateFormat: 'DD/MM/YYYY'
}

// The style of the cell around a button: the first ancestor that sets a share of the row.
const cellOf = (button: any) => {
  let node = button.parent
  while (node && StyleSheet.flatten(node.props.style)?.flexGrow === undefined && StyleSheet.flatten(node.props.style)?.flex === undefined) node = node.parent
  return StyleSheet.flatten(node.props.style)
}

// The first ancestor of a node (itself included) whose style sets `key`.
const climb = (node: any, key: string) => {
  while (node && StyleSheet.flatten(node.props.style)?.[key] === undefined) node = node.parent
  return node ? StyleSheet.flatten(node.props.style) : undefined
}

// The paint of a band variant, as the theme's badge gives it.
const badgeVariants = defaultAppTheme().native.components.badge.variants as Record<string, { background: string, color: string }>
const NBSP = '\u00A0'
const plain = (text: any) => String(text).replace(new RegExp(NBSP, 'g'), ' ')

// What the band of an order writes and how it is painted.
const band = (view: any, id: number | string = 1001) => StyleSheet.flatten(view.getByTestId(`order-card-${id}-band`).props.style)
const bandInk = (view: any, id: number | string = 1001) => StyleSheet.flatten(view.getByTestId(`order-card-${id}-status`).props.style).color
const clockOf = (view: any, id: number | string = 1001) => plain(view.getByTestId(`order-card-${id}-clock`).props.children)
// Whether a node is inside the one with `testID`.
const inside = (node: any, testID: string) => {
  for (let up = node.parent; up; up = up.parent) if (up.props?.testID === testID) return true
  return false
}

const renderCard = (props: Record<string, any>, offline: any = {}, extra: Record<string, any> = {}) => {
  const applyOffAction = jest.fn(async () => true)
  const registerOffOrder = jest.fn()
  const state = { isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null, ...offline }
  const result = renderWithProviders(
    <OfflineActionsContext.Provider value={[state, { applyOffAction, registerOffOrder, setState: jest.fn() }] as any}>
      <OrderCard handleChangeOrderStatus={jest.fn(async () => [{}])} {...props} />
    </OfflineActionsContext.Provider>,
    extra
  )
  return { ...result, applyOffAction, registerOffOrder }
}

describe('OrderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useUtils as jest.Mock).mockReturnValue([utils, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
    mockCanReview.mockReturnValue(true)
  })

  it('draws the title, the status, the total, the type, Paid and the items of a new order, and no product list', () => {
    const { getByText, queryByText } = renderCard({ order: makeOrder({ id: 1053 }) })
    expect(getByText('#1053 · James Carter')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
    expect(getByText('$32.37')).toBeTruthy()
    expect(getByText('Delivery')).toBeTruthy()
    expect(getByText('Paid')).toBeTruthy()
    expect(getByText('2 items')).toBeTruthy()
    expect(queryByText(/Margherita/)).toBeNull()
    expect(queryByText(/Card ·/)).toBeNull()
    expect(queryByText('Pending sync')).toBeNull()
  })

  it('an unpaid order (cash on delivery) says Unpaid, in the warning chip, and says nothing else of the payment', () => {
    const cash = { name: 'Cash', gateway: 'cash' }
    const unpaid = renderCard({ order: makeOrder({ paymethod: cash, payment_events: [{ event: 'payment', paymethod: cash }] }) })
    expect(unpaid.getByText('Unpaid')).toBeTruthy()
    expect(unpaid.queryByText('Paid')).toBeNull()
    expect(unpaid.queryByText(/Cash/)).toBeNull()
    const ink = (view: any) => StyleSheet.flatten(view.props.style).color
    const paid = renderCard({ order: makeOrder() })
    expect(ink(paid.getByText('Paid'))).not.toBe(ink(unpaid.getByText('Unpaid')))
  })

  it('draws no Paid / Unpaid chip when the payload cannot say (no payment events, not cash)', () => {
    const { queryByText } = renderCard({ order: makeOrder({ payment_events: undefined }) })
    expect(queryByText('Paid')).toBeNull()
    expect(queryByText('Unpaid')).toBeNull()
  })

  it('counts one item as "1 item" and writes the table of an eat-in order', () => {
    expect(renderCard({ order: makeOrder({ products: [{ name: 'Soup', quantity: 1 }] }) }).getByText('1 item')).toBeTruthy()
    expect(renderCard({ order: makeOrder({ delivery_type: 3, spot_number: 7 }) }).getByText('Table 7 · 2 items')).toBeTruthy()
  })

  it('the order type chip has the colour of its type: a delivery and a pickup differ', () => {
    const background = (view: any) => climb(view, 'backgroundColor')?.backgroundColor
    const delivery = renderCard({ order: makeOrder({ id: 1, delivery_type: 1 }) }).getByText('Delivery')
    const pickup = renderCard({ order: makeOrder({ id: 2, delivery_type: 2 }) }).getByText('Pickup')
    expect(background(delivery)).toBeTruthy()
    expect(background(delivery)).not.toBe(background(pickup))
    // The type's colour is the three-way one of `orderTypeVariant`: a curbside order is collected like a pickup.
    const curbside = renderCard({ order: makeOrder({ id: 3, delivery_type: 4 }) }).getByText('Curbside')
    expect(background(curbside)).toBe(background(pickup))
  })

  it('every piece has its key: type, total (and Paid), status', () => {
    const off = (key: string) => ({ themeOverrides: themeWithValues((values) => { values.visibility[key] = false }) })
    const order = makeOrder({ id: 5 })
    const type = renderCard({ order }, {}, off('orders.order_type'))
    expect(type.queryByText('Delivery')).toBeNull()
    expect(type.getByText('Paid')).toBeTruthy()
    const total = renderCard({ order }, {}, off('orders.total'))
    expect(total.queryByText('$32.37')).toBeNull()
    expect(total.queryByText('Paid')).toBeNull()
    expect(total.getByText('Delivery')).toBeTruthy()
    const status = renderCard({ order }, {}, off('orders.order_status'))
    expect(status.queryByText('Pending')).toBeNull()
    expect(status.getByText('$32.37')).toBeTruthy()
  })

  it('a long status takes as many lines as its words need: no line limit on it, and it takes the room the time leaves', () => {
    const long = 'Driver almost at the customer'
    const { getByText, getByTestId } = renderCard({ order: makeOrder({ status: 19 }) })
    const text = getByText(long)
    expect(text.props.numberOfLines).toBeUndefined()
    // The status is plain text on the band (not a chip), able to shrink to the room the time leaves.
    expect(text).toBe(getByTestId('order-card-1001-status'))
    expect(StyleSheet.flatten(text.props.style).flexShrink).toBe(1)
    expect(climb(text, 'minWidth')).toMatchObject({ flex: 1, minWidth: 0 })
  })

  it('the status of a preorder carries the calendar glyph, in the band, before the text; other orders have none', () => {
    const preorder = renderCard({ order: makeOrder({ status: 13, delivery_datetime_utc: '2026-11-21 18:30:00' }) })
    expect(preorder.getByText('Preorder')).toBeTruthy()
    const glyphs = preorder.UNSAFE_queryAllByProps({ name: 'calendar-outline' })
    expect(glyphs.length).toBeGreaterThan(0)
    expect(inside(glyphs[0], 'order-card-1001-band')).toBe(true)
    // The glyph is the status's ink, as the text is.
    expect(glyphs.some((glyph: any) => glyph.props.color === bandInk(preorder))).toBe(true)
    expect(renderCard({ order: makeOrder({ status: 0 }) }).UNSAFE_queryAllByProps({ name: 'calendar-outline' })).toHaveLength(0)
    expect(renderCard({ order: makeOrder({ status: 7 }) }).UNSAFE_queryAllByProps({ name: 'calendar-outline' })).toHaveLength(0)
  })

  it('the band is the top of the tap area: the status and the time are in it, the header and the facts under it', () => {
    const { getByTestId } = renderCard({ order: makeOrder({ id: 31 }) })
    expect(inside(getByTestId('order-card-31-band'), 'order-card-31-open')).toBe(true)
    expect(inside(getByTestId('order-card-31-status'), 'order-card-31-band')).toBe(true)
    expect(inside(getByTestId('order-card-31-clock'), 'order-card-31-band')).toBe(true)
    expect(inside(getByTestId('order-card-store-header'), 'order-card-31-band')).toBe(false)
    expect(inside(getByTestId('order-card-store-header'), 'order-card-31-open')).toBe(true)
  })

  it('the total is at the end of the header, not in the band', () => {
    const { getByTestId } = renderCard({ order: makeOrder({ id: 31 }) })
    const total = getByTestId('order-card-store-total')
    expect(total.props.children).toBe('$32.37')
    expect(inside(total, 'order-card-store-header')).toBe(true)
    expect(inside(total, 'order-card-31-band')).toBe(false)
  })

  it('the total key off takes the total away and leaves the band', () => {
    const off = { themeOverrides: themeWithValues((values) => { values.visibility['orders.total'] = false }) }
    const { queryByTestId } = renderCard({ order: makeOrder() }, {}, off)
    expect(queryByTestId('order-card-store-total')).toBeNull()
    expect(queryByTestId('order-card-1001-band')).toBeTruthy()
  })

  it('the screen reader\'s label says the number, the type, the customer and the status', () => {
    const { getByTestId } = renderCard({ order: makeOrder({ id: 31 }) })
    expect(getByTestId('order-card-31-open').props.accessibilityLabel).toBe('#31, Delivery, James Carter, Pending')
  })

  it('the header has the store\'s tile and name over the title with several stores, and the title alone without; the total ends it, the time is in the band', () => {
    const order = makeOrder({ business: { name: 'Pizza Jot', logo: 'https://example.com/logo.png' } })
    const several = renderCard({ order, showStore: true })
    expect(several.getByText('Pizza Jot')).toBeTruthy()
    expect(several.getByTestId('order-card-store-logo')).toBeTruthy()
    expect(several.getByText('Pizza Jot').props.numberOfLines).toBe(1)
    const one = renderCard({ order })
    expect(one.queryByText('Pizza Jot')).toBeNull()
    expect(one.queryByTestId('order-card-store-logo')).toBeNull()
    expect(one.getByText('#1001 · James Carter')).toBeTruthy()
    expect(one.getByTestId('order-card-store-total')).toBeTruthy()
    expect(several.getByTestId('order-card-store-total')).toBeTruthy()
    expect(one.getByTestId('order-card-1001-clock')).toBeTruthy()
    expect(inside(one.getByTestId('order-card-1001-clock'), 'order-card-store-header')).toBe(false)
  })

  it('the title is one line that ends in an ellipsis', () => {
    expect(renderCard({ order: makeOrder() }).getByText('#1001 · James Carter').props.numberOfLines).toBe(1)
  })

  it('writes the external id when the project asks for it', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { change_order_id: { value: '1' } } }])
    const { getByText } = renderCard({ order: makeOrder({ id: 1053, external_id: 'EXT-9' }) })
    expect(getByText('#EXT-9 · James Carter')).toBeTruthy()
  })

  it('writes "Customer" when the project hides the contact data of the customer', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { hide_customer_contact_business_app: { value: '1' } } }])
    const { getByText, queryByText } = renderCard({ order: makeOrder() })
    expect(getByText('#1001 · Customer')).toBeTruthy()
    expect(queryByText(/James Carter/)).toBeNull()
  })

  it('leaves out what the payload does not carry, with no placeholder', () => {
    const order = makeOrder({ customer: undefined, products: undefined, summary: undefined, paymethod: undefined, payment_events: undefined, created_at: undefined })
    const { queryByText, queryByTestId } = renderCard({ order })
    expect(queryByText(/James Carter/)).toBeNull()
    expect(queryByText(/\$/)).toBeNull()
    expect(queryByText(/items?$/)).toBeNull()
    expect(queryByText('Paid')).toBeNull()
    expect(queryByText(/waiting/i)).toBeNull()
    expect(queryByTestId('order-card-store-total')).toBeNull()
    // No time to write: the band keeps the status, alone.
    expect(queryByTestId('order-card-1001-clock')).toBeNull()
    expect(queryByTestId('order-card-1001-status')).toBeTruthy()
  })

  it('shows Reject and Accept on a pending order and opens the sheets of orderActions', () => {
    const handleChangeOrderStatus = jest.fn()
    const order = makeOrder({ id: 7 })
    const { getByText } = renderCard({ order, handleChangeOrderStatus })
    fireEvent.press(getByText('Accept'))
    expect(mockActions.openAccept).toHaveBeenCalledWith(order, { handleChangeOrderStatus, from: 'list', viewOrder: expect.any(Function) })
    fireEvent.press(getByText('Reject'))
    expect(mockActions.openReject).toHaveBeenCalledWith(order, { handleChangeOrderStatus })
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
  })

  it('accepted from a card, "View order" does what a tap on the card does, with the accepted order', () => {
    const onPress = jest.fn()
    const order = makeOrder({ id: 7 })
    const { getByText } = renderCard({ order, onPress })
    fireEvent.press(getByText('Accept'))
    const { from, viewOrder } = mockActions.openAccept.mock.calls[0][1]
    expect(from).toBe('list')
    const accepted = { ...order, status: 7 }
    viewOrder(accepted)
    expect(onPress).toHaveBeenCalledWith(accepted)
  })

  it('has no "View order" for the card whose order the board\'s panel already shows', () => {
    const { getByText } = renderCard({ order: makeOrder({ id: 7 }), selected: true, onPress: jest.fn() })
    fireEvent.press(getByText('Accept'))
    expect(mockActions.openAccept.mock.calls[0][1]).toMatchObject({ from: 'list', viewOrder: undefined })
  })

  it('has no buttons on a pre-order and on an order with a driver', () => {
    const preorder = renderCard({ order: makeOrder({ status: 13 }) })
    expect(preorder.queryByText('Accept')).toBeNull()
    expect(preorder.getByText('Preorder')).toBeTruthy()
    const driver = renderCard({ order: makeOrder({ status: 23, driver: { name: 'Omar', lastname: 'Haddad' } }) })
    expect(driver.queryByText('Mark ready')).toBeNull()
    // With the driver the band says the status; the clock has nothing to count.
    expect(driver.getByText('Driver on way')).toBeTruthy()
    expect(driver.queryByTestId('order-card-1001-clock')).toBeNull()
    expect(driver.getByTestId('order-card-1001-band')).toBeTruthy()
  })

  it('words the ready action by the kind of order, as the details\' footer does (TAB-C5)', () => {
    expect(renderCard({ order: makeOrder({ id: 12, status: 7, delivery_type: 1 }) }).getByText('Mark ready')).toBeTruthy()
    expect(renderCard({ order: makeOrder({ id: 13, status: 7, delivery_type: 2 }) }).getByText('Mark ready for pickup')).toBeTruthy()
  })

  it('marks an accepted order ready with one call to the controller', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{}])
    const { getByText } = renderCard({ order: makeOrder({ id: 12, status: 7 }), handleChangeOrderStatus })
    await act(async () => { fireEvent.press(getByText('Mark ready')) })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [12])
  })

  it('picks up a ready pickup order and asks before marking it not picked up', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{}])
    const { getByText } = renderCard({ order: makeOrder({ id: 12, status: 4, delivery_type: 2 }), handleChangeOrderStatus })
    await act(async () => { fireEvent.press(getByText('Picked up')) })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(15, [12])
    handleChangeOrderStatus.mockClear()
    // The dialog host is not mounted in a test: the system alert stands in, and nothing is sent until it is accepted.
    const alert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(() => {})
    await act(async () => { fireEvent.press(getByText('Not picked up')) })
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    expect(alert).toHaveBeenCalled()
    const buttons = alert.mock.calls[0][2] as any[]
    await act(async () => { buttons[0].onPress() })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(17, [12])
    alert.mockRestore()
  })

  it('offline, queues the step when the server allows it and shows no button when it does not', async () => {
    const queued = renderCard({ order: makeOrder({ id: 12, status: 7 }) }, { isNetConnected: false, canSaveChangesOffline: true })
    await act(async () => { fireEvent.press(queued.getByText('Mark ready')) })
    expect(queued.applyOffAction).toHaveBeenCalledWith({ event: 'evt_off_change_order_status', data: { orderId: 12, body: { status: 4, id: 12 } } })
    expect(queued.registerOffOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 12, oldStatus: 7, status: 4, unsync: true }))

    const blocked = renderCard({ order: makeOrder({ id: 13, status: 7 }) }, { isNetConnected: false, canSaveChangesOffline: false })
    expect(blocked.queryByText('Mark ready')).toBeNull()
  })

  it('an unknown network (null, the first reading) is not offline: the step is sent, not queued, and the button is there', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{}])
    const { getByTestId, applyOffAction, registerOffOrder } = renderCard(
      { order: makeOrder({ id: 12, status: 7 }), handleChangeOrderStatus },
      { isNetConnected: null, canSaveChangesOffline: false }
    )
    await act(async () => { fireEvent.press(getByTestId('order-card-12-ready')) })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [12])
    expect(applyOffAction).not.toHaveBeenCalled()
    expect(registerOffOrder).not.toHaveBeenCalled()
  })

  it('says "Pending sync" for an order changed offline', () => {
    const { getByText } = renderCard({ order: makeOrder({ status: 7, unsync: true }) })
    expect(getByText('Pending sync')).toBeTruthy()
  })

  it('the band, not the card, carries the API\'s time state: at risk is the warning band, delayed the danger band', () => {
    const background = (view: any, id: number) => StyleSheet.flatten(view.getByTestId(`order-card-${id}`).props.style).backgroundColor
    // The cards share one ticker: its time is read when the first one subscribes, so the clock is set before any renders.
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T12:10:00Z'))
    const clean = renderCard({ order: makeOrder({ id: 5 }) })
    const risk = renderCard({ order: makeOrder({ id: 6, time_status: 'at_risk' }) })
    const late = renderCard({ order: makeOrder({ id: 7, time_status: 'delayed' }) })
    // An in-progress order in time keeps the status's own colour; the at-risk and the late one take the time's.
    const progress = renderCard({ order: makeOrder({ id: 8, status: 7, time_status: 'in_time', prepared_in: 30, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } } }) })
    expect(band(progress, 8).backgroundColor).toBe(badgeVariants.primary_soft.background)
    expect(band(clean, 5).backgroundColor).toBe(badgeVariants.warning_soft.background)
    expect(band(risk, 6).backgroundColor).toBe(badgeVariants.warning_soft.background)
    expect(band(late, 7).backgroundColor).toBe(badgeVariants.danger_soft.background)
    expect(bandInk(late, 7)).toBe(badgeVariants.danger_soft.color)
    // The whole card is no longer tinted: it has one background whatever the order's time state.
    expect(background(risk, 6)).toBe(background(clean, 5))
    expect(background(late, 7)).toBe(background(clean, 5))
    // The clock is shown whatever the time state: the text is never hidden by a missing `time_status`.
    expect(clean.getByTestId('order-card-5-clock')).toBeTruthy()
    expect(risk.getByTestId('order-card-6-clock')).toBeTruthy()
    jest.useRealTimers()
  })

  it('an order not waiting for something keeps the status\'s band whatever the time state says', () => {
    const withDriver = renderCard({ order: makeOrder({ id: 8, status: 23, time_status: 'delayed' }) })
    const clean = renderCard({ order: makeOrder({ id: 9, status: 23 }) })
    expect(band(withDriver, 8).backgroundColor).toBe(badgeVariants.primary_soft.background)
    expect(band(withDriver, 8).backgroundColor).toBe(band(clean, 9).backgroundColor)
    expect(bandInk(withDriver, 8)).toBe(bandInk(clean, 9))
    // The same holds in History.
    const history = renderCard({ order: makeOrder({ id: 10, status: 1, time_status: 'delayed' }) })
    expect(band(history, 10).backgroundColor).toBe(badgeVariants.success_soft.background)
  })

  it('a delayed order the time of which cannot be written is still painted late (the API\'s word)', () => {
    const view = renderCard({ order: makeOrder({ id: 11, created_at: undefined, time_status: 'delayed' }) })
    expect(view.queryByTestId('order-card-11-clock')).toBeNull()
    expect(band(view, 11).backgroundColor).toBe(badgeVariants.danger_soft.background)
    expect(bandInk(view, 11)).toBe(badgeVariants.danger_soft.color)
  })

  describe('the band\'s colour is the status\'s soft colour', () => {
    const paint = (status: number, extra: Record<string, any> = {}) => {
      const view = renderCard({ order: makeOrder({ id: 40, status, ...extra }) })
      return { background: band(view, 40).backgroundColor, ink: bandInk(view, 40) }
    }

    it('a new order and a preorder: warning', () => {
      expect(paint(0)).toEqual({ background: badgeVariants.warning_soft.background, ink: badgeVariants.warning_soft.color })
      expect(paint(13, { delivery_datetime_utc: '2026-11-21 18:30:00' })).toEqual({ background: badgeVariants.warning_soft.background, ink: badgeVariants.warning_soft.color })
    })

    it('an order in progress (accepted, ready, with the driver): primary', () => {
      for (const status of [7, 4, 23]) {
        expect(paint(status)).toEqual({ background: badgeVariants.primary_soft.background, ink: badgeVariants.primary_soft.color })
      }
    })

    it('a completed order: success', () => {
      for (const status of [1, 11, 15]) {
        expect(paint(status)).toEqual({ background: badgeVariants.success_soft.background, ink: badgeVariants.success_soft.color })
      }
    })

    it('a rejected, cancelled or failed order: danger', () => {
      for (const status of [2, 5, 6, 17]) {
        expect(paint(status)).toEqual({ background: badgeVariants.danger_soft.background, ink: badgeVariants.danger_soft.color })
      }
    })

    it('the time and the status share the band\'s ink, so the band reads as one piece', () => {
      const view = renderCard({ order: makeOrder({ id: 41, status: 0 }) })
      expect(StyleSheet.flatten(view.getByTestId('order-card-41-clock').props.style).color).toBe(bandInk(view, 41))
    })

    it('a late preparing order is a danger band although its status is in progress; in time it is primary', () => {
      const prepared = { status: 7, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } } }
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-11-19T12:10:00Z'))
      const inTime = renderCard({ order: makeOrder({ id: 42, ...prepared, prepared_in: 20, time_status: 'in_time' }) })
      const late = renderCard({ order: makeOrder({ id: 43, ...prepared, prepared_in: 5, time_status: 'in_time' }) })
      expect(band(inTime, 42).backgroundColor).toBe(badgeVariants.primary_soft.background)
      expect(band(late, 43).backgroundColor).toBe(badgeVariants.danger_soft.background)
      expect(bandInk(late, 43)).toBe(badgeVariants.danger_soft.color)
      jest.useRealTimers()
    })

    it('the band is not a badge: no chip around the status', () => {
      const view = renderCard({ order: makeOrder({ id: 44 }) })
      const status = view.getByTestId('order-card-44-status')
      expect(StyleSheet.flatten(status.props.style)).not.toHaveProperty('backgroundColor')
      expect(StyleSheet.flatten(status.props.style)).not.toHaveProperty('borderRadius')
      expect(StyleSheet.flatten(status.parent!.props.style)).not.toHaveProperty('backgroundColor')
    })
  })

  describe('the band and the keys', () => {
    const off = (...keys: string[]) => ({ themeOverrides: themeWithValues((values) => { keys.forEach((key) => { values.visibility[key] = false }) }) })

    it('"orders.order_status" off: the time alone fills the band, on the colour of the status, and no status is written', () => {
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-11-19T12:10:00Z'))
      const view = renderCard({ order: makeOrder({ id: 50, status: 7, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } }, prepared_in: 30 }) }, {}, off('orders.order_status'))
      jest.useRealTimers()
      expect(view.queryByTestId('order-card-50-status')).toBeNull()
      expect(view.getByTestId('order-card-50-band')).toBeTruthy()
      expect(view.getByTestId('order-card-50-clock')).toBeTruthy()
      // Alone, the time takes the band's whole width (no room is kept for a status), at its end.
      expect(StyleSheet.flatten(view.getByTestId('order-card-50-clock').props.style)).toMatchObject({ flex: 1, textAlign: 'right' })
      expect(band(view, 50).backgroundColor).toBe(badgeVariants.primary_soft.background)
      expect(view.queryByText('Accepted by business')).toBeNull()
    })

    it('no status and no time: no band at all', () => {
      const view = renderCard({ order: makeOrder({ id: 51, created_at: undefined }) }, {}, off('orders.order_status'))
      expect(view.queryByTestId('order-card-51-band')).toBeNull()
      expect(view.queryByTestId('order-card-51-status')).toBeNull()
      expect(view.queryByTestId('order-card-51-clock')).toBeNull()
      // The rest of the card is there.
      expect(view.getByText('$32.37')).toBeTruthy()
      expect(view.getByTestId('order-card-51-open')).toBeTruthy()
    })

    it('an order with the driver and no status shown has no band: it has no time either', () => {
      const view = renderCard({ order: makeOrder({ id: 52, status: 23 }) }, {}, off('orders.order_status'))
      expect(view.queryByTestId('order-card-52-band')).toBeNull()
    })

    it('a card asked for without its status (`showStatus` false) is the time alone', () => {
      const view = renderCard({ order: makeOrder({ id: 53 }), showStatus: false })
      expect(view.queryByTestId('order-card-53-status')).toBeNull()
      expect(view.getByTestId('order-card-53-clock')).toBeTruthy()
    })

    it('the time key of History off leaves the status alone in the band, and both keys off take the band away', () => {
      const history = { status: 1, delivery_datetime_utc: '2026-11-19 11:42:00' }
      const dateOff = renderCard({ order: makeOrder({ id: 54, ...history }) }, {}, off('orders.date'))
      expect(dateOff.queryByTestId('order-card-54-clock')).toBeNull()
      expect(dateOff.getByTestId('order-card-54-status')).toBeTruthy()
      const both = renderCard({ order: makeOrder({ id: 55, ...history }) }, {}, off('orders.date', 'orders.order_status'))
      expect(both.queryByTestId('order-card-55-band')).toBeNull()
    })
  })

  it('the band\'s time ticks by itself each second', () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T12:00:42Z'))
    const { getByTestId } = renderCard({ order: makeOrder({ created_at: '2026-11-19 12:00:00' }) })
    expect(plain(getByTestId('order-card-1001-clock').props.children)).toBe('Waiting 00:42')
    act(() => { jest.advanceTimersByTime(3000) })
    expect(plain(getByTestId('order-card-1001-clock').props.children)).toBe('Waiting 00:45')
    jest.useRealTimers()
  })

  it('only the band re-renders each second: the card does not build its texts again', () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T12:00:42Z'))
    const { getByTestId } = renderCard({ order: makeOrder({ created_at: '2026-11-19 12:00:00' }) })
    const built = (customerText as jest.Mock).mock.calls.length
    act(() => { jest.advanceTimersByTime(5000) })
    expect(plain(getByTestId('order-card-1001-clock').props.children)).toBe('Waiting 00:47')
    expect((customerText as jest.Mock).mock.calls.length).toBe(built)
    jest.useRealTimers()
  })

  it('one color rule: a new order\'s band is warning whatever the API says in time; delayed is danger', () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T12:00:42Z'))
    const color = (status: string | undefined) => {
      const view = renderCard({ order: makeOrder({ created_at: '2026-11-19 12:00:00', time_status: status }) })
      return [band(view).backgroundColor, bandInk(view)]
    }
    expect(color('in_time')).toEqual(color('at_risk'))
    expect(color('in_time')).toEqual(color(undefined))
    expect(color('in_time')).toEqual([badgeVariants.warning_soft.background, badgeVariants.warning_soft.color])
    expect(color('delayed')).toEqual([badgeVariants.danger_soft.background, badgeVariants.danger_soft.color])
    jest.useRealTimers()
  })

  it('writes the time of an old order as days and hours', () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T09:23:33Z'))
    const view = renderCard({ order: makeOrder({ created_at: '2026-11-10 12:00:00' }) })
    expect(clockOf(view)).toBe('Waiting 8d 21h')
    jest.useRealTimers()
  })

  describe('the time at the end of the band', () => {
    const NOW = '2026-11-19T12:10:00Z'
    const stages = {
      pending: { status: 0, created_at: '2026-11-19 12:07:46' },
      preparing: { status: 7, prepared_in: 20, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } } },
      late: { status: 7, prepared_in: 5, reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } } },
      ready: { status: 4, delivery_type: 2, reporting_data: { at: { 'status:4': '2026-11-19 12:04:48' } } }
    }

    beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(Date.parse(NOW)) })
    afterEach(() => jest.useRealTimers())

    it('the time keeps its own width up to a share of the band, so it never takes the status\'s room', () => {
      const view = renderCard({ order: makeOrder(stages.pending) })
      expect(StyleSheet.flatten(view.getByTestId('order-card-1001-clock').props.style)).toMatchObject({ flexShrink: 0, maxWidth: '60%', textAlign: 'right' })
    })

    it('writes one sentence for each stage', () => {
      expect(clockOf(renderCard({ order: makeOrder(stages.pending) }))).toBe('Waiting 02:14')
      expect(clockOf(renderCard({ order: makeOrder(stages.preparing) }))).toBe('Ready in 10:00')
      expect(clockOf(renderCard({ order: makeOrder(stages.late) }))).toBe('Late 05:00')
      expect(clockOf(renderCard({ order: makeOrder(stages.ready) }))).toBe('Waiting 05:12')
    })

    it('the sentence is one text, written whole: no normal space inside its parts, so a line breaks only between parts', () => {
      const view = renderCard({ order: makeOrder(stages.preparing), absoluteTime: true })
      const text = String(view.getByTestId('order-card-1001-clock').props.children)
      for (const part of text.split(' · ')) expect(part).not.toMatch(/ /)
      expect(text.split(' · ')).toHaveLength(2)
    })

    it('the late band is in the danger colour and the waiting one in the warning colour', () => {
      const late = renderCard({ order: makeOrder(stages.late) })
      const pending = renderCard({ order: makeOrder(stages.pending) })
      expect(band(late).backgroundColor).toBe(badgeVariants.danger_soft.background)
      expect(band(pending).backgroundColor).toBe(badgeVariants.warning_soft.background)
      expect(StyleSheet.flatten(late.getByTestId('order-card-1001-clock').props.style).color).not.toBe(StyleSheet.flatten(pending.getByTestId('order-card-1001-clock').props.style).color)
    })

    it('a preorder writes the day and the time it is for in the status\'s colour, whatever the absolute choice says', () => {
      const order = makeOrder({ status: 13, delivery_datetime_utc: '2026-11-20 13:30:00' })
      const off = renderCard({ order })
      const on = renderCard({ order, absoluteTime: true })
      const formats = makeFormats(utils)
      expect(clockOf(off)).toBe(`Tomorrow · ${formats.time('2026-11-20 13:30:00')}`)
      expect(clockOf(on)).toBe(clockOf(off))
      expect(band(off).backgroundColor).toBe(badgeVariants.warning_soft.background)
    })

    it('with the absolute choice on, the sentence adds the clock time for a pending, preparing, late and ready order', () => {
      const formats = makeFormats(utils)
      const at = (moment: string) => formats.time(moment)
      expect(clockOf(renderCard({ order: makeOrder(stages.pending), absoluteTime: true }))).toBe(`Waiting 02:14 · ${at('2026-11-19 12:07:46')}`)
      expect(clockOf(renderCard({ order: makeOrder(stages.preparing), absoluteTime: true }))).toBe(`Ready in 10:00 · due ${at('2026-11-19 12:20:00')}`)
      expect(clockOf(renderCard({ order: makeOrder(stages.late), absoluteTime: true }))).toBe(`Late 05:00 · due ${at('2026-11-19 12:05:00')}`)
      expect(clockOf(renderCard({ order: makeOrder(stages.ready), absoluteTime: true }))).toBe(`Waiting 05:12 · ${at('2026-11-19 12:04:48')}`)
    })

    it('a long sentence takes a second line at its end, right aligned, and never more than its share of the band', () => {
      const view = renderCard({ order: makeOrder(stages.late), absoluteTime: true })
      const clock = view.getByTestId('order-card-1001-clock')
      expect(StyleSheet.flatten(clock.props.style)).toMatchObject({ textAlign: 'right', maxWidth: '60%', flexShrink: 0 })
      expect(clock.props.numberOfLines).toBeUndefined()
    })

    it('"orders.date" off hides the time of History and not the one of the others', () => {
      const off = { themeOverrides: themeWithValues((values) => { values.visibility['orders.date'] = false }) }
      expect(renderCard({ order: makeOrder({ status: 1, delivery_datetime_utc: '2026-11-19 11:42:00' }) }, {}, off).queryByTestId('order-card-1001-clock')).toBeNull()
      expect(renderCard({ order: makeOrder(stages.pending) }, {}, off).getByTestId('order-card-1001-clock')).toBeTruthy()
    })
  })

  describe('the quick actions choice', () => {
    it('off, the card draws no action row for any stage and still opens the order', () => {
      const onPress = jest.fn()
      for (const order of [makeOrder({ id: 1, status: 0 }), makeOrder({ id: 2, status: 7 }), makeOrder({ id: 3, status: 4, delivery_type: 2 })]) {
        const view = renderCard({ order, quickActions: false, onPress })
        expect(view.queryByTestId(`order-card-${order.id}-actions`)).toBeNull()
        fireEvent.press(view.getByTestId(`order-card-${order.id}-open`))
      }
      expect(onPress).toHaveBeenCalledTimes(3)
    })

    it('off, History draws no review button either; on, it does', () => {
      expect(renderCard({ order: makeOrder({ status: 1 }), quickActions: false }).queryByText('Review customer')).toBeNull()
      expect(renderCard({ order: makeOrder({ status: 1 }) }).getByText('Review customer')).toBeTruthy()
    })
  })

  describe('Assign driver', () => {
    const assignOn = { loading: false, configs: { assign_driver_enabled: { value: '1' } } }
    const withAssign = () => (useConfig as jest.Mock).mockReturnValue([assignOn])

    it('a ready delivery order with no driver has it as its one full-width button, opening the details\' sheet with the order', () => {
      withAssign()
      const order = makeOrder({ id: 31, status: 4, delivery_type: 1 })
      const { getByText, getByTestId, queryByTestId } = renderCard({ order })
      expect(getByText('Assign driver')).toBeTruthy()
      expect(queryByTestId('order-card-31-ready')).toBeNull()
      expect(cellOf(getByTestId('order-card-31-assign_driver'))).toEqual(expect.objectContaining({ flex: 1 }))
      fireEvent.press(getByText('Assign driver'))
      expect(mockActions.openAssignDriver).toHaveBeenCalledWith(order, { onDone: expect.any(Function) })
    })

    it('an accepted one keeps Mark ready, and has Assign driver beside it in a neutral look (not the danger one)', () => {
      withAssign()
      const { getByText } = renderCard({ order: makeOrder({ id: 32, status: 7, delivery_type: 1 }) })
      expect(getByText('Mark ready')).toBeTruthy()
      // The ink of each label is its button's look: the pair differs, and Assign driver is not the danger ink of Reject.
      const ink = (view: any, text: string) => StyleSheet.flatten(view.getByText(text).props.style).color
      const reject = renderCard({ order: makeOrder({ id: 33, status: 0 }) })
      expect(ink({ getByText }, 'Assign driver')).toBeTruthy()
      expect(ink({ getByText }, 'Assign driver')).not.toBe(ink(reject, 'Reject'))
      expect(ink({ getByText }, 'Assign driver')).not.toBe(ink({ getByText }, 'Mark ready'))
    })

    it('goes when the order has a driver, and is not drawn for another type, another status or a project without the setting', () => {
      withAssign()
      expect(renderCard({ order: makeOrder({ status: 4, driver_id: 5, driver: { id: 5, name: 'Omar' } }) }).queryByText('Assign driver')).toBeNull()
      expect(renderCard({ order: makeOrder({ status: 7, driver_id: 5 }) }).queryByText('Assign driver')).toBeNull()
      expect(renderCard({ order: makeOrder({ status: 4, delivery_type: 2 }) }).queryByText('Assign driver')).toBeNull()
      expect(renderCard({ order: makeOrder({ status: 0 }) }).queryByText('Assign driver')).toBeNull()
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
      expect(renderCard({ order: makeOrder({ status: 4 }) }).queryByText('Assign driver')).toBeNull()
    })

    it('quick actions off: no button', () => {
      withAssign()
      expect(renderCard({ order: makeOrder({ status: 4 }), quickActions: false }).queryByText('Assign driver')).toBeNull()
      expect(renderCard({ order: makeOrder({ status: 7 }), quickActions: false }).queryByText('Assign driver')).toBeNull()
    })

    it('the sheet\'s answer tells the lists with the order\'s change, and the card without it keeps its button', () => {
      withAssign()
      const order = makeOrder({ id: 34, status: 4 })
      const { getByText } = renderCard({ order })
      const [events] = (useEvent as jest.Mock).mock.results[0].value
      fireEvent.press(getByText('Assign driver'))
      const { onDone } = mockActions.openAssignDriver.mock.calls[0][1]
      onDone(undefined)
      expect(events.emit).not.toHaveBeenCalledWith(ORDER_CHANGED_EVENT, expect.anything())
      onDone({ id: 34, status: 4, driver_id: 5, driver: { id: 5, name: 'Omar' } })
      expect(events.emit).toHaveBeenCalledWith(ORDER_CHANGED_EVENT, { id: 34, status: 4, driver_id: 5, driver: { id: 5, name: 'Omar' } })
    })

    it('the same card with the driver in the order (the list applied the change) has no button', () => {
      withAssign()
      const view = renderCard({ order: makeOrder({ id: 35, status: 4 }) })
      expect(view.getByText('Assign driver')).toBeTruthy()
      view.rerender(<OrderCard order={makeOrder({ id: 35, status: 4, driver_id: 5, driver: { id: 5, name: 'Omar' } })} />)
      expect(view.queryByText('Assign driver')).toBeNull()
    })
  })

  it('opens the order when its body is pressed', () => {
    const onPress = jest.fn()
    const order = makeOrder({ id: 77 })
    const { getByTestId } = renderCard({ order, onPress })
    fireEvent.press(getByTestId('order-card-77-open'))
    expect(onPress).toHaveBeenCalledWith(order)
  })

  describe('History', () => {
    it('draws the customer and the total on one line, the status and the time in the band, and the reason', () => {
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-12-20T12:00:00Z'))
      const order = makeOrder({ id: 9, status: 5, reject_reason: 'Item out of stock', delivery_datetime_utc: '2026-11-19 16:20:00' })
      const { getByText, queryByText, queryByTestId, getByTestId } = renderCard({ order })
      expect(getByText('#9 · James Carter')).toBeTruthy()
      expect(getByText('Rejected by business')).toBeTruthy()
      expect(getByText('$32.37')).toBeTruthy()
      expect(getByText('Reason: Item out of stock')).toBeTruthy()
      // The time it is listed with, and its day, in the band's one sentence (an old order: the project's date).
      expect(plain(getByTestId('order-card-9-clock').props.children)).toBe(plain(`${makeFormats(utils).date('2026-11-19 16:20:00')} · ${makeFormats(utils).time('2026-11-19 16:20:00')}`))
      // The status is the band's, on the colour of a rejected order.
      expect(bandInk({ getByTestId }, 9)).toBe(badgeVariants.danger_soft.color)
      // No product list and no action buttons in History.
      expect(queryByText(/Margherita/)).toBeNull()
      expect(queryByTestId('order-card-9-actions')).toBeNull()
      jest.useRealTimers()
    })

    it('writes the status with the app\'s one short name, never the server\'s long one', () => {
      expect(renderCard({ order: makeOrder({ id: 9, status: 15 }) }).getByText('Picked up by customer')).toBeTruthy()
      expect(renderCard({ order: makeOrder({ id: 8, status: 17 }) }).getByText('Not picked up by customer')).toBeTruthy()
      expect(renderCard({ order: makeOrder({ id: 7, status: 15 }) }).queryByText(/picked up completed/i)).toBeNull()
    })

    it('offers the review of the customer where the rule allows it', () => {
      const order = makeOrder({ id: 9, status: 1 })
      const { getByText } = renderCard({ order })
      fireEvent.press(getByText('Review customer'))
      expect(mockActions.openReview).toHaveBeenCalledWith(order)
    })

    it('the review button goes under the facts, across the width, outside the tap area; the status is in the band', () => {
      const { getByTestId } = renderCard({ order: makeOrder({ id: 9, status: 1 }) })
      expect(getByTestId('order-card-9-review')).toBeTruthy()
      expect(inside(getByTestId('order-card-9-review'), 'order-card-9-open')).toBe(false)
      expect(inside(getByTestId('order-card-9-status'), 'order-card-9-band')).toBe(true)
    })

    it('has no review button when the rule says no', () => {
      mockCanReview.mockReturnValue(false)
      expect(renderCard({ order: makeOrder({ status: 1 }) }).queryByText('Review customer')).toBeNull()
    })
  })

  describe('the buttons share the row (T3-C2)', () => {
    it('the pickup pair is as wide as its labels, the room left going 1 : 2, and the labels shrink before they wrap', () => {
      const { getByTestId } = renderCard({ order: makeOrder({ status: 4, delivery_type: 2 }) })
      const decline = cellOf(getByTestId('order-card-1001-not_picked_up'))
      const advance = cellOf(getByTestId('order-card-1001-picked_up'))
      // Not `flex: 1` / `flex: 2` of the whole row: the shorter label would be the narrower share and wrap.
      expect(decline).toMatchObject({ flexGrow: 1, flexShrink: 1 })
      expect(advance).toMatchObject({ flexGrow: 2, flexShrink: 1 })
      expect(decline.flex).toBeUndefined()
      expect(advance.flex).toBeUndefined()
    })

    it('Reject and Accept stay 1 : 2 of the row', () => {
      const { getByTestId } = renderCard({ order: makeOrder({ status: 0 }) })
      expect(cellOf(getByTestId('order-card-1001-reject')).flex).toBe(1)
      expect(cellOf(getByTestId('order-card-1001-accept')).flex).toBe(2)
    })
  })
})
