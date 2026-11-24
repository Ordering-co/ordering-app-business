import React from 'react'
import { FlatList, RefreshControl, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    useSession: jest.fn(() => [{ token: 'token', user: { id: 7, level: 2 } }]),
    useUtils: jest.fn(() => [{
      // The API's own text is UTC: what the list asks for in local time comes back as it is.
      optimizeImage: (url: string) => url,
      dateFormat: 'DD/MM/YYYY',
      timeFormat: 'hh:mm A'
    }])
  }
})

import { PreviousMessages } from '..'
import { useConfig } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleOrder } from '../../../../../../jest/helpers/b4MessagesDefaults'
import { buildAppTheme, defaultAppTheme, THEME_PRODUCT_TYPE } from '../../../../../theme/engine'
import dayjs from '../../../../../utils/dayjs'
import { themeFontFamily } from '../../../../../theme/helpers'

const themeWith = (values: any) => buildAppTheme({ version: 2, product_type: THEME_PRODUCT_TYPE, values })
const flat = (node: any) => StyleSheet.flatten(node.props.style)

const order = (over: any = {}) => ({
  ...sampleOrder,
  id: 1053,
  status: 0,
  delivery_type: 1,
  unread_count: 0,
  unread_direct_count: 0,
  last_direct_message_at: '2020-03-04 12:31:00',
  customer: { id: 2, name: 'James', lastname: 'Carter', cellphone: '555' },
  ...over
})

const props = (orders: any[], over: any = {}) => ({
  orders,
  onNavigationRedirect: jest.fn(),
  getOrders: jest.fn(),
  loadMore: jest.fn(),
  pagination: { currentPage: 1, totalPages: 1 },
  loading: false,
  ...over
})

describe('PreviousMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  it('draws a conversation as the customer\'s row: initials, the order number before the name, time, type, status', () => {
    const { getByTestId, getByText } = renderWithProviders(<PreviousMessages {...props([order()])} />)
    expect(getByText('JC')).toBeTruthy()
    expect(getByTestId('message-title')).toHaveTextContent(/^#1053 · James Carter$/)
    expect(getByTestId('message-meta')).toHaveTextContent(/^Delivery$/)
    expect(getByTestId('message-status')).toHaveTextContent('Pending')
  })

  it('has no last-message preview line (the API does not give it)', () => {
    const { queryByTestId } = renderWithProviders(<PreviousMessages {...props([order({ last_message: { comment: 'Hi' } })])} />)
    expect(queryByTestId('message-preview')).toBeNull()
  })

  it('writes the time of the last message when it was today, and its day when it was not', () => {
    // The API writes UTC: build the stamps from instants so the device's clock decides, as it does on the phone.
    const stamp = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ')
    const now = new Date()
    const view = renderWithProviders(<PreviousMessages {...props([
      order({ id: 1, last_direct_message_at: stamp(new Date(now.getTime() - 60 * 1000)) }),
      order({ id: 2, last_direct_message_at: '2020-03-04 09:15:00' })
    ])} />)
    const [first, second] = view.getAllByTestId('message-time')
    expect(first).toHaveTextContent(/^\d\d:\d\d (AM|PM)$/)
    expect(second).toHaveTextContent('04/03/2020')
  })

  it('writes no time for an order that has no message yet', () => {
    const { queryByTestId } = renderWithProviders(<PreviousMessages {...props([order({ last_direct_message_at: null })])} />)
    expect(queryByTestId('message-time')).toBeNull()
  })

  it('names the order\'s type', () => {
    const view = renderWithProviders(<PreviousMessages {...props([order({ id: 1, delivery_type: 2 }), order({ id: 2, delivery_type: 3 })])} />)
    const meta = view.getAllByTestId('message-meta').map((node) => node.props.children)
    expect(meta).toEqual(['Pickup', 'Eat in'])
  })

  it('counts the unread messages of a row with the direct count, as the slot says, with a label for a screen reader', () => {
    const { getByTestId, queryAllByTestId, getByLabelText } = renderWithProviders(
      <PreviousMessages {...props([order({ unread_direct_count: 3, unread_count: 8 }), order({ id: 2 })])} />
    )
    expect(getByTestId('message-unread')).toHaveTextContent('3')
    expect(queryAllByTestId('message-unread')).toHaveLength(1)
    expect(getByLabelText('3 unread messages')).toBeTruthy()
    const slot = defaultAppTheme().native.components.conversation_row.slots.unread
    expect(slot.size).toBe('sm')
  })

  it('writes one unread message in the singular', () => {
    const { getByLabelText } = renderWithProviders(<PreviousMessages {...props([order({ unread_direct_count: 1 })])} />)
    expect(getByLabelText('1 unread message')).toBeTruthy()
  })

  it('falls back to the full count when the order has no direct one', () => {
    const { getByTestId } = renderWithProviders(
      <PreviousMessages {...props([order({ unread_direct_count: undefined, unread_count: 4 })])} />
    )
    expect(getByTestId('message-unread')).toHaveTextContent('4')
  })

  it('tags the title with the role of who wrote last only when it was not the customer', () => {
    const view = renderWithProviders(<PreviousMessages {...props([
      order({ id: 1, last_message: { author: { id: 5, level: 4 } } }),
      order({ id: 2, last_message: { author: { id: 6, level: 3 } } }),
      order({ id: 3, last_message: { author: { id: 7, level: 4 } } }),
      order({ id: 4 })
    ])} />)
    const titles = view.getAllByTestId('message-title').map((node) => flat(node) && node.props.children)
    expect(view.getAllByTestId('message-title')[0]).toHaveTextContent('#1 · James Carter (Driver)')
    expect(view.getAllByTestId('message-title')[1]).toHaveTextContent(/^#2 · James Carter$/)
    // The user's own message (id 7) is not another role.
    expect(view.getAllByTestId('message-title')[2]).toHaveTextContent(/^#3 · James Carter$/)
    expect(view.getAllByTestId('message-title')[3]).toHaveTextContent(/^#4 · James Carter$/)
    expect(titles).toHaveLength(4)
  })

  it('writes the word "Customer" and its initial when the project hides the customer\'s contact', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: { hide_customer_contact_business_app: { value: '1' } } }])
    const { getByTestId, queryByText, getByText } = renderWithProviders(<PreviousMessages {...props([order()])} />)
    expect(getByTestId('message-title')).toHaveTextContent(/^#1053 · Customer$/)
    expect(queryByText(/James Carter/)).toBeNull()
    expect(getByText('C')).toBeTruthy()
  })

  describe('an ended order', () => {
    it('writes the order number the project shows in the row (the external id with change_order_id on)', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ configs: { change_order_id: { value: '1' } } }])
      const { getByText } = renderWithProviders(<PreviousMessages {...props([order({ external_id: 'EXT-9' })])} />)
      expect(getByText(/#EXT-9 · /)).toBeTruthy()
    })

    it('names status 4 "Ready for pickup", as the chips of the orders and the details do (not "Preparation Completed")', () => {
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 4 })])} />)
      expect(getByTestId('message-status')).toHaveTextContent('Ready for pickup')
    })

    it('lays the row out in three lines as the driver\'s: the name and the last message\'s time, the type and the timer, the status and the count', () => {
      const { getByTestId } = renderWithProviders(
        <PreviousMessages {...props([order({ status: 15, unread_direct_count: 3 })])} />
      )
      const within = (line: string, testID: string) => getByTestId(line).findAll((node: any) => node.props?.testID === testID).length > 0
      expect(within('message-head', 'message-title')).toBe(true)
      expect(within('message-head', 'message-time')).toBe(true)
      expect(within('message-type-line', 'message-meta')).toBe(true)
      expect(within('message-status-line', 'message-status')).toBe(true)
      expect(within('message-status-line', 'message-unread')).toBe(true)
      expect(within('message-type-line', 'message-status')).toBe(false)
      const typeLine = getByTestId('message-type-line')
      // The type never gives way; the count does not shrink or wrap.
      expect(flat(getByTestId('message-meta')).flexShrink).toBe(0)
      expect(flat(typeLine).flexWrap).toBeUndefined()
      let count: any = getByTestId('message-unread').parent
      while (count && !count.props?.accessibilityLabel) count = count.parent
      expect(flat(count).flexShrink).toBe(0)
    })

    it('lets a long status wrap over lines instead of being cut (a badge never truncates), beside the count', () => {
      const { getByTestId } = renderWithProviders(
        <PreviousMessages {...props([order({ status: 15, unread_direct_count: 3 })])} />
      )
      expect(flat(getByTestId('message-status')).flexShrink).toBe(1)
      expect(getByTestId('message-status').findAll((node: any) => node.props.numberOfLines === 1)).toHaveLength(0)
    })

    it.each([1, 2, 5, 6, 10, 11, 12, 15, 16, 17])('is a quiet row for status %s', (status) => {
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status })])} />)
      const quiet = defaultAppTheme().native.components.conversation_row.base.ended_color
      expect(flat(getByTestId('message-title')).color).toBe(quiet)
      expect(flat(getByTestId('message-meta')).color).toBe(quiet)
    })

    it('draws its disc in the avatar\'s quiet pair', () => {
      const avatar = defaultAppTheme().native.components.avatar.base
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 1 })])} />)
      expect(flat(getByTestId('message-avatar')).backgroundColor).toBe(avatar.muted_background)
    })

    it('is a normal row, with the avatar\'s tint, while the order is open', () => {
      const avatar = defaultAppTheme().native.components.avatar.base
      const row = defaultAppTheme().native.components.conversation_row.base
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 7 })])} />)
      expect(flat(getByTestId('message-avatar')).backgroundColor).toBe(avatar.background)
      expect(flat(getByTestId('message-title')).color).toBe(row.name_color)
    })
  })

  describe('the row as a control', () => {
    it('opens the chat of the order with its number', () => {
      const p = props([order()])
      const { getByTestId } = renderWithProviders(<PreviousMessages {...p} />)
      fireEvent.press(getByTestId('message-row'))
      expect(p.onNavigationRedirect).toHaveBeenCalledWith('OrderMessage', { orderId: 1053 })
    })

    it('marks the conversation open in the second pane of a tablet, and no other', () => {
      const { getAllByTestId } = renderWithProviders(
        <PreviousMessages {...props([order({ id: 1 }), order({ id: 2 })])} selectedOrderId={2} />
      )
      const [first, second] = getAllByTestId('message-row')
      expect(first.props.accessibilityState.selected).toBe(false)
      expect(second.props.accessibilityState.selected).toBe(true)
      expect(flat(second).backgroundColor).toBe(defaultAppTheme().native.tokens.color.primary_subtle)
    })

    it('lays the rows out with the conversation row\'s padding and gap, a line between them', () => {
      const row = defaultAppTheme().native.components.conversation_row.base
      const { getAllByTestId } = renderWithProviders(<PreviousMessages {...props([order({ id: 1 }), order({ id: 2 })])} />)
      const style = flat(getAllByTestId('message-row')[0])
      expect(style.paddingVertical).toBe(row.padding_y)
      expect(style.gap).toBe(row.gap)
    })
  })

  describe('the name of a conversation with unread messages', () => {
    const family = (node: any) => flat(node).fontFamily

    it('is bold while the row has unread messages, and as the row\'s own weight when it has none', () => {
      const theme: any = defaultAppTheme()
      const view = renderWithProviders(<PreviousMessages {...props([
        order({ id: 1, unread_direct_count: 2 }),
        order({ id: 2, unread_direct_count: 0 })
      ])} />)
      const [unread, read] = view.getAllByTestId('message-title')
      expect(family(unread)).toBe(themeFontFamily(theme, 'body', 'bold'))
      expect(family(read)).not.toBe(family(unread))
    })

    it('is not bold when the theme hides the unread counters', () => {
      const view = renderWithProviders(<PreviousMessages {...props([
        order({ id: 1, unread_direct_count: 2 }),
        order({ id: 2, unread_direct_count: 0 })
      ])} />, { themeOverrides: themeWith({ visibility: { 'messages.unread_badge': false } }) })
      const [first, second] = view.getAllByTestId('message-title')
      expect(family(first)).toBe(family(second))
    })
  })

  describe('the order\'s timer at the end of the second line', () => {
    const NOW = Date.parse('2026-03-04T12:30:00Z')
    const apiTime = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
    beforeEach(() => {
      jest.useFakeTimers()
      jest.setSystemTime(NOW)
    })
    afterEach(() => jest.useRealTimers())
    const colors = () => defaultAppTheme().native.tokens.color

    it('writes the sentence the order card\'s band writes for a new order, in the warning colour, and ticks', () => {
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 0, created_at: apiTime(NOW - 134 * 1000) })])} />)
      expect(getByTestId('message-timer')).toHaveTextContent('Waiting 02:14')
      expect(flat(getByTestId('message-timer')).color).toBe(colors().warning_text)
      act(() => { jest.advanceTimersByTime(3000) })
      expect(getByTestId('message-timer')).toHaveTextContent('Waiting 02:17')
    })

    it('counts the time left of a preparing order in the colour of its time state, and "Late" past the promise in danger', () => {
      const preparing = (acceptedAgo: number, extra: any = {}) => order({
        status: 7, prepared_in: 15, reporting_data: { at: { 'status:7': apiTime(NOW - acceptedAgo * 60000) } }, ...extra
      })
      const inTime = renderWithProviders(<PreviousMessages {...props([preparing(10, { time_status: 'in_time' })])} />)
      expect(inTime.getByTestId('message-timer')).toHaveTextContent('Ready in 05:00')
      expect(flat(inTime.getByTestId('message-timer')).color).toBe(colors().success_text)
      const late = renderWithProviders(<PreviousMessages {...props([preparing(19, { time_status: 'in_time' })])} />)
      expect(late.getByTestId('message-timer')).toHaveTextContent('Late 04:00')
      expect(flat(late.getByTestId('message-timer')).color).toBe(colors().danger_text)
    })

    it('is in the same line as the order\'s type, over the unread count, in the band\'s text look', () => {
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 0, created_at: apiTime(NOW - 60 * 1000), unread_direct_count: 2 })])} />)
      const within = (line: string, testID: string) => getByTestId(line).findAll((node: any) => node.props?.testID === testID).length > 0
      expect(within('message-type-line', 'message-timer')).toBe(true)
      expect(within('message-type-line', 'message-unread')).toBe(false)
      expect(within('message-status-line', 'message-unread')).toBe(true)
      const band = defaultAppTheme().native.components.order_card.base.time_text
      expect(flat(getByTestId('message-timer'))).toEqual(expect.objectContaining({ fontSize: band.fontSize, lineHeight: band.lineHeight }))
      expect(flat(getByTestId('message-timer')).textAlign).toBe('right')
    })

    it('writes none for an ended order, nor for one with the driver', () => {
      const view = renderWithProviders(<PreviousMessages {...props([
        order({ id: 1, status: 1 }),
        order({ id: 2, status: 3 })
      ])} />)
      expect(view.queryAllByTestId('message-timer')).toHaveLength(0)
    })

    it('writes the time of day a pre-order is for, as the band does, without ticking', () => {
      const { getByTestId } = renderWithProviders(<PreviousMessages {...props([order({ status: 13, delivery_datetime_utc: apiTime(NOW + 26 * 3600 * 1000) })])} />)
      expect(getByTestId('message-timer')).toHaveTextContent(/^Tomorrow · /)
    })
  })

  describe('visibility', () => {
    it('hides the unread counter of the rows with messages.unread_badge', () => {
      const { queryByTestId, getByTestId } = renderWithProviders(
        <PreviousMessages {...props([order({ unread_direct_count: 3 })])} />,
        { themeOverrides: themeWith({ visibility: { 'messages.unread_badge': false } }) }
      )
      expect(queryByTestId('message-unread')).toBeNull()
      expect(getByTestId('message-title')).toBeTruthy()
    })
  })

  describe('loading and paging', () => {
    it('shows the list\'s skeleton while the first page loads', () => {
      const { getByTestId, queryByTestId } = renderWithProviders(<PreviousMessages {...props([], { loading: true })} />)
      expect(getByTestId('message-list-skeleton')).toBeTruthy()
      expect(queryByTestId('message-row')).toBeNull()
    })

    it('draws the skeleton\'s rows with the real row\'s styles (the disc and the two lines)', () => {
      const { getAllByTestId } = renderWithProviders(<PreviousMessages {...props([], { loading: true })} />)
      const row = defaultAppTheme().native.components.conversation_row.base
      expect(getAllByTestId('message-row-skeleton')).toHaveLength(6)
      expect(flat(getAllByTestId('message-row-skeleton')[0]).paddingVertical).toBe(row.padding_y)
    })

    it('asks for the next page with "Load more orders" while there are pages left', () => {
      const p = props([order()], { pagination: { currentPage: 1, totalPages: 2 } })
      const { getByTestId, getByText } = renderWithProviders(<PreviousMessages {...p} />)
      expect(getByText('Load more orders')).toBeTruthy()
      fireEvent.press(getByTestId('messages-load-more'))
      expect(p.loadMore).toHaveBeenCalledTimes(1)
    })

    it('has no button on the last page, nor while a page loads', () => {
      expect(renderWithProviders(<PreviousMessages {...props([order()])} />).queryByText('Load more orders')).toBeNull()
      const loading = renderWithProviders(<PreviousMessages {...props([order()], { pagination: { currentPage: 1, totalPages: 2 }, loading: true })} />)
      expect(loading.queryByText('Load more orders')).toBeNull()
    })

    it('keeps the button when the rows a filter leaves are none, so the next page can be asked for', () => {
      const p = props([], { pagination: { currentPage: 1, totalPages: 2 } })
      const { getByText } = renderWithProviders(<PreviousMessages {...p} />)
      expect(getByText('Load more orders')).toBeTruthy()
    })

    it('refreshes by pulling, with the theme\'s spinner color', () => {
      const p = props([order()])
      const view = renderWithProviders(<PreviousMessages {...p} />)
      const control = view.UNSAFE_getByType(FlatList).props.refreshControl
      expect(control.type).toBe(RefreshControl)
      control.props.onRefresh()
      expect(p.getOrders).toHaveBeenCalledTimes(1)
      expect(control.props.tintColor).toBe(defaultAppTheme().native.components.spinner.base.color)
    })

    it('draws no rows while the list is in error', () => {
      const { queryByTestId } = renderWithProviders(<PreviousMessages {...props([order()], { error: ['Network Error'] })} />)
      expect(queryByTestId('message-row')).toBeNull()
    })
  })
})
