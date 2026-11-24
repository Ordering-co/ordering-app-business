import React from 'react'
import { FlatList, RefreshControl } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'
import { useApi, useConfig, useEvent, useSession, useUtils } from '@components'

// The orders controller and the stores' controller are replaced by components that hand the UI what the test sets.
const mockController: { current: Record<string, any> } = { current: {} }
const mockStores: { current: Record<string, any> } = { current: {} }
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    // The controller keeps its `filtered` as the real one does: what the screen asks (`onFiltered`) is what it is given back.
    OrderListGroups: ({ UIComponent, ...props }: any) => {
      const [filtered, setFiltered] = React.useState(mockController.current.filtered ?? null)
      const onFiltered = React.useCallback((next: any) => { mockController.current.onFiltered(next); setFiltered(next) }, [])
      return <UIComponent {...props} {...mockController.current} filtered={filtered} onFiltered={onFiltered} />
    },
    BusinessList: ({ UIComponent, ...props }: any) => <UIComponent {...props} {...mockStores.current} />,
    DriverList: () => null,
    PaymethodList: () => null,
    MainSearch: () => null
  }
})
jest.mock('@ui', () => ({
  usePauseOrders: () => ({ loading: true, error: false, stores: [], openCount: 0, sheet: null }),
  useOrderActions: () => ({ openAccept: jest.fn(), openReject: jest.fn(), openReview: jest.fn() }),
  canReviewCustomer: () => false,
  NotificationSetting: () => null,
  WebsocketStatus: () => null
}))
jest.mock('../../WebsocketStatus', () => ({ WebsocketStatus: () => null }))
jest.mock('../../OrderDetails/OrderDetailsPage', () => ({ OrderDetailsPage: () => null }))
jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn(() => new Promise(() => {})),
  _setStoreData: jest.fn(),
  _removeStoreData: jest.fn()
}))

import { OrdersOption } from '..'
import { OrdersBoard } from '../../OrdersBoard'
import { OfflineActionsContext } from '../../../context/OfflineActions'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { resetStoresSeen } from '../../PreviousOrders/storesSeen'
import { resetOrdersView, searchPart, withStore } from '../ordersView'
import { makeOrder, slot } from './fixtures'
import { fakeOrdersApi } from './fakeOrdersApi'

const order = (id: number, status: number, business = 41, extra: Record<string, any> = {}) => makeOrder({ id, status, business_id: business, business: { id: business, name: business === 41 ? 'McBonalds' : 'Wine..' }, ...extra })

// Open orders in two stores: 2 new, 3 preparing, 2 ready, 1 with a driver.
const everything = [
  order(20, 0), order(19, 0, 49),
  order(18, 7), order(17, 7, 49), order(16, 14),
  order(15, 4), order(14, 20, 49),
  order(13, 23)
]

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
  ordersGroup: { active: slot(everything.slice(), { pagination: { currentPage: 1, pageSize: 50, total: 8, totalPages: 1 } }), completed: slot([]), pending: slot([]), inProgress: slot([]), cancelled: slot([]) },
  ...overrides
})

const stores = (count: number, extra: Record<string, any> = {}) => ({
  businessesList: {
    businesses: Array.from({ length: Math.min(count, 20) }, (_, index) => ({ id: 41 + index, name: `Store ${41 + index}`, logo: undefined })),
    loading: false, error: false, fetched: true
  },
  paginationProps: { currentPage: 1, totalPages: Math.ceil(count / 20), totalItems: count },
  getBusinesses: jest.fn(),
  handleChangeSearch: jest.fn(),
  searchValue: '',
  ...extra
})

const offline = { isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null }
const renderOrders = (ui: React.ReactElement, options: Record<string, any> = {}) => renderWithProviders(
  <OfflineActionsContext.Provider value={[offline, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    {ui}
  </OfflineActionsContext.Provider>,
  options
)
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

describe('the store view and the search', () => {
  it('a set of filters that holds only the store is not a search, and a search carries the store', () => {
    expect(searchPart({ business: '42' })).toBeNull()
    expect(searchPart({ business: '42', state: [0] })).toEqual({ business: '42', state: [0] })
    expect(searchPart(null)).toBeNull()
    expect(withStore(null, '42')).toEqual({ business: '42' })
    expect(withStore(null, '')).toBeNull()
    expect(withStore({ state: [0] }, '42')).toEqual({ state: [0], business: '42' })
    expect(withStore({ state: [0], business: '42' }, '')).toEqual({ state: [0], business: '' })
  })
})

// The theme draws the store chip of the headers only when a brand turns `orders.store_filter` on (it is off by default).
const withChip = (platform?: 'tablet') => themeWithValues((values) => { values.visibility['orders.store_filter'] = true }, platform ? { platform } : {})

describe('In progress by stage and the store filter', () => {
  let api: ReturnType<typeof fakeOrdersApi>

  beforeEach(() => {
    jest.clearAllMocks()
    resetStoresSeen()
    resetOrdersView()
    api = fakeOrdersApi(everything)
    mockController.current = controller()
    mockStores.current = stores(2)
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    ;(useSession as jest.Mock).mockReturnValue([{ token: 'token', user: { id: 7 } }, {}])
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => `time(${v})`, timeFormat: 'HH:mm', dateFormat: 'MM/DD/YYYY' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  describe('no number of orders (decision of 2026-11-23)', () => {
    // 150 new, 412 preparing, 31 ready, 157 with a driver: far more than the pages hold.
    const many = [
      ...Array.from({ length: 150 }, (_, index) => order(1000 + index, 0)),
      ...Array.from({ length: 412 }, (_, index) => order(2000 + index, 7)),
      ...Array.from({ length: 31 }, (_, index) => order(3000 + index, 4)),
      ...Array.from({ length: 157 }, (_, index) => order(4000 + index, 23))
    ]
    /** The one-order requests the totals used to make (a page of 1 per stage). */
    const totalsRequests = () => api.state.requests.filter((request) => request.pageSize === 1)

    it('the tabs and the chips of New and In progress are their names: no digit in them', async () => {
      api = fakeOrdersApi(many)
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const { getByTestId, getByText } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
      expect(getByTestId('orders-new-stages')).not.toHaveTextContent(/\d/)
      expect(getByTestId('orders-new-stages')).toHaveTextContent(/Pending.*Preorder/)
      fireEvent.press(getByText('In progress'))
      await flush()
      for (const chip of ['all', 'preparing', 'ready', 'with_driver']) {
        expect(getByTestId(`orders-stage-${chip}`).props.accessibilityLabel).toMatch(/^[^\d]+$/)
      }
      expect(getByTestId('orders-stages')).not.toHaveTextContent(/\d/)
      expect(getByTestId('orders-stages')).toHaveTextContent(/Preparing.*Ready for pickup.*With driver/)
    })

    it('asks for no totals: no request of one order, on mount, on a change, on a refresh or a stage change', async () => {
      api = fakeOrdersApi(many)
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const { getByTestId, getByText, UNSAFE_getByType } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      // Mount: the Pending chip's own first page and nothing else (the controller's lists are the controller's).
      expect(api.state.requests.map((request) => request.pageSize)).toEqual([50])
      fireEvent.press(getByText('In progress'))
      await flush()
      fireEvent.press(getByTestId('orders-stage-ready'))
      await flush()
      // An order changes (the app's own event, the socket's) and time passes: no round of totals follows.
      const [events] = (useEvent as jest.Mock)()
      jest.useFakeTimers()
      act(() => { events.emit('order_updated', { id: 2000, status: 4, business_id: 41 }) })
      act(() => { events.emit('order_added', { id: 5000, status: 0, business_id: 41 }) })
      act(() => { jest.advanceTimersByTime(10000) })
      jest.useRealTimers()
      await flush()
      // A refresh (the button, the pull): the list in view is read again, still no total.
      fireEvent.press(getByTestId('orders-refresh'))
      await flush()
      act(() => { UNSAFE_getByType(RefreshControl).props.onRefresh() })
      await flush()
      expect(totalsRequests()).toEqual([])
    })

    it('draws no number while offline either, and makes no request', async () => {
      const { getByTestId, getByText } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} isNetConnected={false} />)
      await flush()
      expect(getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
      fireEvent.press(getByText('In progress'))
      await flush()
      expect(getByTestId('orders-stages')).not.toHaveTextContent(/\d/)
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  describe('the stage chips', () => {
    it('are under the tabs of In progress only, with Preparing open', async () => {
      const { getByText, getByTestId, queryByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(queryByTestId('orders-stages')).toBeNull()
      fireEvent.press(getByText('In progress'))
      await flush()
      expect(getByTestId('orders-stages')).toBeTruthy()
      expect(getByTestId('orders-stage-preparing').props.accessibilityState.selected).toBe(true)
      expect(getByTestId('orders-stage-ready').props.accessibilityState.selected).toBe(false)
    })

    it('list the stage\'s own orders and nothing of the others', async () => {
      const { getByText, getByTestId, queryByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      fireEvent.press(getByText('In progress'))
      await flush()
      expect(api.state.requests.some((request) => request.statuses.includes(7) && request.pageSize === 50)).toBe(true)
      expect(getByTestId('order-card-18')).toBeTruthy()
      expect(getByTestId('order-card-16')).toBeTruthy()
      expect(queryByTestId('order-card-15')).toBeNull()
      fireEvent.press(getByTestId('orders-stage-ready'))
      await flush()
      expect(getByTestId('orders-stage-ready').props.accessibilityState.selected).toBe(true)
      expect(getByTestId('order-card-15')).toBeTruthy()
      expect(getByTestId('order-card-14')).toBeTruthy()
      expect(queryByTestId('order-card-18')).toBeNull()
    })

    it('keep the chosen stage when the tab is left and returned to', async () => {
      const { getByText, getByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      fireEvent.press(getByText('In progress'))
      await flush()
      fireEvent.press(getByTestId('orders-stage-with_driver'))
      await flush()
      fireEvent.press(getByText('New'))
      fireEvent.press(getByText('In progress'))
      await flush()
      expect(getByTestId('orders-stage-with_driver').props.accessibilityState.selected).toBe(true)
      expect(getByTestId('order-card-13')).toBeTruthy()
    })

    it('say so when a stage is empty', async () => {
      api = fakeOrdersApi(everything.filter((item) => item.status !== 4 && item.status !== 20))
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const { getByText, getByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      fireEvent.press(getByText('In progress'))
      await flush()
      fireEvent.press(getByTestId('orders-stage-ready'))
      await flush()
      expect(getByText('No orders ready for pickup')).toBeTruthy()
    })

    it('move an order out of Preparing when it is marked ready, and head Ready with it', async () => {
      const { getByText, getByTestId, getAllByTestId, queryByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      fireEvent.press(getByText('In progress'))
      await flush()
      api.state.orders = api.state.orders.map((item) => (item.id === 18 ? { ...item, status: 4 } : item))
      mockController.current.handleChangeOrderStatus.mockResolvedValue([{ id: 18, status: 4 }])
      fireEvent.press(within(getByTestId('order-card-18')).getByText('Mark ready'))
      await flush()
      expect(queryByTestId('order-card-18')).toBeNull()
      fireEvent.press(getByTestId('orders-stage-ready'))
      await flush()
      // Newest by number is 15; the order the app just moved is above it.
      expect(getAllByTestId(/^order-card-\d+$/).map((node) => node.props.testID)).toEqual(['order-card-18', 'order-card-15', 'order-card-14'])
    })

    it('are not drawn when the theme turns them off: In progress is the one list in sections', async () => {
      const theme = themeWithValues((values) => { values.visibility['orders.stage_filter'] = false })
      const { getByText, getByTestId, queryByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />, { themeOverrides: theme as any })
      await flush()
      fireEvent.press(getByText('In progress'))
      expect(queryByTestId('orders-stages')).toBeNull()
      // The section titles are the stages' names alone.
      expect(getByTestId('orders-section-preparing')).toHaveTextContent(/^Preparing$/)
      expect(getByTestId('orders-section-ready')).toHaveTextContent(/^Ready for pickup$/)
      expect(getByTestId('orders-section-with_driver')).toHaveTextContent(/^With driver$/)
    })

    it('show the copy the open orders hold while offline', async () => {
      const { getByText, getByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} isNetConnected={false} />)
      fireEvent.press(getByText('In progress'))
      await flush()
      expect(api.get).not.toHaveBeenCalled()
      expect(getByTestId('order-card-18')).toBeTruthy()
    })
  })

  describe('the store chip (orders.store_filter on)', () => {
    const renderChip = (ui: React.ReactElement) => renderOrders(ui, { themeOverrides: withChip() as any })

    it('is drawn with more than one store, and names the cards\' store from the first card', async () => {
      const { getByTestId, getAllByTestId } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/All stores/)
      expect(getAllByTestId('order-card-store-name').length).toBeGreaterThan(0)
    })

    it('draws no store line, and no filter, for an account of one store whose orders say two', async () => {
      mockStores.current = stores(1)
      const { queryByTestId, queryAllByTestId } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(queryByTestId('orders-store-filter')).toBeNull()
      expect(queryAllByTestId('order-card-store-name')).toHaveLength(0)
    })

    it('has a search field and pages through every store past ten', async () => {
      mockStores.current = stores(45)
      const { getByTestId, getByPlaceholderText, UNSAFE_getAllByType } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(getByTestId('orders-store-filter'))
      expect(getByPlaceholderText('Search stores')).toBeTruthy()
      // The end of the sheet's list asks the source for its next page (twenty stores).
      const sheetList = UNSAFE_getAllByType(FlatList).find((node: any) => node.props.data?.[0]?.label === 'All stores')
      fireEvent(sheetList as any, 'endReached')
      expect(mockStores.current.getBusinesses).toHaveBeenCalledTimes(1)
      // The typing is searched by the server once it stops, not only among the stores loaded.
      jest.useFakeTimers()
      fireEvent.changeText(getByPlaceholderText('Search stores'), 'Wine')
      expect(mockStores.current.handleChangeSearch).not.toHaveBeenCalled()
      act(() => { jest.advanceTimersByTime(500) })
      expect(mockStores.current.handleChangeSearch).toHaveBeenCalledWith('Wine')
      jest.useRealTimers()
    })

    it('has no search field with ten stores or fewer', async () => {
      mockStores.current = stores(8)
      const { getByTestId, queryByPlaceholderText } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(getByTestId('orders-store-filter'))
      expect(queryByPlaceholderText('Search stores')).toBeNull()
    })

    it('narrows the lists and the controller to the store chosen at once, and drops the cards\' store line', async () => {
      const { getByTestId, getByText, queryAllByTestId, queryByTestId } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(getByTestId('orders-store-filter'))
      fireEvent.press(getByText('Store 42'))
      await flush()
      // The controller asks with the store (its `business` filter), and the screens do not see a search.
      expect(mockController.current.onFiltered).toHaveBeenCalledWith({ business: '42' })
      expect(api.state.requests.some((request) => request.business === '42')).toBe(true)
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/Store 42/)
      // The chip says the store is on: no second notice.
      expect(queryByTestId('orders-filter-notice')).toBeNull()
      expect(queryAllByTestId('order-card-store-name')).toHaveLength(0)
    })

    it('shares its store with the search sheet\'s Store row, which changes the chip only with Apply', async () => {
      mockStores.current = stores(3)
      const { getByTestId, getByText, getAllByText, getByLabelText } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(getByTestId('orders-store-filter'))
      fireEvent.press(getByText('Store 42'))
      await flush()
      fireEvent.press(getByTestId('orders-search'))
      await flush()
      expect(getByTestId('orders-search-business')).toHaveTextContent(/Store 42/)
      fireEvent.press(getByText('Store', { exact: true }))
      expect(getByText('Select Business')).toBeTruthy()
      fireEvent.press(getAllByText('Store 43').slice(-1)[0])
      await flush()
      // A draft of the sheet: the chip and the controller still hold the other store.
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/Store 42/)
      expect(mockController.current.onFiltered).not.toHaveBeenCalledWith({ business: '43' })
      // Closed without Apply: the screen is as it was.
      fireEvent.press(getByLabelText('Go back'))
      await flush()
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/Store 42/)
      fireEvent.press(getByTestId('orders-search'))
      await flush()
      fireEvent.press(getByTestId('orders-search-apply'))
      await flush()
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/Store 43/)
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith({ business: '43' })
    })

    it('keeps the chip\'s store when the sheet is cleared (its own sheet clears it)', async () => {
      mockStores.current = stores(3)
      const { getByTestId, getByText } = renderChip(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(getByTestId('orders-store-filter'))
      fireEvent.press(getByText('Store 42'))
      await flush()
      fireEvent.press(getByTestId('orders-search'))
      await flush()
      fireEvent.press(getByTestId('orders-search-clear'))
      await flush()
      expect(getByTestId('orders-store-filter')).toHaveTextContent(/Store 42/)
    })
  })

  describe('the store in the search and filter sheet (no chip: the theme\'s default)', () => {
    const chooseInSheet = async (view: ReturnType<typeof renderOrders>, name: string) => {
      fireEvent.press(view.getByTestId('orders-search'))
      await flush()
      fireEvent.press(view.getByTestId('orders-search-business'))
      fireEvent.press(view.getAllByText(name).slice(-1)[0])
      await flush()
    }
    const asked = (business: string) => api.state.requests.filter((request) => request.business === business)

    it('draws no chip and reserves no room for it; the Store row is there with more than one store only', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(view.queryByTestId('orders-store-filter')).toBeNull()
      expect(view.getByTestId('orders-header')).toBeTruthy()
      fireEvent.press(view.getByTestId('orders-search'))
      await flush()
      expect(view.getByTestId('orders-search-business')).toHaveTextContent(/All stores/)
      view.unmount()

      mockStores.current = stores(1)
      const single = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      fireEvent.press(single.getByTestId('orders-search'))
      await flush()
      expect(single.queryByTestId('orders-search-business')).toBeNull()
    })

    it('still learns the number of stores, so the cards name their store from the first card', async () => {
      // The orders of one store alone, in an account of two: only the store list can say there is another.
      mockController.current = controller({ ordersGroup: { ...controller().ordersGroup, active: slot(everything.filter((item) => item.business_id === 41), { pagination: { currentPage: 1, pageSize: 50, total: 5, totalPages: 1 } }) } })
      const { queryByTestId, getAllByTestId } = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      expect(queryByTestId('orders-store-filter')).toBeNull()
      expect(getAllByTestId('order-card-store-name').length).toBeGreaterThan(0)
    })

    it('a store chosen in the sheet changes nothing until Apply, and nothing when the sheet is closed without it', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      expect(mockController.current.onFiltered).not.toHaveBeenCalled()
      expect(asked('42')).toHaveLength(0)
      expect(view.queryByTestId('orders-filter-notice')).toBeNull()
      fireEvent.press(view.getByLabelText('Go back'))
      await flush()
      expect(view.queryByTestId('orders-filter-notice')).toBeNull()
      expect(mockController.current.onFiltered).not.toHaveBeenCalled()
      expect(asked('42')).toHaveLength(0)
    })

    it('Apply with a store alone is the store view: the lists and the controller are that store\'s, the tabs and the stage chips stay', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      fireEvent.press(view.getByTestId('orders-search-apply'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith({ business: '42' })
      expect(asked('42').length).toBeGreaterThan(0)
      // Not a search: the tabs and the stage chips of In progress are there, the results' empty text is not.
      expect(view.getByTestId('orders-tabs')).toBeTruthy()
      fireEvent.press(view.getByText('In progress'))
      await flush()
      expect(view.getByTestId('orders-stages')).toBeTruthy()
      expect(asked('42').some((request) => request.statuses.includes(7))).toBe(true)
      // The store is named by the notice, which does not say orders may be missed.
      expect(view.getByTestId('orders-filter-notice')).toHaveTextContent(/Showing Store 42 only\./)
      expect(view.queryByText(/You may miss new orders/)).toBeNull()
      expect(view.queryAllByTestId('order-card-store-name')).toHaveLength(0)
      expect(view.queryByTestId('orders-store-filter')).toBeNull()
    })

    it('reopening the sheet shows the store that is on', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      fireEvent.press(view.getByTestId('orders-search-apply'))
      await flush()
      fireEvent.press(view.getByTestId('orders-search'))
      await flush()
      expect(view.getByTestId('orders-search-business')).toHaveTextContent(/Store 42/)
    })

    it('Clear in the notice returns to all stores', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      fireEvent.press(view.getByTestId('orders-search-apply'))
      await flush()
      fireEvent.press(view.getByTestId('orders-filter-clear'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith(null)
      expect(view.queryByTestId('orders-filter-notice')).toBeNull()
      fireEvent.press(view.getByTestId('orders-search'))
      await flush()
      expect(view.getByTestId('orders-search-business')).toHaveTextContent(/All stores/)
      expect(view.getByTestId('orders-search-business')).not.toHaveTextContent(/Store 42/)
    })

    it('Clear in the sheet returns to all stores', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      fireEvent.press(view.getByTestId('orders-search-apply'))
      await flush()
      fireEvent.press(view.getByTestId('orders-search'))
      await flush()
      fireEvent.press(view.getByTestId('orders-search-clear'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith(null)
      expect(view.queryByTestId('orders-filter-notice')).toBeNull()
      // The next round of requests is of every store again.
      const before = api.state.requests.length
      fireEvent.press(view.getByText('In progress'))
      await flush()
      expect(api.state.requests.slice(before).every((request) => request.business === undefined)).toBe(true)
    })

    it('a store with a text is a search with the store as one of its filters', async () => {
      mockStores.current = stores(3)
      const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} />)
      await flush()
      await chooseInSheet(view, 'Store 42')
      fireEvent.changeText(view.getByTestId('orders-search-text'), '25')
      fireEvent.press(view.getByTestId('orders-search-apply'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith(expect.objectContaining({ business: '42', id: expect.anything() }))
      // A search: the notice lists the store with the rest and warns, and the stage chips give way to the results.
      expect(view.getByTestId('orders-filter-notice')).toHaveTextContent(/Filters on: Store 42 · 25\. You may miss new orders\./)
      fireEvent.press(view.getByText('In progress'))
      await flush()
      expect(view.queryByTestId('orders-stages')).toBeNull()
      fireEvent.press(view.getByTestId('orders-filter-clear'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith(null)
    })
  })

  describe('the board', () => {
    const board = (props: Record<string, any> = {}) => renderOrders(<OrdersBoard onNavigationRedirect={jest.fn()} {...props} />, { platform: 'tablet' })

    it('has the refresh button of the phone, which reloads the lists', async () => {
      const { getByTestId } = board()
      await flush()
      const before = api.get.mock.calls.length
      fireEvent.press(getByTestId('orders-refresh'))
      await flush()
      expect(mockController.current.loadOrders).toHaveBeenCalledWith({ newFetch: true })
      // The board's columns are the controller's lists: the app's own requests are the chips' lists, which it has none of.
      expect(api.get.mock.calls.length).toBe(before)
    })

    it('is off with the key, and disabled offline', async () => {
      const theme = themeWithValues((values) => { values.visibility['orders.refresh'] = false }, { platform: 'tablet' })
      const hidden = renderOrders(<OrdersBoard onNavigationRedirect={jest.fn()} />, { themeOverrides: theme as any, platform: 'tablet' })
      await flush()
      expect(hidden.queryByTestId('orders-refresh')).toBeNull()
      hidden.unmount()
      const offlineBoard = board({ isNetConnected: false })
      await flush()
      expect(offlineBoard.getByTestId('orders-refresh').props.accessibilityState.disabled).toBe(true)
    })

    it('draws no number in its columns, and asks for no totals', async () => {
      const many = [...Array.from({ length: 130 }, (_, index) => order(1000 + index, 0)), order(5, 7)]
      api = fakeOrdersApi(many)
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const { getByTestId, queryByTestId } = board()
      await flush()
      for (const column of ['new', 'preparing', 'ready']) {
        expect(getByTestId(`board-column-${column}`)).toBeTruthy()
        expect(queryByTestId(`board-column-${column}-count`)).toBeNull()
      }
      expect(getByTestId('board-columns')).not.toHaveTextContent(/\d{3}/)
      expect(api.get).not.toHaveBeenCalled()
    })

    it('has no store chip in its header by default, and the phone\'s chip when the theme draws it', async () => {
      mockStores.current = stores(3)
      const plain = board()
      await flush()
      expect(plain.queryByTestId('board-store-filter')).toBeNull()
      plain.unmount()
      const chip = renderOrders(<OrdersBoard onNavigationRedirect={jest.fn()} />, { platform: 'tablet', themeOverrides: withChip('tablet') as any })
      await flush()
      expect(chip.getByTestId('board-store-filter')).toHaveTextContent(/All stores/)
    })

    it('narrows its columns to the store applied in the search sheet, which is a dialog there', async () => {
      const named = stores(2)
      named.businessesList.businesses = [{ id: 41, name: 'McBonalds', logo: undefined }, { id: 49, name: 'Wine..', logo: undefined }]
      mockStores.current = named
      const { getByTestId, getAllByText, queryByTestId } = board()
      await flush()
      fireEvent.press(getByTestId('orders-search'))
      await flush()
      fireEvent.press(getByTestId('orders-search-business'))
      fireEvent.press(getAllByText('Wine..').slice(-1)[0])
      await flush()
      // A draft until Apply.
      expect(mockController.current.onFiltered).not.toHaveBeenCalled()
      fireEvent.press(getByTestId('orders-search-apply'))
      await flush()
      expect(mockController.current.onFiltered).toHaveBeenLastCalledWith({ business: '49' })
      expect(getByTestId('orders-filter-notice')).toHaveTextContent(/Showing Wine\.\. only\./)
      // The columns stay (it is not a search); the order of the other store is out of them.
      expect(getByTestId('board-columns')).toBeTruthy()
      expect(queryByTestId('order-card-20')).toBeNull()
      expect(getByTestId('order-card-19')).toBeTruthy()
    })
  })
})
