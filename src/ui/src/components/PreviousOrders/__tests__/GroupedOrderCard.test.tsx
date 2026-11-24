import React from 'react'
import { Alert, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { useConfig, useUtils } from '@components'

const mockActions = { openAccept: jest.fn(), openReject: jest.fn(), openReview: jest.fn() }
const mockCanReview = jest.fn(() => true)
jest.mock('@ui', () => ({
  useOrderActions: () => mockActions,
  canReviewCustomer: (order: any) => mockCanReview(order)
}))

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { GroupedOrderCard } from '../GroupedOrderCard'
import { OrderRowsList, sectionItems } from '..'
import { makeOrder } from '../../OrdersOption/__tests__/fixtures'
import { areListedOrderRowPropsEqual, areListedOrdersEqual } from '../areListedOrderRowPropsEqual'
import { forgetOrdersDisplayForTests, setOrdersDisplay } from '../../../../../context/ordersDisplay'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { defaultAppTheme } from '../../../../../theme/engine'

// The paint of a band variant, as the theme's badge gives it.
const badgeVariants = defaultAppTheme().native.components.badge.variants as Record<string, { background: string, color: string }>
const plain = (text: any) => String(text).replace(/\u00A0/g, ' ')
const bandOf = (view: any) => StyleSheet.flatten(view.getByTestId('orders-group-G7-band').props.style)
const inkOf = (view: any) => StyleSheet.flatten(view.getByTestId('orders-group-G7-status').props.style).color
const inside = (node: any, testID: string) => {
  for (let up = node.parent; up; up = up.parent) if (up.props?.testID === testID) return true
  return false
}

const pair = (status: number, extra: Record<string, any> = {}) => [
  makeOrder({ id: 2, status, cart_group_id: 'G7', customer_id: 9, ...extra }),
  makeOrder({ id: 1, status, cart_group_id: 'G7', customer_id: 9, ...extra })
]

// The style of the cell around a button: the first ancestor that sets a share of the row.
const cellOf = (button: any) => {
  let node = button.parent
  while (node && StyleSheet.flatten(node.props.style)?.flexGrow === undefined && StyleSheet.flatten(node.props.style)?.flex === undefined) node = node.parent
  return StyleSheet.flatten(node.props.style)
}

const renderGroup = (orders: any[], props: Record<string, any> = {}, extra: Record<string, any> = {}) => renderWithProviders(
  <GroupedOrderCard groupId='G7' orders={orders} handleChangeOrderStatus={jest.fn(async () => [{}])} {...props} />,
  extra
)

describe('GroupedOrderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => v, timeFormat: 'h:mm A' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
    mockCanReview.mockReturnValue(true)
  })

  it('never offers Assign driver, on the group or on its rows, whatever their status', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { assign_driver_enabled: { value: '1' } } }])
    for (const status of [4, 7]) {
      const view = renderGroup(pair(status))
      fireEvent.press(view.getByTestId('orders-group-G7-toggle'))
      expect(view.queryByText('Assign driver')).toBeNull()
      expect(view.queryByTestId('orders-group-G7-assign_driver')).toBeNull()
      expect(view.queryByTestId('order-card-2-assign_driver')).toBeNull()
    }
    // A group of accepted orders keeps its one button.
    expect(renderGroup(pair(7)).getByText('Mark ready')).toBeTruthy()
  })

  it('names the group and its orders, and opens and closes them', () => {
    const { getByText, getByTestId, queryByTestId } = renderGroup(pair(0))
    expect(getByText('Group No.G7')).toBeTruthy()
    expect(getByText(/^2 orders/)).toBeTruthy()
    // Closed, the orders are kept mounted but hidden.
    expect(queryByTestId('order-card-2-row')).toBeNull()
    fireEvent.press(getByTestId('orders-group-G7-toggle'))
    expect(getByTestId('order-card-2-row')).toBeTruthy()
    fireEvent.press(getByTestId('orders-group-G7-toggle'))
    expect(queryByTestId('order-card-2-row')).toBeNull()
    expect(queryByTestId('order-card-2-row', { hidden: true })).toBeTruthy()
  })

  it('is in the order card\'s language: the band with the status and the time, the title with the sum of the totals, and the facts', () => {
    const orders = pair(0, { business: { name: 'Pizza Jot' } })
    const { getByText, getByTestId } = renderGroup(orders, { showStore: true })
    expect(getByText('Pizza Jot')).toBeTruthy()
    expect(getByText('Group No.G7')).toBeTruthy()
    expect(getByText('Pending')).toBeTruthy()
    expect(getByText('$64.74')).toBeTruthy()
    expect(getByText('Delivery')).toBeTruthy()
    expect(getByText('Paid')).toBeTruthy()
    expect(getByText('2 orders · 4 items')).toBeTruthy()
    expect(getByTestId('orders-group-G7-clock')).toBeTruthy()
    expect(getByTestId('orders-group-G7-toggle').props.accessibilityLabel).toBe('Group No.G7, Pizza Jot, Pending')
    // The sum ends the header; the band holds the status and the time, in the tap area that opens the group.
    expect(getByTestId('orders-group-G7-store-total').props.children).toBe('$64.74')
    expect(inside(getByTestId('orders-group-G7-store-total'), 'orders-group-G7-band')).toBe(false)
    expect(inside(getByTestId('orders-group-G7-band'), 'orders-group-G7-toggle')).toBe(true)
    expect(inside(getByTestId('orders-group-G7-status'), 'orders-group-G7-band')).toBe(true)
    expect(inside(getByTestId('orders-group-G7-clock'), 'orders-group-G7-band')).toBe(true)
  })

  it('a long status takes as many lines as its words need', () => {
    const status = renderGroup(pair(19)).getByText('Driver almost at the customer')
    expect(status.props.numberOfLines).toBeUndefined()
    expect(StyleSheet.flatten(status.props.style).flexShrink).toBe(1)
  })

  describe('the band', () => {
    const off = (...keys: string[]) => ({ themeOverrides: themeWithValues((values) => { keys.forEach((key) => { values.visibility[key] = false }) }) })
    const paint = (variant: string) => ({ background: badgeVariants[variant].background, ink: badgeVariants[variant].color })

    it('is the soft colour of the first order\'s status: new warning, in progress primary, completed success, rejected danger', () => {
      const of = (status: number) => { const view = renderGroup(pair(status)); return { background: bandOf(view).backgroundColor, ink: inkOf(view) } }
      expect(of(0)).toEqual(paint('warning_soft'))
      expect(of(7)).toEqual(paint('primary_soft'))
      expect(of(23)).toEqual(paint('primary_soft'))
      expect(of(1)).toEqual(paint('success_soft'))
      expect(of(5)).toEqual(paint('danger_soft'))
    })

    it('goes to the time\'s state when the first order is at risk or late', () => {
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-11-19T12:02:00Z'))
      const risk = renderGroup(pair(0, { time_status: 'at_risk' }))
      expect(bandOf(risk).backgroundColor).toBe(badgeVariants.warning_soft.background)
      risk.unmount()
      const late = renderGroup(pair(0, { time_status: 'delayed' }))
      expect(bandOf(late).backgroundColor).toBe(badgeVariants.danger_soft.background)
      expect(inkOf(late)).toBe(badgeVariants.danger_soft.color)
      late.unmount()
      // An order in progress and in time keeps its status's colour; a late one is danger.
      const prepared = { reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } }, time_status: 'in_time' }
      const inTime = renderGroup(pair(7, { ...prepared, prepared_in: 20 }))
      expect(bandOf(inTime).backgroundColor).toBe(badgeVariants.primary_soft.background)
      inTime.unmount()
      expect(bandOf(renderGroup(pair(7, { ...prepared, prepared_in: 1 }))).backgroundColor).toBe(badgeVariants.danger_soft.background)
      jest.useRealTimers()
    })

    it('writes the first order\'s time as one sentence, with the clock time when the choice is on', () => {
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-11-19T12:02:00Z'))
      const view = renderGroup(pair(0))
      expect(plain(view.getByTestId('orders-group-G7-clock').props.children)).toBe('Waiting 02:00')
      view.unmount()
      const absolute = renderGroup(pair(0), { absoluteTime: true })
      expect(plain(absolute.getByTestId('orders-group-G7-clock').props.children)).toMatch(/^Waiting 02:00 · \d{1,2}:\d{2} (AM|PM)$/)
      jest.useRealTimers()
    })

    it('a group of preorders carries the calendar glyph and its day and time', () => {
      jest.useFakeTimers()
      jest.setSystemTime(Date.parse('2026-11-19T12:02:00Z'))
      const view = renderGroup(pair(13, { delivery_datetime_utc: '2026-11-20 13:30:00' }))
      expect(view.UNSAFE_queryAllByProps({ name: 'calendar-outline' }).length).toBeGreaterThan(0)
      expect(plain(view.getByTestId('orders-group-G7-clock').props.children)).toMatch(/^Tomorrow · \d{1,2}:\d{2} (AM|PM)$/)
      expect(renderGroup(pair(0)).UNSAFE_queryAllByProps({ name: 'calendar-outline' })).toHaveLength(0)
      jest.useRealTimers()
    })

    it('"orders.order_status" off, or `showStatus` false: the time alone; neither status nor time (the driver): no band', () => {
      const keyOff = renderGroup(pair(0), {}, off('orders.order_status'))
      expect(keyOff.queryByTestId('orders-group-G7-status')).toBeNull()
      expect(keyOff.getByTestId('orders-group-G7-clock')).toBeTruthy()
      expect(StyleSheet.flatten(keyOff.getByTestId('orders-group-G7-clock').props.style)).toMatchObject({ flex: 1, textAlign: 'right' })
      const asked = renderGroup(pair(0), { showStatus: false })
      expect(asked.queryByTestId('orders-group-G7-status')).toBeNull()
      expect(asked.getByTestId('orders-group-G7-clock')).toBeTruthy()
      const driver = renderGroup(pair(23), {}, off('orders.order_status'))
      expect(driver.queryByTestId('orders-group-G7-band')).toBeNull()
    })

    it('a group with the driver has its status and no time', () => {
      const view = renderGroup(pair(23))
      expect(view.getByTestId('orders-group-G7-status')).toBeTruthy()
      expect(view.queryByTestId('orders-group-G7-clock')).toBeNull()
    })

    it('History hides its time with "orders.date" and keeps the status', () => {
      const view = renderGroup(pair(1, { delivery_datetime_utc: '2026-11-19 11:42:00' }), {}, off('orders.date'))
      expect(view.queryByTestId('orders-group-G7-clock')).toBeNull()
      expect(view.getByTestId('orders-group-G7-status')).toBeTruthy()
      expect(renderGroup(pair(1, { delivery_datetime_utc: '2026-11-19 11:42:00' })).getByTestId('orders-group-G7-clock')).toBeTruthy()
    })

    it('the rows of the opened group have no band of their own', () => {
      const view = renderGroup(pair(0))
      fireEvent.press(view.getByTestId('orders-group-G7-toggle'))
      expect(view.getByTestId('order-card-2-row')).toBeTruthy()
      expect(view.queryByTestId('order-card-2-band')).toBeNull()
      expect(view.queryByTestId('order-card-2-clock')).toBeNull()
      expect(view.queryByTestId('order-card-2-status')).toBeNull()
      // They are inside the group's card, outside its tap area.
      expect(inside(view.getByTestId('order-card-2-row'), 'orders-group-G7-toggle')).toBe(false)
    })
  })

  it('draws no type chip when its orders are of different types, and says Unpaid when one is', () => {
    const mixed = [makeOrder({ id: 2, cart_group_id: 'G7', delivery_type: 1 }), makeOrder({ id: 1, cart_group_id: 'G7', delivery_type: 2, payment_events: [] })]
    const { queryByText, getByText } = renderGroup(mixed)
    expect(queryByText('Delivery')).toBeNull()
    expect(queryByText('Pickup')).toBeNull()
    expect(getByText('Unpaid')).toBeTruthy()
  })

  it('quick actions off: no group button and no review, the card still opens', () => {
    const pending = renderGroup(pair(0), { quickActions: false })
    expect(pending.queryByTestId('orders-group-G7-actions')).toBeNull()
    expect(pending.queryByText('Accept 2 orders')).toBeNull()
    fireEvent.press(pending.getByTestId('orders-group-G7-toggle'))
    expect(pending.getByTestId('order-card-2-row')).toBeTruthy()
    const history = renderGroup(pair(1), { quickActions: false })
    expect(history.queryByText('Review customer')).toBeNull()
  })

  it('accept and reject speak for the group: the sheets of orderActions get every order', () => {
    const orders = pair(0)
    const handleChangeOrderStatus = jest.fn()
    const { getByText } = renderGroup(orders, { handleChangeOrderStatus })
    fireEvent.press(getByText('Accept 2 orders'))
    // A group's notice only counts the orders: no order to go to.
    expect(mockActions.openAccept).toHaveBeenCalledWith(orders[0], { orders, handleChangeOrderStatus, from: 'list' })
    fireEvent.press(getByText('Reject 2 orders'))
    expect(mockActions.openReject).toHaveBeenCalledWith(orders[0], { orders, handleChangeOrderStatus })
  })

  it('marks the whole group ready only after a confirmation that names the group', async () => {
    const handleChangeOrderStatus = jest.fn(async () => [{}])
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    const { getByText } = renderGroup(pair(7), { handleChangeOrderStatus })
    fireEvent.press(getByText('Mark ready'))
    expect(handleChangeOrderStatus).not.toHaveBeenCalled()
    expect(alert.mock.calls[0][1]).toContain('Group No.G7')
    await act(async () => { (alert.mock.calls[0][2] as any[])[0].onPress() })
    expect(handleChangeOrderStatus).toHaveBeenCalledWith(4, [2, 1])
    alert.mockRestore()
  })

  it('has no group buttons when its orders are not at the same step', () => {
    const mixed = [makeOrder({ id: 2, status: 0, cart_group_id: 'G7' }), makeOrder({ id: 1, status: 7, cart_group_id: 'G7' })]
    const { queryByTestId } = renderGroup(mixed)
    expect(queryByTestId('orders-group-G7-actions')).toBeNull()
  })

  it('offers the review of the customer for a group of History and sends it through the list\'s controller', () => {
    const handleSendCustomerReview = jest.fn()
    const orders = pair(1)
    const { getByText } = renderGroup(orders, { handleSendCustomerReview })
    fireEvent.press(getByText('Review customer'))
    const { handleCustomCustomerReview } = mockActions.openReview.mock.calls[0][1]
    handleCustomCustomerReview({ comment: 'ok' }, jest.fn())
    expect(handleSendCustomerReview).toHaveBeenCalledWith(expect.objectContaining({ customerId: 9, orderIds: [2, 1], body: { comment: 'ok' } }))
  })
})

describe('OrderRowsList', () => {
  const items = (rows: any[]) => sectionItems([{ key: 'list', rows }])

  beforeEach(() => {
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => v, timeFormat: 'h:mm A' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  it('draws a card for an order and a group card for a group, and opens an order through the page\'s navigation', () => {
    const onNavigationRedirect = jest.fn()
    const handleClickOrder = jest.fn()
    const rows = [
      { key: 'g:G7:new', groupId: 'G7', orders: pair(0) },
      { key: 'o:5', orders: [makeOrder({ id: 5 })] }
    ]
    const { getByTestId } = renderWithProviders(<OrderRowsList items={items(rows)} onNavigationRedirect={onNavigationRedirect} handleClickOrder={handleClickOrder} />)
    expect(getByTestId('orders-group-G7')).toBeTruthy()
    fireEvent.press(getByTestId('order-card-5-open'))
    expect(handleClickOrder).toHaveBeenCalledWith(rows[1].orders[0])
    expect(onNavigationRedirect).toHaveBeenCalledWith('OrderDetails', { order: rows[1].orders[0] })
  })

  it('opens an order through `handleClickEvent` when the screen asks (the board\'s panel)', () => {
    const handleClickEvent = jest.fn()
    const onNavigationRedirect = jest.fn()
    const rows = [{ key: 'o:5', orders: [makeOrder({ id: 5 })] }]
    const { getByTestId } = renderWithProviders(<OrderRowsList items={items(rows)} handleClickEvent={handleClickEvent} onNavigationRedirect={onNavigationRedirect} />)
    fireEvent.press(getByTestId('order-card-5-open'))
    expect(handleClickEvent).toHaveBeenCalled()
    expect(onNavigationRedirect).not.toHaveBeenCalled()
  })

  it('a card calls the latest controller handler, not the one of the render that drew it', async () => {
    const first = jest.fn(async () => [{}])
    const second = jest.fn(async () => [{}])
    const rows = [{ key: 'o:5', orders: [makeOrder({ id: 5, status: 7 })] }]
    const { getByText, rerender } = renderWithProviders(<OrderRowsList items={items(rows)} handleChangeOrderStatus={first} />)
    rerender(<OrderRowsList items={items(rows)} handleChangeOrderStatus={second} />)
    await act(async () => { fireEvent.press(getByText('Mark ready')) })
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledWith(4, [5])
  })
})

describe('the device\'s two choices, read once by the list', () => {
  const rows = [
    { key: 'g:G7:new', groupId: 'G7', orders: pair(0) },
    { key: 'o:5', orders: [makeOrder({ id: 5 })] },
    { key: 'o:6', orders: [makeOrder({ id: 6, status: 7 })] }
  ]
  const list = () => <OrderRowsList items={sectionItems([{ key: 'list', rows }])} />

  beforeEach(() => {
    forgetOrdersDisplayForTests()
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => v, timeFormat: 'h:mm A' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })
  afterEach(() => forgetOrdersDisplayForTests())

  it('the theme\'s default is on: the cards, the group and the board\'s columns draw their buttons', () => {
    const { getByTestId } = renderWithProviders(list())
    expect(getByTestId('order-card-5-actions')).toBeTruthy()
    expect(getByTestId('order-card-6-actions')).toBeTruthy()
    expect(getByTestId('orders-group-G7-actions')).toBeTruthy()
  })

  it('the theme key off: no card draws an action row, in a list or in the board\'s tablet columns, and the card still opens', () => {
    const off = themeWithValues((values) => { values.visibility['orders.quick_actions'] = false })
    for (const platform of ['phone', 'tablet'] as const) {
      const themed = themeWithValues((values) => { values.visibility['orders.quick_actions'] = false }, { platform })
      const onPress = jest.fn()
      const { queryByTestId, getByTestId, unmount } = renderWithProviders(
        <OrderRowsList items={sectionItems([{ key: 'list', rows }])} handleClickEvent={onPress} selectedId={5} />,
        { themeOverrides: themed, platform }
      )
      expect(queryByTestId('order-card-5-actions')).toBeNull()
      expect(queryByTestId('order-card-6-actions')).toBeNull()
      expect(queryByTestId('orders-group-G7-actions')).toBeNull()
      fireEvent.press(getByTestId('order-card-5-open'))
      expect(onPress).toHaveBeenCalled()
      unmount()
    }
    expect(off).toBeTruthy()
  })

  it('the device\'s choice wins over the theme in both directions, at once', async () => {
    const off = themeWithValues((values) => { values.visibility['orders.quick_actions'] = false })
    const { queryByTestId } = renderWithProviders(list(), { themeOverrides: off })
    expect(queryByTestId('order-card-5-actions')).toBeNull()
    await act(async () => { await setOrdersDisplay({ quickActions: true }) })
    expect(queryByTestId('order-card-5-actions')).toBeTruthy()
    await act(async () => { await setOrdersDisplay({ quickActions: false }) })
    expect(queryByTestId('order-card-5-actions')).toBeNull()
  })

  it('the clock time follows the choice: "Waiting 02:00 · 12:00 PM" on, "Waiting 02:00" off, and a preorder never changes', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(Date.parse('2026-11-19T12:02:00Z'))
    const timed = [
      { key: 'o:5', orders: [makeOrder({ id: 5 })] },
      { key: 'o:8', orders: [makeOrder({ id: 8, status: 13, delivery_datetime_utc: '2026-11-20 13:30:00' })] }
    ]
    const { getByTestId } = renderWithProviders(<OrderRowsList items={sectionItems([{ key: 'list', rows: timed }])} />)
    const label = (id: number) => plain(getByTestId(`order-card-${id}-clock`).props.children)
    expect(label(5)).toBe('Waiting 02:00')
    const preorder = label(8)
    expect(preorder).toMatch(/^Tomorrow · \d{1,2}:\d{2} (AM|PM)$/)
    await act(async () => { await setOrdersDisplay({ absoluteTime: true }) })
    expect(label(5)).toMatch(/^Waiting 02:00 · \d{1,2}:\d{2} (AM|PM)$/)
    expect(label(8)).toBe(preorder)
    jest.useRealTimers()
  })
})

describe('areListedOrderRowPropsEqual', () => {
  const order = makeOrder({ id: 1 })

  it('is true for the same order and for a copy that draws the same card', () => {
    expect(areListedOrdersEqual(order, order)).toBe(true)
    expect(areListedOrdersEqual(order, { ...order, products: [...order.products], customer: { ...order.customer } })).toBe(true)
  })

  it('is false when something the card writes changes', () => {
    for (const change of [
      { status: 7 }, { unsync: true }, { time_status: 'delayed' }, { summary: { total: 50 } }, { customer: { name: 'Ana' } },
      { driver: { id: 3, name: 'Omar' } }, { products: [] }, { products: [{ name: 'Margherita pizza', quantity: 3 }, { name: 'Garlic knots', quantity: 1 }] },
      { prepared_in: 15 }, { reject_reason: 'x' }, { payment_events: [] }, { paymethod: { name: 'Card', gateway: 'cash' } },
      { reporting_data: { at: { 'status:7': '2026-11-19 12:00:00' } } }
    ]) {
      expect(areListedOrdersEqual(order, { ...order, ...change })).toBe(false)
    }
  })

  it('compares the orders of a group and the state that changes what a card can do', () => {
    expect(areListedOrderRowPropsEqual({ orders: [order] }, { orders: [{ ...order }] })).toBe(true)
    expect(areListedOrderRowPropsEqual({ orders: [order] }, { orders: [order, order] })).toBe(false)
    expect(areListedOrderRowPropsEqual({ order, loadingChangeOrder: false }, { order, loadingChangeOrder: true })).toBe(false)
    expect(areListedOrderRowPropsEqual({ order, selected: false }, { order, selected: true })).toBe(false)
    // The device's two choices reach the card as props: a change redraws it.
    expect(areListedOrderRowPropsEqual({ order, quickActions: true }, { order, quickActions: false })).toBe(false)
    expect(areListedOrderRowPropsEqual({ order, absoluteTime: false }, { order, absoluteTime: true })).toBe(false)
    expect(areListedOrderRowPropsEqual({ order, quickActions: true, absoluteTime: false }, { order: { ...order }, quickActions: true, absoluteTime: false })).toBe(true)
    expect(areListedOrderRowPropsEqual({ order, section: 'new' }, { order, section: 'history' })).toBe(false)
  })

  describe('the buttons share the row (T3-C2, the grouped card)', () => {
    it('the pickup pair is as wide as its labels, as the order\'s own card draws it', () => {
      const { getByTestId } = renderGroup(pair(4, { delivery_type: 2 }))
      const decline = cellOf(getByTestId('orders-group-G7-not_picked_up'))
      const advance = cellOf(getByTestId('orders-group-G7-picked_up'))
      expect(decline).toMatchObject({ flexGrow: 1, flexShrink: 1 })
      expect(advance).toMatchObject({ flexGrow: 2, flexShrink: 1 })
      expect(decline.flex).toBeUndefined()
    })

    it('the reservation\'s pair too, and Reject and Accept stay 1 : 2 of the row', () => {
      const reservation = renderGroup(pair(7, { delivery_type: 9 }))
      expect(cellOf(reservation.getByTestId('orders-group-G7-not_arrived'))).toMatchObject({ flexGrow: 1, flexShrink: 1 })
      reservation.unmount()
      const fresh = renderGroup(pair(0))
      expect(cellOf(fresh.getByTestId('orders-group-G7-reject')).flex).toBe(1)
      expect(cellOf(fresh.getByTestId('orders-group-G7-accept')).flex).toBe(2)
    })
  })
})
