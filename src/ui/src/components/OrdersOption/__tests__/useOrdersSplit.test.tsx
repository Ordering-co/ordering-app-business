import React from 'react'
import { act, renderHook } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'
import { useApi, useEvent, useSession, useUtils, useWebsocket } from '@components'

import dayjs from '@/utils/dayjs'
import { defaultAppTheme } from '../../../../../theme/engine'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { SocketReconnectProvider, RECONNECT_SETTLE_MS, NETWORK_RETURN_WAIT_MS } from '../../../../../context/SocketReconnectContext'
import { ORDER_CHANGED_EVENT } from '../orderChanges'
import { useOrdersSplit } from '../useOrdersSplit'
import { makeOrder, slot } from './fixtures'
import { fakeOrdersApi } from './fakeOrdersApi'

const theme = defaultAppTheme()
const events: Record<string, Array<(...args: any[]) => void>> = {}
const socket: Record<string, Array<() => void>> = {}

const wrapper = ({ children }: any) => (
  <ThemeProvider theme={theme}>
    <SocketReconnectProvider>{children}</SocketReconnectProvider>
  </ThemeProvider>
)

// The chips off (`orders.stage_filter`): New and In progress are the controller's own lists, as the tests of the open orders' paging need.
const sectionsTheme = themeWithValues((values) => { values.visibility['orders.stage_filter'] = false })
const sectionsWrapper = ({ children }: any) => (
  <ThemeProvider theme={sectionsTheme}>
    <SocketReconnectProvider>{children}</SocketReconnectProvider>
  </ThemeProvider>
)

const base = (overrides: Record<string, any> = {}) => ({
  ordersGroup: { active: slot([]), completed: slot([]) },
  currentTabSelected: 'active',
  setCurrentTabSelected: jest.fn(),
  setCurrentFilters: jest.fn(),
  setOrdersGroup: jest.fn(),
  loadOrders: jest.fn(),
  loadMoreOrders: jest.fn(),
  filtered: null,
  ordersFiltered: slot([]),
  isNetConnected: true,
  ...overrides
})

const utc = (value: any) => dayjs.utc(value).format('YYYY-MM-DD HH:mm:ss')

describe('useOrdersSplit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(events)) delete events[key]
    for (const key of Object.keys(socket)) delete socket[key]
    ;(useUtils as jest.Mock).mockReturnValue([{
      parseDate: (value: string, options: any = {}) => (options.utc === false ? dayjs(value) : dayjs.utc(value).local()).format(options.outputFormat ?? 'YYYY-MM-DD HH:mm'),
      dateFormat: 'MM/DD/YYYY',
      timeFormat: 'HH:mm'
    }, {}])
    ;(useEvent as jest.Mock).mockReturnValue([{
      on: (name: string, handler: any) => { (events[name] ??= []).push(handler) },
      off: (name: string, handler: any) => { events[name] = (events[name] ?? []).filter((item) => item !== handler) },
      emit: jest.fn((name: string, ...data: any[]) => { (events[name] ?? []).slice().forEach((handler) => handler(...data)) })
    }])
    ;(useWebsocket as jest.Mock).mockReturnValue({
      on: (name: string, handler: any) => { (socket[name] ??= []).push(handler) },
      off: (name: string, handler: any) => { socket[name] = (socket[name] ?? []).filter((item) => item !== handler) }
    })
  })

  it('files History under Today, Yesterday and the date, newest first', () => {
    const now = dayjs.utc()
    const history = [
      makeOrder({ id: 9, status: 1, delivery_datetime_utc: utc(now) }),
      makeOrder({ id: 8, status: 1, delivery_datetime_utc: utc(now.subtract(1, 'day')) }),
      makeOrder({ id: 7, status: 5, delivery_datetime_utc: utc(now.subtract(10, 'day')) })
    ]
    const { result } = renderHook(() => useOrdersSplit(base({ ordersGroup: { active: slot([]), completed: slot(history, { currentFilter: [1, 2, 5, 6, 10, 11, 12, 15, 16, 17] }) } })), { wrapper })
    expect(result.current.history.map((day) => day.label)).toEqual(['Today', 'Yesterday', dayjs.utc(now.subtract(10, 'day')).local().format('MM/DD/YYYY')])
  })

  it('narrows History to the statuses of the chip', () => {
    const history = [makeOrder({ id: 2, status: 1, delivery_datetime_utc: utc(dayjs.utc()) }), makeOrder({ id: 1, status: 5, delivery_datetime_utc: utc(dayjs.utc()) })]
    const { result } = renderHook(() => useOrdersSplit(base({ ordersGroup: { active: slot([]), completed: slot(history, { currentFilter: [2, 5, 6, 10, 12, 16, 17] }) } })), { wrapper })
    expect(result.current.historyFilter).toBe('cancelled')
    expect(result.current.history.flatMap((day) => day.orders.flatMap((row) => row.orders.map((order) => order.id)))).toEqual([1])
  })

  it('follows the tab with the controller\'s slot, and not while a search is on', () => {
    const props = base()
    const { result } = renderHook(() => useOrdersSplit(props), { wrapper })
    expect(props.setCurrentTabSelected).not.toHaveBeenCalled()
    act(() => result.current.setTab('history'))
    expect(props.setCurrentTabSelected).toHaveBeenCalledWith('completed')
    const searching = base({ filtered: { id: '1' }, currentTabSelected: 'active' })
    const second = renderHook(() => useOrdersSplit(searching), { wrapper })
    act(() => second.result.current.setTab('history'))
    expect(searching.setCurrentTabSelected).not.toHaveBeenCalled()
    expect(second.result.current.searching).toBe(true)
  })

  it('can load more only for History and the results, while the controller has pages and is not busy', () => {
    const more = { currentPage: 1, pageSize: 50, total: 90, totalPages: 2 }
    const history = renderHook(() => useOrdersSplit(base({ ordersGroup: { active: slot([]), completed: slot([makeOrder({ status: 1 })], { pagination: more }) } })), { wrapper })
    expect(history.result.current.canLoadMore).toBe(false)
    act(() => history.result.current.setTab('history'))
    expect(history.result.current.canLoadMore).toBe(true)
    const busy = renderHook(() => useOrdersSplit(base({ filtered: { id: '1' }, ordersFiltered: slot([makeOrder()], { pagination: more, loading: true }) })), { wrapper })
    expect(busy.result.current.canLoadMore).toBe(false)
    const results = base({ filtered: { id: '1' }, ordersFiltered: slot([makeOrder()], { pagination: more }) })
    const found = renderHook(() => useOrdersSplit(results), { wrapper })
    expect(found.result.current.canLoadMore).toBe(true)
    act(() => found.result.current.loadMore())
    expect(results.loadMoreOrders).toHaveBeenCalledWith({ allStatusses: true })
    const offline = renderHook(() => useOrdersSplit(base({ isNetConnected: false, filtered: { id: '1' }, ordersFiltered: slot([makeOrder()], { pagination: more }) })), { wrapper })
    expect(offline.result.current.canLoadMore).toBe(false)
  })

  it('lays an action taken from the details over the search results (the controller cannot write its filtered list)', () => {
    const props = base({ filtered: { id: '28' }, ordersFiltered: slot([makeOrder({ id: 2805, status: 7 }), makeOrder({ id: 2807, status: 7 })]) })
    const { result } = renderHook(() => useOrdersSplit(props), { wrapper })
    expect(result.current.results.map((row) => row.orders[0].status)).toEqual([7, 7])
    act(() => { (events.order_changed_by_app ?? []).forEach((handler) => handler({ id: 2805, status: 4 })) })
    expect(result.current.results.map((row) => [row.orders[0].id, row.orders[0].status])).toEqual([[2805, 4], [2807, 7]])
    // The list payload's own amounts stay, a refresh asks the server again and the overlay is dropped.
    expect(result.current.results[0].orders[0].summary).toEqual({ total: 32.37 })
    act(() => result.current.refresh())
    expect(result.current.results.map((row) => row.orders[0].status)).toEqual([7, 7])
  })

  it('lays the results out as the board does: the open ones by stage, the closed ones by day (T3-C5)', () => {
    const results = [
      makeOrder({ id: 30, status: 0 }), makeOrder({ id: 29, status: 13 }), makeOrder({ id: 28, status: 7 }),
      makeOrder({ id: 27, status: 4 }), makeOrder({ id: 26, status: 23 }),
      makeOrder({ id: 25, status: 1, delivery_datetime_utc: '2026-11-19 16:20:00' }), makeOrder({ id: 24, status: 5, delivery_datetime_utc: '2026-11-19 15:00:00' })
    ]
    const props = base({ filtered: { delivery_type: 2 }, ordersGroup: { active: slot([makeOrder({ id: 99, status: 0 })]), completed: slot([]) }, ordersFiltered: slot(results) })
    const { result } = renderHook(() => useOrdersSplit(props), { wrapper })
    const ids = (rows: any[]) => rows.flatMap((row) => row.orders.map((order: any) => order.id))
    const found = result.current.resultLists
    expect(ids(found.newOrders)).toEqual([30, 29])
    expect(ids(found.preparing)).toEqual([28])
    expect(ids(found.ready)).toEqual([27])
    expect(ids(found.withDriver)).toEqual([26])
    expect(found.history.flatMap((day) => ids(day.orders)).sort()).toEqual([24, 25])
    // The open orders the controller holds without the filter are not the results .
    expect(ids(result.current.newOrders)).toEqual([99])
  })

  it('has no result lists without a filter, and a History chip narrows the closed results', () => {
    const none = renderHook(() => useOrdersSplit(base({ ordersFiltered: slot([makeOrder({ id: 5, status: 0 })]) })), { wrapper })
    expect(none.result.current.resultLists.counts.active).toBe(0)
    expect(none.result.current.resultLists.history).toEqual([])

    const closed = [makeOrder({ id: 25, status: 1, delivery_datetime_utc: '2026-11-19 16:20:00' }), makeOrder({ id: 24, status: 5, delivery_datetime_utc: '2026-11-19 15:00:00' })]
    const props = base({
      filtered: { id: '2' },
      ordersGroup: { active: slot([]), completed: slot([], { currentFilter: [2, 5, 6, 10, 12, 16, 17] }) },
      ordersFiltered: slot(closed, { pagination: { currentPage: 1, pageSize: 50, total: 90, totalPages: 2 } })
    })
    const { result } = renderHook(() => useOrdersSplit(props), { wrapper })
    expect(result.current.resultLists.history.flatMap((day) => day.orders.flatMap((row) => row.orders.map((order) => order.id)))).toEqual([24])
  })

  it('moves a result card to its new column with the app\'s own event, the filter on (T3-C5)', () => {
    const props = base({ filtered: { delivery_type: 2 }, ordersFiltered: slot([makeOrder({ id: 12, status: 0 }), makeOrder({ id: 11, status: 0 })]) })
    const { result } = renderHook(() => useOrdersSplit(props), { wrapper })
    expect(result.current.resultLists.counts).toMatchObject({ new: 2, preparing: 0 })
    act(() => { (events[ORDER_CHANGED_EVENT] ?? []).forEach((handler) => handler({ id: 12, status: 7 })) })
    expect(result.current.resultLists.counts).toMatchObject({ new: 1, preparing: 1 })
    expect(result.current.resultLists.preparing[0].orders[0].id).toBe(12)
    act(() => { (events[ORDER_CHANGED_EVENT] ?? []).forEach((handler) => handler({ id: 12, status: 15 })) })
    expect(result.current.resultLists.counts).toMatchObject({ new: 1, preparing: 0 })
    expect(result.current.resultLists.history.flatMap((day) => day.orders.flatMap((row) => row.orders.map((order) => order.id)))).toEqual([12])
  })

  it('the board keeps the tab it is on while a search is made: its History is a screen of its own', () => {
    const props = base({ filtered: { id: '1' }, ordersFiltered: slot([makeOrder({ id: 3, status: 1 })]) })
    const phone = renderHook(() => useOrdersSplit(props), { wrapper })
    expect(phone.result.current.tab).toBe('history')
    const board = renderHook(() => useOrdersSplit(props, { allStages: true }), { wrapper })
    expect(board.result.current.tab).toBe('new')
  })

  it('refreshes the open orders, or the results of a search, and shows the spinner until they have loaded', () => {
    const props = base()
    const { result, rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: props })
    act(() => result.current.refresh())
    expect(props.loadOrders).toHaveBeenCalledWith({ newFetch: true })
    expect(result.current.refreshing).toBe(true)
    rerender({ ...props, ordersGroup: { ...props.ordersGroup, active: slot([], { loading: true }) } })
    expect(result.current.refreshing).toBe(true)
    rerender(props)
    expect(result.current.refreshing).toBe(false)

    const searching = base({ filtered: { id: '1' } })
    const second = renderHook(() => useOrdersSplit(searching), { wrapper })
    act(() => second.result.current.refresh())
    expect(searching.loadOrders).toHaveBeenCalledWith({ newFetch: true }, { allStatusses: true })
  })

  it('keeps the list while the open orders reload and draws no count on a tab, however many orders are left to load', () => {
    const more = { currentPage: 1, pageSize: 50, total: 90, totalPages: 2 }
    const orders = Array.from({ length: 12 }, (_, index) => makeOrder({ id: 100 + index, status: 0 }))
    const loaded = base({ ordersGroup: { active: slot(orders, { pagination: more }), completed: slot([]) } })
    const { result, rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: loaded })
    expect(result.current.tabs).toEqual([{ key: 'new', text: 'New' }, { key: 'progress', text: 'In progress' }, { key: 'history', text: 'History' }])
    // The controller asks the slot again: no pagination, not fetched, loading; the list stays.
    rerender({ ...loaded, ordersGroup: { ...loaded.ordersGroup, active: slot(orders, { pagination: { currentPage: 0, pageSize: 50, total: null, totalPages: null }, fetched: false, loading: true }) } })
    expect(result.current.newOrders).toHaveLength(12)
    expect(result.current.tabs.every((tab) => !('count' in tab))).toBe(true)
  })

  it('loads again when the network comes back, when the socket reconnects and when queued changes were sent', () => {
    jest.useFakeTimers()
    const props = base({ isNetConnected: false })
    const { rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: props })
    expect(props.loadOrders).not.toHaveBeenCalled()
    rerender({ ...props, isNetConnected: true })
    act(() => { jest.advanceTimersByTime(NETWORK_RETURN_WAIT_MS + 10) })
    expect(props.loadOrders).toHaveBeenCalledTimes(1)

    act(() => { socket.disconnect?.forEach((handler) => handler()) })
    act(() => { socket.connect?.forEach((handler) => handler()) })
    act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })
    expect(props.loadOrders).toHaveBeenCalledTimes(2)

    act(() => { events.offline_actions_synced?.forEach((handler) => handler([1])) })
    expect(props.loadOrders).toHaveBeenCalledTimes(3)
    jest.useRealTimers()
  })

  describe('the network and the socket coming back together are one refresh', () => {
    const wait = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })
    const emit = (name: string) => act(() => { socket[name]?.forEach((handler) => handler()) })
    beforeEach(() => { jest.useFakeTimers() })
    afterEach(() => { jest.useRealTimers() })

    it('loads once when the network returns and the socket reconnects about a second apart', () => {
      const props = base({ isNetConnected: false })
      const { rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: props })
      emit('disconnect')
      rerender({ ...props, isNetConnected: true })
      wait(400)
      emit('connect')
      wait(RECONNECT_SETTLE_MS + 10)
      wait(NETWORK_RETURN_WAIT_MS + 10)
      expect(props.loadOrders).toHaveBeenCalledTimes(1)
    })

    it('loads once for the network alone, the socket never having dropped', () => {
      const props = base({ isNetConnected: false })
      const { rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: props })
      rerender({ ...props, isNetConnected: true })
      wait(NETWORK_RETURN_WAIT_MS + 10)
      wait(RECONNECT_SETTLE_MS + 10)
      expect(props.loadOrders).toHaveBeenCalledTimes(1)
    })

    it('loads once for the socket alone, the network never having been reported down', () => {
      const props = base({ isNetConnected: true })
      renderHook(() => useOrdersSplit(props), { wrapper })
      emit('disconnect')
      emit('connect')
      wait(RECONNECT_SETTLE_MS + 10)
      wait(NETWORK_RETURN_WAIT_MS + 10)
      expect(props.loadOrders).toHaveBeenCalledTimes(1)
    })
  })

  it('asks for no totals when the network or the socket comes back: the chip\'s page is read again, nothing of one order', async () => {
    jest.useFakeTimers()
    const api = fakeOrdersApi([makeOrder({ id: 3, status: 0 }), makeOrder({ id: 2, status: 7 })])
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    ;(useSession as jest.Mock).mockReturnValue([{ token: 'token', user: { id: 7 } }, {}])
    const props = base({ isNetConnected: false })
    const { rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper, initialProps: props })
    rerender({ ...props, isNetConnected: true })
    await act(async () => { jest.advanceTimersByTime(NETWORK_RETURN_WAIT_MS + 10) })
    act(() => { socket.disconnect?.forEach((handler) => handler()) })
    act(() => { socket.connect?.forEach((handler) => handler()) })
    await act(async () => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })
    await act(async () => { jest.advanceTimersByTime(10000) })
    expect(api.state.requests.length).toBeGreaterThan(0)
    expect(api.state.requests.filter((request) => request.pageSize === 1)).toEqual([])
    jest.useRealTimers()
  })

  it('does not load again on a socket reconnect while the device has no network', () => {
    jest.useFakeTimers()
    const props = base({ isNetConnected: false })
    renderHook(() => useOrdersSplit(props), { wrapper })
    act(() => { socket.disconnect?.forEach((handler) => handler()) })
    act(() => { socket.connect?.forEach((handler) => handler()) })
    act(() => { jest.advanceTimersByTime(RECONNECT_SETTLE_MS + 10) })
    expect(props.loadOrders).not.toHaveBeenCalled()
    jest.useRealTimers()
  })

  it('keeps the last open orders while the slot reloads empty, so the list does not blink', () => {
    const open = slot([makeOrder({ id: 2, status: 0 }), makeOrder({ id: 1, status: 7 })])
    const props = base({ ordersGroup: { active: open, completed: slot([]) } })
    const { result, rerender } = renderHook((p: any) => useOrdersSplit(p), { wrapper: sectionsWrapper, initialProps: props })
    expect(result.current.newOrders).toHaveLength(1)
    rerender({ ...props, ordersGroup: { active: slot([], { loading: true }), completed: slot([]) } })
    expect(result.current.newOrders).toHaveLength(1)
    expect(result.current.loading).toBe(false)
    rerender({ ...props, ordersGroup: { active: slot([]), completed: slot([]) } })
    expect(result.current.newOrders).toHaveLength(0)
  })

  describe('the list\'s own status changes', () => {
    /** The lists' sizes. */
    const sizes = (split: any) => ({ new: split.newOrders.length, preparing: split.preparing.length })
    /** A controller that keeps `ordersGroup` in state, as the real one does. */
    const useStatefulSplit = (handleChangeOrderStatus: any, initial: any) => {
      const [ordersGroup, setOrdersGroup] = React.useState(initial)
      return useOrdersSplit(base({ ordersGroup, setOrdersGroup, handleChangeOrderStatus }))
    }
    const open = () => ({
      active: slot([makeOrder({ id: 12, status: 0 }), makeOrder({ id: 11, status: 0 }), makeOrder({ id: 9, status: 7 })]),
      completed: slot([], { currentFilter: [1, 2, 5, 6, 10, 11, 12, 15, 16, 17] })
    })

    it('moves an accepted order out of New and into Preparing from the answer, with no socket event', async () => {
      const answer = jest.fn(async () => [{ id: 12, status: 7 }])
      const { result } = renderHook(() => useStatefulSplit(answer, open()), { wrapper })
      expect(sizes(result.current)).toEqual({ new: 2, preparing: 1 })
      await act(async () => { await result.current.changeOrderStatus(7, [12], { status: 7, prepared_in: 20 }) })
      expect(answer).toHaveBeenCalledWith(7, [12], { status: 7, prepared_in: 20 })
      expect(sizes(result.current)).toEqual({ new: 1, preparing: 2 })
      expect(result.current.preparing.flatMap((row) => row.orders.map((order) => order.id))).toEqual([12, 9])
    })

    it('tells the app with the one event (ORDER_CHANGED_EVENT) and hears it itself, so every list that shows a status follows', async () => {
      const heard = jest.fn()
      events[ORDER_CHANGED_EVENT] = [heard]
      const answer = jest.fn(async () => [{ id: 12, status: 7 }])
      const { result } = renderHook(() => useStatefulSplit(answer, open()), { wrapper })
      await act(async () => { await result.current.changeOrderStatus(7, [12], { status: 7 }) })
      expect(heard).toHaveBeenCalledWith({ id: 12, status: 7 })
      // The list's own handler is registered after the test's, and the card moved: one mechanism, heard by both.
      expect(sizes(result.current)).toEqual({ new: 1, preparing: 2 })
    })

    it('reads the answer of a request made `withDetails` too, and an order that failed changes nothing', async () => {
      const answer = jest.fn(async () => [{ id: 12, result: { id: 12, status: 7 }, error: false }, { id: 11, result: ['nope'], error: true }])
      const { result } = renderHook(() => useStatefulSplit(answer, open()), { wrapper })
      await act(async () => { await result.current.changeOrderStatus(7, [12, 11], {}, { withDetails: true }) })
      expect(sizes(result.current)).toEqual({ new: 1, preparing: 2 })
    })

    it('moves a picked-up order to History', async () => {
      const group = { active: slot([makeOrder({ id: 7, status: 4, delivery_type: 2 })]), completed: slot([], { currentFilter: [1, 2, 5, 6, 10, 11, 12, 15, 16, 17] }) }
      const answer = jest.fn(async () => [{ id: 7, status: 15 }])
      const { result } = renderHook(() => useStatefulSplit(answer, group), { wrapper })
      await act(async () => { await result.current.changeOrderStatus(15, [7]) })
      expect(result.current.ready).toHaveLength(0)
      act(() => result.current.setTab('history'))
      expect(result.current.history.flatMap((day) => day.orders.flatMap((row) => row.orders.map((order) => order.id)))).toEqual([7])
    })

    it('applies a change another screen announces (the details, the new-order alert)', () => {
      const { result } = renderHook(() => useStatefulSplit(jest.fn(), open()), { wrapper })
      act(() => { events.order_changed_by_app?.forEach((handler) => handler({ id: 11, status: 7 })) })
      expect(sizes(result.current)).toEqual({ new: 1, preparing: 2 })
    })

    it('is idempotent with the socket event that follows', async () => {
      const { result } = renderHook(() => useStatefulSplit(jest.fn(async () => [{ id: 12, status: 7 }]), open()), { wrapper })
      await act(async () => { await result.current.changeOrderStatus(7, [12]) })
      act(() => { events.order_changed_by_app?.forEach((handler) => handler({ id: 12, status: 7 })) })
      expect(sizes(result.current)).toEqual({ new: 1, preparing: 2 })
    })
  })

  describe('the open orders load a page at a time', () => {
    const page = (currentPage: number, totalPages = 5) => ({ currentPage, pageSize: 50, total: 250, totalPages })
    const newOnly = Array.from({ length: 50 }, (_, index) => makeOrder({ id: 900 - index, status: 0 }))
    const fetchedGroup = (orders: any[], currentPage = 1) => ({ active: slot(orders, { pagination: page(currentPage) }), completed: slot([]) })

    it('does not load more by itself while the view is full: one page, the rest on scroll', () => {
      const props = base({ ordersGroup: fetchedGroup(newOnly) })
      const { result } = renderHook(() => useOrdersSplit(props), { wrapper: sectionsWrapper })
      expect(props.loadMoreOrders).not.toHaveBeenCalled()
      expect(result.current.canLoadMoreOpen).toBe(true)
      expect(result.current.tabs[0]).toEqual({ key: 'new', text: 'New' })
      act(() => result.current.loadMoreOpen())
      expect(props.loadMoreOrders).toHaveBeenCalledWith({})
    })

    it('loads on by itself only while the tab in view has less than a screen, up to six pages', () => {
      // With the stage chips off In progress is the open orders in sections (with them it reads its stage's own list).
      const props = base({ ordersGroup: fetchedGroup(newOnly) })
      const { result } = renderHook(() => useOrdersSplit(props), { wrapper: sectionsWrapper })
      act(() => result.current.setTab('progress'))
      expect(props.loadMoreOrders).toHaveBeenCalledTimes(1)
      const last = base({ ordersGroup: fetchedGroup(newOnly, 6) })
      const capped = renderHook(() => useOrdersSplit(last), { wrapper: sectionsWrapper })
      act(() => capped.result.current.setTab('progress'))
      expect(last.loadMoreOrders).not.toHaveBeenCalled()
    })

    it('draws no count on the Active tab either, whatever the server says it holds', () => {
      const orders = Array.from({ length: 5 }, (_, index) => makeOrder({ id: 100 + index, status: index % 2 ? 7 : 0 }))
      const paged = (total: number) => slot(orders, { pagination: { currentPage: 1, pageSize: 5, total, totalPages: Math.ceil(total / 5) } })
      const combined = renderHook(() => useOrdersSplit(base({ combinedLayout: true, ordersGroup: { active: paged(137), completed: slot([]) } })), { wrapper })
      expect(combined.result.current.tabs).toEqual([{ key: 'active', text: 'Active' }, { key: 'history', text: 'History' }])
    })

    it('the board waits for every stage to fill', () => {
      const props = base({ ordersGroup: fetchedGroup(newOnly) })
      renderHook(() => useOrdersSplit(props, { allStages: true }), { wrapper })
      expect(props.loadMoreOrders).toHaveBeenCalledTimes(1)
    })

    it('asks for nothing offline, while searching or with an error', () => {
      const offline = base({ isNetConnected: false, ordersGroup: fetchedGroup([]) })
      expect(renderHook(() => useOrdersSplit(offline), { wrapper }).result.current.canLoadMoreOpen).toBe(false)
      const failed = base({ ordersGroup: { active: slot([], { pagination: page(1), error: ['x'] }), completed: slot([]) } })
      expect(renderHook(() => useOrdersSplit(failed), { wrapper }).result.current.canLoadMoreOpen).toBe(false)
    })

    it('an unknown network (null) is online for loading', () => {
      const unknown = base({ isNetConnected: null, ordersGroup: fetchedGroup(newOnly) })
      expect(renderHook(() => useOrdersSplit(unknown), { wrapper: sectionsWrapper }).result.current.canLoadMoreOpen).toBe(true)
    })
  })
})
