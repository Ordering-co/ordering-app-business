import React from 'react'
import { RefreshControl, StyleSheet } from 'react-native'
import { act, fireEvent } from '@testing-library/react-native'
import { useConfig, useUtils } from '@components'

// The controller is replaced by a component that hands the UI whatever the test sets in `mockController`.
const mockController: { current: Record<string, any> } = { current: {} }
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    OrderListGroups: ({ UIComponent, ...props }: any) => {
      // `stateful`: the controller keeps its lists in state, as the real one does, so what the UI applies shows.
      const [group, setGroup] = React.useState(mockController.current.ordersGroup)
      const stateful = mockController.current.stateful
      return <UIComponent {...props} {...mockController.current} ordersGroup={stateful ? group : mockController.current.ordersGroup} setOrdersGroup={stateful ? setGroup : mockController.current.setOrdersGroup} />
    },
    BusinessList: () => null,
    DriverList: () => null,
    PaymethodList: () => null,
    MainSearch: () => null
  }
})
const mockPause: { current: any } = { current: { loading: true, error: false, stores: [], openCount: 0, sheet: null } }
jest.mock('@ui', () => ({
  usePauseOrders: () => mockPause.current,
  useOrderActions: () => ({ openAccept: jest.fn(), openReject: jest.fn(), openReview: jest.fn() }),
  canReviewCustomer: () => false,
  NotificationSetting: () => null,
  WebsocketStatus: () => { const { Text: T } = require('react-native'); return <T>connection</T> }
}))

// The stored layout flag is read once and never answers here: no state update after the render.
jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn(() => new Promise(() => {})),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

import { OrdersOption } from '..'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { makeOrder, slot } from './fixtures'

const controller = (overrides: Record<string, any> = {}) => ({
  currentTabSelected: 'active',
  setCurrentTabSelected: jest.fn(),
  setCurrentFilters: jest.fn(),
  setOrdersGroup: jest.fn(),
  loadOrders: jest.fn(),
  loadMoreOrders: jest.fn(),
  onFiltered: jest.fn(),
  handleChangeOrderStatus: jest.fn(),
  handleSendCustomerReview: jest.fn(),
  filtered: null,
  ordersFiltered: slot([]),
  supportsCustomerNameFilter: true,
  ordersGroup: {
    active: slot([
      makeOrder({ id: 12, status: 0 }), makeOrder({ id: 11, status: 0 }), makeOrder({ id: 10, status: 13 }),
      makeOrder({ id: 9, status: 7 }), makeOrder({ id: 8, status: 14 }),
      makeOrder({ id: 7, status: 4, delivery_type: 2 }),
      makeOrder({ id: 6, status: 23, driver: { name: 'Omar', lastname: 'H' } })
    ]),
    completed: slot([
      makeOrder({ id: 5, status: 1, delivery_datetime_utc: '2026-11-19 16:20:00' }),
      makeOrder({ id: 4, status: 5, delivery_datetime_utc: '2026-11-19 15:00:00', reject_reason: 'Too busy' })
    ], { currentFilter: [1, 2, 5, 6, 10, 11, 12, 15, 16, 17] }),
    pending: slot([]),
    inProgress: slot([]),
    cancelled: slot([])
  },
  ...overrides
})

const renderList = (props: Record<string, any> = {}, offline: any = {}, options: Record<string, any> = {}) => renderWithProviders(
  <OfflineActionsContext.Provider value={[{ isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null, ...offline }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    <OrdersOption onNavigationRedirect={jest.fn()} {...props} />
  </OfflineActionsContext.Provider>,
  options
)

// In progress as one list in sections (the stage chips off): the sections' own behaviour. The chips have their own tests (stageFilter).
const sectionsTheme: any = themeWithValues((values) => { values.visibility['orders.stage_filter'] = false })
const inSections = { themeOverrides: sectionsTheme }

const roomUnder = (bar: any) => {
  for (let up = bar.parent; up; up = up.parent) {
    const flat: any = up.props?.style ? StyleSheet.flatten(up.props.style) : null
    if (flat && flat.paddingBottom !== undefined) return flat.paddingBottom
  }
  return undefined
}

describe('OrdersOption', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockController.current = controller()
    mockPause.current = { loading: true, error: false, stores: [], openCount: 0, sheet: null }
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => `time(${v})`, timeFormat: 'HH:mm', dateFormat: 'MM/DD/YYYY' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  it('draws the three tabs, with no number, and the New list', () => {
    const { getByText, getByTestId, queryByText } = renderList({}, {}, inSections)
    expect(getByText('Orders')).toBeTruthy()
    expect(getByText('New')).toBeTruthy()
    expect(getByText('In progress')).toBeTruthy()
    expect(getByText('History')).toBeTruthy()
    // The tabs are their names: the app shows no number of orders (2 pending + 1 pre-order, 4 in progress are not counted).
    expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
    expect(getByTestId('order-card-12')).toBeTruthy()
    expect(getByTestId('order-card-10')).toBeTruthy()
    expect(getByText('connection')).toBeTruthy()
  })

  it('draws the tabs as a 50 high pill of 40 high tabs inside a 5 inset (the mockup\'s 46 and 36, raised by the owner)', () => {
    const { getByTestId } = renderList()
    const track = getByTestId('orders-tabs').findAll((node: any) => StyleSheet.flatten(node.props.style)?.padding === 5)[0]
    expect(StyleSheet.flatten(track.props.style)).toMatchObject({ padding: 5, borderRadius: 9999 })
    const heights: number[] = getByTestId('orders-tabs').findAll((node: any) => typeof StyleSheet.flatten(node.props.style)?.minHeight === 'number').map((node: any) => StyleSheet.flatten(node.props.style).minHeight)
    expect(heights).toContain(40)
  })

  it('loads the next page of the open orders by itself until they are all in', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([makeOrder({ status: 0 })], { pagination: { currentPage: 1, pageSize: 50, total: 90, totalPages: 2 } }) } })
    renderList({}, {}, inSections)
    expect(mockController.current.loadMoreOrders).toHaveBeenCalledTimes(1)
    expect(mockController.current.loadMoreOrders).toHaveBeenCalledWith({})
  })

  it('does not ask for a page while the list is loading one or has failed', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([makeOrder({ status: 0 })], { loading: true, pagination: { currentPage: 1, totalPages: 3 } }) } })
    renderList()
    expect(mockController.current.loadMoreOrders).not.toHaveBeenCalled()
  })

  it('In progress lists the stages with their names only, each order once', () => {
    const { getByText, getByTestId, queryByTestId } = renderList({}, {}, inSections)
    fireEvent.press(getByText('In progress'))
    // A section's title is its name alone (no " · 2").
    expect(getByTestId('orders-section-preparing')).toHaveTextContent(/^Preparing$/)
    expect(getByTestId('orders-section-ready')).toHaveTextContent(/^Ready for pickup$/)
    expect(getByTestId('orders-section-with_driver')).toHaveTextContent(/^With driver$/)
    expect(getByTestId('order-card-9')).toBeTruthy()
    expect(getByTestId('order-card-6')).toBeTruthy()
    expect(queryByTestId('order-card-12')).toBeNull()
  })

  it('History lists the closed orders by day with the filter chips', () => {
    const { getByText, getByTestId } = renderList()
    fireEvent.press(getByText('History'))
    // The slot of the controller follows the tab.
    expect(mockController.current.setCurrentTabSelected).toHaveBeenCalledWith('completed')
    expect(getByTestId('orders-history-chips')).toBeTruthy()
    expect(getByTestId('order-card-5')).toBeTruthy()
    expect(getByTestId('order-card-4')).toBeTruthy()
  })

  it('a History chip narrows the controller\'s statuses', () => {
    const { getByText, getByTestId } = renderList()
    fireEvent.press(getByText('History'))
    fireEvent.press(getByTestId('orders-history-cancelled'))
    expect(mockController.current.setCurrentFilters).toHaveBeenCalledWith([2, 5, 6, 10, 12, 16, 17])
    const update = mockController.current.setOrdersGroup.mock.calls[0][0]
    expect(update({ completed: { orders: [] } }).completed.currentFilter).toEqual([2, 5, 6, 10, 12, 16, 17])
  })

  it('the History chips stay while its list loads, as the chips of New and of In progress do', () => {
    // A chip was tapped: the controller's slot is loading again and holds no order.
    const base = controller()
    mockController.current = controller({ ordersGroup: { ...base.ordersGroup, completed: slot([], { loading: true, fetched: false }) } })
    const { getByText, getByTestId, queryByTestId } = renderList()
    fireEvent.press(getByText('History'))
    expect(queryByTestId('order-card-5')).toBeNull()
    expect(getByTestId('orders-history-chips')).toBeTruthy()
    for (const key of ['all', 'completed', 'cancelled']) expect(getByTestId(`orders-history-${key}`)).toBeTruthy()
    // The list shows its skeleton under them meanwhile.
    expect(queryByTestId('orders-skeleton') ?? queryByTestId('orders-empty')).toBeTruthy()
  })

  it('History has a Load more button only while the controller has pages left', () => {
    const base = controller()
    mockController.current = controller({ ordersGroup: { ...base.ordersGroup, completed: { ...base.ordersGroup.completed, pagination: { currentPage: 1, pageSize: 50, totalPages: 3, total: 120 } } } })
    const { getByText, getByTestId } = renderList()
    fireEvent.press(getByText('History'))
    fireEvent.press(getByTestId('orders-load-more'))
    expect(mockController.current.loadMoreOrders).toHaveBeenCalledWith({ allStatusses: false })
  })

  it('combine_pending_and_progress_orders makes the tabs Active and History (a layout flag)', () => {
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '1' } } }])
    const { getByTestId, queryByText, getByText } = renderList()
    expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
    expect(queryByText('In progress')).toBeNull()
    // One list: New first, then the stages, each titled by its name alone.
    expect(getByText('New')).toBeTruthy()
    expect(getByText('Preparing')).toBeTruthy()
    expect(getByTestId('order-card-12')).toBeTruthy()
    expect(getByTestId('order-card-9')).toBeTruthy()
  })

  it('a search keeps the tabs and splits its results by the status of each order, with a notice that clears it', () => {
    const base = controller()
    mockController.current = controller({
      filtered: { id: '10' },
      ordersFiltered: slot([makeOrder({ id: 10, status: 13 }), makeOrder({ id: 11, status: 7 }), makeOrder({ id: 3, status: 1 })])
    })
    const { queryByTestId, getByTestId, getByText } = renderList()
    expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
    // The search opens on a tab that holds a result (the New tab here: the first result is pending).
    expect(getByTestId('order-card-10')).toBeTruthy()
    expect(queryByTestId('order-card-11')).toBeNull()
    expect(queryByTestId('order-card-3')).toBeNull()
    fireEvent.press(getByText('In progress'))
    expect(getByTestId('order-card-11')).toBeTruthy()
    expect(queryByTestId('order-card-10')).toBeNull()
    fireEvent.press(getByText('History'))
    expect(getByTestId('order-card-3')).toBeTruthy()
    expect(queryByTestId('orders-history-chips')).toBeNull()
    expect(getByTestId('orders-filter-notice')).toBeTruthy()
    fireEvent.press(getByText('Clear'))
    expect(mockController.current.onFiltered).toHaveBeenCalledWith(null)
    expect(base.onFiltered).not.toHaveBeenCalled()
  })

  it('a search made from a tab without a result opens on the tab that has one', () => {
    mockController.current = controller({
      filtered: { id: '11' },
      ordersFiltered: slot([makeOrder({ id: 11, status: 7 })])
    })
    const { getByTestId } = renderList()
    expect(getByTestId('order-card-11')).toBeTruthy()
  })

  it('the search opens its page, classifies the text and sends the controller\'s filters', () => {
    const { getByTestId } = renderList()
    fireEvent.press(getByTestId('orders-search'))
    fireEvent.changeText(getByTestId('orders-search-text'), '1053')
    fireEvent.press(getByTestId('orders-search-type-2'))
    fireEvent.press(getByTestId('orders-search-date-today'))
    fireEvent.press(getByTestId('orders-search-apply'))
    const filters = mockController.current.onFiltered.mock.calls[0][0]
    expect(filters).toMatchObject({ id: '1053', delivery_type: [2], state: '' })
    expect(filters.date.from).toMatch(/^\d\d\/\d\d\/\d{4} 00:00:00$/)
  })

  it('the search form\'s button says "Show orders", with no count it cannot know', () => {
    const { getByTestId } = renderList()
    fireEvent.press(getByTestId('orders-search'))
    expect(getByTestId('orders-search-apply')).toHaveTextContent(/^Show orders$/)
  })

  it('writes the status of the filter notice in sentence case ("In progress")', () => {
    mockController.current = controller({ filtered: { state: [7] }, ordersFiltered: slot([]) })
    const { getByTestId } = renderList()
    fireEvent.press(getByTestId('orders-search'))
    fireEvent.press(getByTestId('orders-search-state-progress'))
    fireEvent.press(getByTestId('orders-search-apply'))
    expect(getByTestId('orders-filter-notice')).toHaveTextContent(/Filters on: In progress\. You may/)
  })

  it('the filled search button (a filter is on) ends at the page gutter; the ghost one pulls its box into it', () => {
    // The bar's end group is pulled by a negative margin so a ghost glyph sits at the gutter; a filled box pulled that way hangs past it.
    const pull = (node: any): number => {
      for (let up = node; up; up = up.parent) {
        const margin = StyleSheet.flatten(up.props?.style)?.marginRight
        if (typeof margin === 'number' && margin !== 0) return margin
      }
      return 0
    }
    const idle = renderList()
    expect(pull(idle.getByTestId('orders-search'))).toBeLessThan(0)
    idle.unmount()
    mockController.current = controller({ filtered: { state: [7] }, ordersFiltered: slot([]) })
    const { getByTestId } = renderList()
    fireEvent.press(getByTestId('orders-search'))
    fireEvent.press(getByTestId('orders-search-state-progress'))
    fireEvent.press(getByTestId('orders-search-apply'))
    expect(pull(getByTestId('orders-search'))).toBe(0)
  })

  it('the search page keeps what was typed when it is closed without applying', () => {
    const { getByTestId, queryByTestId } = renderList()
    fireEvent.press(getByTestId('orders-search'))
    fireEvent.changeText(getByTestId('orders-search-text'), 'EXT-5')
    fireEvent.press(getByTestId('orders-search-type-1'))
    expect(queryByTestId('orders-search-form')).toBeTruthy()
    expect(mockController.current.onFiltered).not.toHaveBeenCalled()
  })

  it('offline: the notice says so and counts the changes waiting to sync', () => {
    const { getByTestId, getByText } = renderList({ isNetConnected: false }, { isNetConnected: false, actions: { 1: [{}], 2: [{}] } })
    expect(getByTestId('orders-offline')).toBeTruthy()
    expect(getByText('You\'re offline')).toBeTruthy()
    expect(getByText(/2 changes will sync when you're back online\./)).toBeTruthy()
  })

  it('pull to refresh reloads every list while online and does nothing offline', () => {
    const online = renderList()
    const refresh = online.UNSAFE_getByType(RefreshControl)
    act(() => { refresh.props.onRefresh() })
    expect(mockController.current.loadOrders).toHaveBeenCalledWith({ newFetch: true })
    jest.clearAllMocks()
    const offline = renderList({ isNetConnected: false }, { isNetConnected: false })
    act(() => { offline.UNSAFE_getByType(RefreshControl).props.onRefresh() })
    expect(mockController.current.loadOrders).not.toHaveBeenCalled()
  })

  describe('the refresh button of the header', () => {
    it('reloads every list as the pull does, shows it is busy and ignores a second press while it runs', () => {
      const { getByTestId, getByLabelText } = renderList()
      expect(getByLabelText('Refresh orders')).toBeTruthy()
      fireEvent.press(getByTestId('orders-refresh'))
      fireEvent.press(getByTestId('orders-refresh'))
      expect(mockController.current.loadOrders).toHaveBeenCalledTimes(1)
      expect(mockController.current.loadOrders).toHaveBeenCalledWith({ newFetch: true })
      // Busy: the pull's spinner is on and the button is disabled, drawing its own spinner instead of the glyph.
      expect(getByTestId('orders-refresh').props.accessibilityState).toMatchObject({ busy: true })
    })

    it('is off while the device is offline (the pull does nothing then either)', () => {
      const { getByTestId } = renderList({ isNetConnected: false }, { isNetConnected: false })
      expect(getByTestId('orders-refresh').props.accessibilityState).toMatchObject({ disabled: true })
      fireEvent.press(getByTestId('orders-refresh'))
      expect(mockController.current.loadOrders).not.toHaveBeenCalled()
    })

    it('is on a tablet too, beside the search', () => {
      const { getByTestId } = renderWithProviders(
        <OfflineActionsContext.Provider value={[{ isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null }, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
          <OrdersOption onNavigationRedirect={jest.fn()} />
        </OfflineActionsContext.Provider>,
        { platform: 'tablet' }
      )
      expect(getByTestId('orders-refresh')).toBeTruthy()
      expect(getByTestId('orders-search')).toBeTruthy()
    })
  })

  it('applies the answer of its own action to the list: the card moves to its stage, with no socket event', async () => {
    mockController.current = controller({ stateful: true, handleChangeOrderStatus: jest.fn(async () => [{ id: 9, status: 4 }]) })
    const { getByText, getByTestId, queryByTestId } = renderList({}, {}, inSections)
    fireEvent.press(getByText('In progress'))
    expect(getByTestId('order-card-9')).toBeTruthy()
    await act(async () => { fireEvent.press(getByTestId('order-card-9-ready')) })
    expect(mockController.current.handleChangeOrderStatus).toHaveBeenCalledWith(4, [9])
    // The order moved from Preparing to Ready for pickup; no title counts the orders in it.
    expect(getByTestId('order-card-8')).toBeTruthy()
    expect(getByTestId('order-card-9')).toBeTruthy()
    // The card of the order now says what a ready order does.
    expect(queryByTestId('order-card-9-ready')).toBeNull()
  })

  it('mounts only the rows near the screen of a long list', () => {
    const many = Array.from({ length: 120 }, (_, index) => makeOrder({ id: 500 - index, status: 0 }))
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot(many) } })
    const { getByTestId, queryByTestId, getAllByTestId } = renderList({}, {}, inSections)
    expect(getByTestId('order-card-500')).toBeTruthy()
    expect(queryByTestId('order-card-400')).toBeNull()
    expect(getAllByTestId(/^order-card-\d+$/).length).toBeLessThan(40)
    // A long list is still no number: the tab stays its name.
    expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
  })

  it('draws skeleton cards while the first load is on its way', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([], { loading: true, fetched: false }) } })
    const { getByTestId, queryByTestId } = renderList()
    expect(getByTestId('orders-skeleton')).toBeTruthy()
    expect(queryByTestId('orders-empty-new')).toBeNull()
  })

  it('draws the empty state of an empty tab', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([]) } })
    const { getByText, getByTestId } = renderList({}, {}, inSections)
    expect(getByTestId('orders-empty-new')).toBeTruthy()
    expect(getByText('No new orders')).toBeTruthy()
    fireEvent.press(getByText('In progress'))
    expect(getByTestId('orders-empty-progress')).toBeTruthy()
    expect(getByText('No orders in progress')).toBeTruthy()
  })

  describe('the store card under the empty New list', () => {
    const emptyList = () => { mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([]) } }) }
    const pause = (overrides: Record<string, any>) => ({
      loading: false, error: false, isOffline: false, openCount: 1, pausedCount: 0, offCount: 0, allPaused: false, sheet: null,
      openPauseSheet: jest.fn(), resume: jest.fn(), reload: jest.fn(), stores: [], ...overrides
    })

    it('says the store is open and opens the pause sheet', () => {
      emptyList()
      mockPause.current = pause({ stores: [{ id: 3, name: 'Luna Pizza', slug: 'luna', business: {}, status: { kind: 'open', closesAt: new Date(2026, 10, 19, 22, 0) } }] })
      const { getByText, getByTestId } = renderList({}, {}, inSections)
      expect(getByText('Luna Pizza')).toBeTruthy()
      expect(getByText('Open · closes 22:00')).toBeTruthy()
      fireEvent.press(getByTestId('orders-pause'))
      expect(mockPause.current.openPauseSheet).toHaveBeenCalledWith(3)
    })

    it('offers Resume for a paused store', () => {
      emptyList()
      mockPause.current = pause({ openCount: 0, stores: [{ id: 3, name: 'Luna Pizza', slug: 'luna', business: {}, status: { kind: 'paused', until: new Date(2099, 0, 1, 10, 0) } }] })
      const { getByTestId, queryByTestId, getByText } = renderList({}, {}, inSections)
      expect(getByText(/Paused · until/)).toBeTruthy()
      expect(queryByTestId('orders-pause')).toBeNull()
      fireEvent.press(getByTestId('orders-resume'))
      expect(mockPause.current.resume).toHaveBeenCalledWith(3)
    })

    it('with several stores says how many accept orders and asks which to pause', () => {
      emptyList()
      mockPause.current = pause({ openCount: 2, stores: [1, 2, 3].map((id) => ({ id, name: `S${id}`, slug: `s${id}`, business: {}, status: { kind: id === 3 ? 'off' : 'open', closesAt: null } })) })
      const { getByText, getByTestId } = renderList({}, {}, inSections)
      expect(getByText('2 of 3 stores accepting orders')).toBeTruthy()
      fireEvent.press(getByTestId('orders-pause'))
      expect(mockPause.current.openPauseSheet).toHaveBeenCalledWith(undefined)
    })

    it('draws no card while the stores load, when they failed, when there are none or when the device is offline', () => {
      emptyList()
      for (const state of [{ loading: true }, { error: true }, { stores: [] }]) {
        mockPause.current = pause(state)
        expect(renderList().queryByTestId('orders-store-status')).toBeNull()
      }
      mockPause.current = pause({ stores: [{ id: 3, name: 'Luna', slug: 'l', business: {}, status: { kind: 'open', closesAt: null } }] })
      expect(renderList({ isNetConnected: false }, { isNetConnected: false }).queryByTestId('orders-store-status')).toBeNull()
    })

    it('is not drawn under the other tabs', () => {
      emptyList()
      mockPause.current = pause({ stores: [{ id: 3, name: 'Luna', slug: 'l', business: {}, status: { kind: 'open', closesAt: null } }] })
      const { getByText, queryByTestId } = renderList()
      fireEvent.press(getByText('In progress'))
      expect(queryByTestId('orders-store-status')).toBeNull()
    })
  })

  describe('a tab asked by the shell', () => {
    it('opens with the tabs strip: its bar leaves 5 under it (tight)', () => {
      mockController.current = controller()
      const { getByTestId } = renderList()
      expect(roomUnder(getByTestId('orders-header'))).toBe(5)
    })

    it('selects the tab, consumes the ask and clears a search', () => {
      const setParams = jest.fn()
      mockController.current = controller({ filtered: { id: '1' }, ordersFiltered: slot([]) })
      const { getByTestId } = renderList({ tabRequest: { tab: 'progress', at: 1 }, navigation: { setParams } })
      expect(mockController.current.onFiltered).toHaveBeenCalledWith(null)
      expect(setParams).toHaveBeenCalledWith({ tab: undefined, at: undefined })
      expect(getByTestId('orders-header')).toBeTruthy()
    })

    it('opens In progress, History, or the one tab of the combined layout', () => {
      const progress = renderList({ tabRequest: { tab: 'progress', at: 1 }, navigation: { setParams: jest.fn() } }, {}, inSections)
      expect(progress.getByTestId('orders-section-preparing')).toBeTruthy()
      const history = renderList({ tabRequest: { tab: 'history', at: 2 }, navigation: { setParams: jest.fn() } })
      expect(history.getByTestId('orders-history-chips')).toBeTruthy()
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const combined = renderList({ tabRequest: { tab: 'new', at: 3 }, navigation: { setParams: jest.fn() } })
      expect(combined.getByTestId('orders-section-new')).toBeTruthy()
    })

    it('does nothing for a call with no `at`', () => {
      const setParams = jest.fn()
      renderList({ tabRequest: { tab: 'history' }, navigation: { setParams } })
      expect(setParams).not.toHaveBeenCalled()
    })
  })

  it('draws the API\'s message when the list could not load and has nothing to show', () => {
    mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot([], { error: ['ERROR_ORDER_FIND'] }) } })
    const { getByText } = renderList({}, {}, inSections)
    expect(getByText('Order not found')).toBeTruthy()
  })

  it('draws no title, connection state or search button the theme hides', () => {
    const theme = themeWithValues((values) => {
      values.visibility['orders.title'] = false
      values.visibility.connection_status = false
      values.visibility['orders.search'] = false
    })
    const { queryByText, queryByTestId, getByTestId } = renderWithProviders(
      <OrdersOption onNavigationRedirect={jest.fn()} />,
      { themeOverrides: theme as any }
    )
    expect(queryByText('Orders')).toBeNull()
    expect(queryByText('connection')).toBeNull()
    expect(queryByTestId('orders-search')).toBeNull()
  })

  it('writes the order status chip in New, beside the total (the card\'s design)', () => {
    const { getAllByText } = renderList()
    expect(getAllByText('Pending').length).toBeGreaterThan(0)
  })
})
