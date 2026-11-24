import React from 'react'
import { act, fireEvent, within } from '@testing-library/react-native'
import { useApi, useConfig, useEvent, useSession, useUtils } from '@components'

// The orders controller is replaced by a component that hands the UI what the test sets.
const mockController: { current: Record<string, any> } = { current: {} }
jest.mock('@components', () => {
  const React = require('react')
  return {
    ...require('../../../../../../jest/helpers/mockOrdering'),
    OrderListGroups: ({ UIComponent, ...props }: any) => {
      const [filtered, setFiltered] = React.useState(mockController.current.filtered ?? null)
      const onFiltered = React.useCallback((next: any) => { mockController.current.onFiltered(next); setFiltered(next) }, [])
      return <UIComponent {...props} {...mockController.current} filtered={filtered} onFiltered={onFiltered} />
    },
    BusinessList: ({ UIComponent, ...props }: any) => <UIComponent {...props} businessesList={{ businesses: [], loading: false, error: false, fetched: true }} paginationProps={{ currentPage: 1, totalPages: 1, totalItems: 0 }} getBusinesses={jest.fn()} handleChangeSearch={jest.fn()} searchValue='' />,
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
import { ORDER_CHANGED_EVENT } from '../orderChanges'
import { resetOrdersView } from '../ordersView'
import { makeOrder, slot } from './fixtures'
import { fakeOrdersApi } from './fakeOrdersApi'

const order = (id: number, status: number, business = 41) => makeOrder({ id, status, business_id: business, business: { id: business, name: business === 41 ? 'McBonalds' : 'Wine..' } })

// Open orders: 2 pending, 2 preorders, 3 preparing, 2 ready, 1 with a driver.
const everything = [
  order(30, 0), order(29, 0, 49), order(28, 13), order(27, 13, 49),
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
  ordersGroup: { active: slot(everything.slice(), { pagination: { currentPage: 1, pageSize: 50, total: everything.length, totalPages: 1 } }), completed: slot([]), pending: slot([]), inProgress: slot([]), cancelled: slot([]) },
  ...overrides
})

const offline = { isNetConnected: true, canSaveChangesOffline: false, actions: {}, orders: null }
const renderOrders = (ui: React.ReactElement, options: Record<string, any> = {}) => renderWithProviders(
  <OfflineActionsContext.Provider value={[offline, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
    {ui}
  </OfflineActionsContext.Provider>,
  options
)
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
const cards = (view: any) => view.queryAllByTestId(/^order-card-\d+$/).map((node: any) => node.props.testID)

describe('the chips of New and the All chip of In progress', () => {
  let api: ReturnType<typeof fakeOrdersApi>

  const mount = async (props: Record<string, any> = {}, options: Record<string, any> = {}) => {
    const view = renderOrders(<OrdersOption onNavigationRedirect={jest.fn()} {...props} />, options)
    await flush()
    return view
  }

  beforeEach(() => {
    jest.clearAllMocks()
    resetStoresSeen()
    resetOrdersView()
    api = fakeOrdersApi(everything)
    mockController.current = controller()
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    ;(useSession as jest.Mock).mockReturnValue([{ token: 'token', user: { id: 7 } }, {}])
    ;(useUtils as jest.Mock).mockReturnValue([{ parsePrice: (v: number) => `$${v}`, parseDate: (v: string) => `time(${v})`, timeFormat: 'HH:mm', dateFormat: 'MM/DD/YYYY' }, {}])
    ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: {} }])
  })

  describe('New: Pending and Preorder', () => {
    it('are two chips under the tabs, Pending open, each its name alone', async () => {
      const view = await mount()
      expect(view.getByTestId('orders-new-stages')).toBeTruthy()
      expect(view.queryByTestId('orders-stages')).toBeNull()
      expect(view.getByTestId('orders-stage-pending').props.accessibilityState.selected).toBe(true)
      expect(view.getByTestId('orders-stage-preorder').props.accessibilityState.selected).toBe(false)
      expect(view.getByTestId('orders-stage-pending')).not.toHaveTextContent(/\d/)
      expect(view.getByTestId('orders-stage-preorder')).not.toHaveTextContent(/\d/)
      expect(view.getByTestId('orders-stage-pending').props.accessibilityLabel).toBe('Pending')
      expect(view.queryByTestId('orders-stage-pending-count')).toBeNull()
      expect(view.getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
    })

    it('list each chip\'s own orders, from its own paged request of 50', async () => {
      const view = await mount()
      expect(api.state.requests.filter((request) => request.pageSize === 50)).toEqual([expect.objectContaining({ statuses: [0] })])
      expect(cards(view)).toEqual(['order-card-30', 'order-card-29'])
      fireEvent.press(view.getByTestId('orders-stage-preorder'))
      await flush()
      expect(api.state.requests.filter((request) => request.pageSize === 50).map((request) => request.statuses)).toEqual([[0], [13]])
      expect(cards(view)).toEqual(['order-card-28', 'order-card-27'])
      // No section title: the chip names the list.
      expect(view.queryByTestId('orders-section-new')).toBeNull()
    })

    it('ask for no totals: the only request is the chip\'s own page, however many orders there are', async () => {
      const many = Array.from({ length: 527 }, (_, index) => order(5000 - index, 0))
      api = fakeOrdersApi([...many, order(28, 13)])
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const view = await mount()
      expect(api.state.requests.filter((request) => request.pageSize === 1)).toEqual([])
      expect(api.state.requests.map((request) => request.pageSize)).toEqual([50])
      expect(cards(view).length).toBeLessThan(50 + 1)
      expect(view.getByTestId('orders-stage-pending')).not.toHaveTextContent(/\d/)
      expect(view.getByTestId('orders-tabs')).not.toHaveTextContent(/\d/)
    })

    it('keep the chosen chip when the tab is left and returned to', async () => {
      const view = await mount()
      fireEvent.press(view.getByTestId('orders-stage-preorder'))
      await flush()
      fireEvent.press(view.getByText('History'))
      fireEvent.press(view.getByText('New'))
      await flush()
      expect(view.getByTestId('orders-stage-preorder').props.accessibilityState.selected).toBe(true)
      expect(cards(view)).toEqual(['order-card-28', 'order-card-27'])
    })

    it('say "No new orders" for an empty Pending and "No preorders" for an empty Preorder', async () => {
      api = fakeOrdersApi(everything.filter((item) => item.status !== 0))
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const view = await mount()
      expect(view.getByText('No new orders')).toBeTruthy()
      api.state.orders = api.state.orders.filter((item) => item.status !== 13)
      fireEvent.press(view.getByTestId('orders-stage-preorder'))
      await flush()
      expect(view.getByText('No preorders')).toBeTruthy()
      expect(view.queryByText('No new orders')).toBeNull()
    })

    it('lose an order accepted in Pending at once, and In progress follows', async () => {
      const view = await mount()
      const [events] = (useEvent as jest.Mock)()
      act(() => { events.emit(ORDER_CHANGED_EVENT, { id: 30, status: 7 }) })
      expect(cards(view)).toEqual(['order-card-29'])
      // The preorder accepted leaves Preorder; the order moves into Preparing's list at the head.
      fireEvent.press(view.getByTestId('orders-stage-preorder'))
      await flush()
      act(() => { events.emit(ORDER_CHANGED_EVENT, { id: 28, status: 7 }) })
      api.state.orders = api.state.orders.map((item) => (item.id === 30 || item.id === 28 ? { ...item, status: 7 } : item))
      expect(cards(view)).toEqual(['order-card-27'])
      fireEvent.press(view.getByText('In progress'))
      await flush()
      expect(cards(view).slice(0, 2)).toEqual(['order-card-28', 'order-card-30'])
      // The events moved no number: no request of one order was made for them.
      expect(api.state.requests.filter((request) => request.pageSize === 1)).toEqual([])
    })

    it('show the copy of the open orders by status while offline', async () => {
      const view = await mount({ isNetConnected: false })
      expect(api.get).not.toHaveBeenCalled()
      expect(cards(view)).toEqual(['order-card-30', 'order-card-29'])
      fireEvent.press(view.getByTestId('orders-stage-preorder'))
      expect(cards(view)).toEqual(['order-card-28', 'order-card-27'])
    })

    it('are not drawn with the theme\'s key off: New is the controller\'s one list, as before', async () => {
      const theme = themeWithValues((values) => { values.visibility['orders.stage_filter'] = false })
      const view = await mount({}, { themeOverrides: theme as any })
      expect(view.queryByTestId('orders-new-stages')).toBeNull()
      expect(cards(view)).toEqual(['order-card-30', 'order-card-29', 'order-card-28', 'order-card-27'])
    })

    it('are not drawn with a search on: the tabs split the results', async () => {
      mockController.current = controller({ filtered: { customer: 'James' }, ordersFiltered: slot([order(30, 0), order(18, 7)]) })
      const view = await mount()
      expect(view.queryByTestId('orders-new-stages')).toBeNull()
      expect(cards(view)).toEqual(['order-card-30'])
    })

    it('are not drawn with the combined layout', async () => {
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const view = await mount()
      expect(view.queryByTestId('orders-new-stages')).toBeNull()
      expect(view.queryByTestId('orders-stages')).toBeNull()
    })

    it('are not drawn on the tablet board, which keeps its New column of Pending and Preorder, with no number', async () => {
      const view = renderOrders(<OrdersBoard onNavigationRedirect={jest.fn()} />, { platform: 'tablet' })
      await flush()
      expect(view.queryByTestId('orders-new-stages')).toBeNull()
      // The title is followed by the first card at once: no number between them.
      expect(view.getByTestId('board-column-new')).toHaveTextContent(/^NewPending/)
      expect(view.queryByTestId('board-column-new-count')).toBeNull()
      expect(within(view.getByTestId('board-column-new')).getByTestId('order-card-28')).toBeTruthy()
    })

    const ask = async (request: Record<string, any> | undefined, first: 'pending' | 'preorder') => {
      const view = await mount()
      fireEvent.press(view.getByTestId(`orders-stage-${first}`))
      await flush()
      fireEvent.press(view.getByText('History'))
      const setParams = jest.fn()
      view.rerender(
        <OfflineActionsContext.Provider value={[offline, { applyOffAction: jest.fn(), registerOffOrder: jest.fn(), setState: jest.fn() }] as any}>
          <OrdersOption onNavigationRedirect={jest.fn()} tabRequest={request} navigation={{ setParams }} />
        </OfflineActionsContext.Provider>
      )
      await flush()
      return { view, setParams }
    }

    it('open on Pending when the shell asks for the New tab without a chip, whatever chip was open', async () => {
      const { view, setParams } = await ask({ tab: 'new', at: 1 }, 'preorder')
      expect(setParams).toHaveBeenCalledWith({ tab: undefined, stage: undefined, at: undefined })
      expect(view.getByTestId('orders-stage-pending').props.accessibilityState.selected).toBe(true)
      expect(cards(view)).toEqual(['order-card-30', 'order-card-29'])
    })

    it('open on Preorder when the shell asks for the New tab on that chip (the order that rang is a preorder), whatever chip was open', async () => {
      const { view, setParams } = await ask({ tab: 'new', stage: 'preorder', at: 1 }, 'pending')
      expect(setParams).toHaveBeenCalledWith({ tab: undefined, stage: undefined, at: undefined })
      expect(view.getByTestId('orders-stage-preorder').props.accessibilityState.selected).toBe(true)
      expect(view.getByTestId('orders-stage-pending').props.accessibilityState.selected).toBe(false)
      expect(cards(view)).toEqual(['order-card-28', 'order-card-27'])
    })

    it('open on Pending when the ask names Pending, and a chip of another tab\'s ask is ignored', async () => {
      const { view } = await ask({ tab: 'new', stage: 'pending', at: 1 }, 'preorder')
      expect(view.getByTestId('orders-stage-pending').props.accessibilityState.selected).toBe(true)
      const progress = await ask({ tab: 'progress', stage: 'preorder', at: 1 }, 'pending')
      expect(progress.view.queryByTestId('orders-new-stages')).toBeNull()
      expect(progress.view.getByTestId('orders-stages')).toBeTruthy()
    })

    it('is harmless when the chips are not drawn (the theme\'s key off, the combined layout): the ask still opens New', async () => {
      const theme = themeWithValues((values) => { values.visibility['orders.stage_filter'] = false })
      const off = await mount({ tabRequest: { tab: 'new', stage: 'preorder', at: 1 }, navigation: { setParams: jest.fn() } }, { themeOverrides: theme as any })
      expect(off.queryByTestId('orders-new-stages')).toBeNull()
      expect(cards(off)).toEqual(['order-card-30', 'order-card-29', 'order-card-28', 'order-card-27'])
      off.unmount()
      ;(useConfig as jest.Mock).mockReturnValue([{ loading: false, configs: { combine_pending_and_progress_orders: { value: '1' } } }])
      const combined = await mount({ tabRequest: { tab: 'new', stage: 'preorder', at: 2 }, navigation: { setParams: jest.fn() } })
      expect(combined.queryByTestId('orders-new-stages')).toBeNull()
      expect(combined.getByTestId('orders-section-new')).toBeTruthy()
    })
  })

  describe('In progress: All', () => {
    const open = async (view: any) => {
      fireEvent.press(view.getByText('In progress'))
      await flush()
    }

    it('is the first of four chips and Preparing stays the one selected by default', async () => {
      const view = await mount()
      await open(view)
      const keys = view.getByTestId('orders-stages').findAll((node: any) => /^orders-stage-[a-z_]+$/.test(node.props.testID ?? '') && typeof node.type === 'string')
      expect(keys.map((node: any) => node.props.testID)).toEqual(['orders-stage-all', 'orders-stage-preparing', 'orders-stage-ready', 'orders-stage-with_driver'])
      expect(view.getByTestId('orders-stage-preparing').props.accessibilityState.selected).toBe(true)
      expect(view.getByTestId('orders-stage-all').props.accessibilityState.selected).toBe(false)
      expect(cards(view)).toEqual(['order-card-18', 'order-card-17', 'order-card-16'])
    })

    it('has its own paged list of every in-progress status, newest first, with no section titles', async () => {
      const view = await mount()
      await open(view)
      expect(view.getByTestId('orders-stage-all')).not.toHaveTextContent(/\d/)
      fireEvent.press(view.getByTestId('orders-stage-all'))
      await flush()
      const allAsk = api.state.requests.find((request) => request.pageSize === 50 && request.statuses.includes(3) && request.statuses.includes(7) && request.statuses.includes(4))
      expect(allAsk?.statuses.slice().sort((a, b) => a - b)).toEqual([3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26])
      expect(cards(view)).toEqual(['order-card-18', 'order-card-17', 'order-card-16', 'order-card-15', 'order-card-14', 'order-card-13'])
      expect(view.queryByTestId('orders-section-preparing')).toBeNull()
      expect(view.queryByTestId('orders-section-ready')).toBeNull()
    })

    it('keeps an order that changes stage, with its new status, and drops one that leaves In progress', async () => {
      const view = await mount()
      await open(view)
      fireEvent.press(view.getByTestId('orders-stage-all'))
      await flush()
      const [events] = (useEvent as jest.Mock)()
      act(() => { events.emit(ORDER_CHANGED_EVENT, { id: 18, status: 4 }) })
      expect(cards(view)).toEqual(['order-card-18', 'order-card-17', 'order-card-16', 'order-card-15', 'order-card-14', 'order-card-13'].filter(Boolean))
      expect(within(view.getByTestId('order-card-18')).queryByText(/Ready/)).toBeTruthy()
      act(() => { events.emit(ORDER_CHANGED_EVENT, { id: 17, status: 2 }) })
      expect(cards(view)).not.toContain('order-card-17')
    })

    it('says "No orders in progress" when it is empty', async () => {
      api = fakeOrdersApi(everything.filter((item) => item.status === 0 || item.status === 13))
      ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
      const view = await mount()
      await open(view)
      fireEvent.press(view.getByTestId('orders-stage-all'))
      await flush()
      expect(view.getByText('No orders in progress')).toBeTruthy()
    })

    it('is kept when the tab is left and returned to', async () => {
      const view = await mount()
      await open(view)
      fireEvent.press(view.getByTestId('orders-stage-all'))
      await flush()
      fireEvent.press(view.getByText('New'))
      await open(view)
      expect(view.getByTestId('orders-stage-all').props.accessibilityState.selected).toBe(true)
    })

    it('shows the copy of the open orders that are not New while offline', async () => {
      const view = await mount({ isNetConnected: false })
      await open(view)
      fireEvent.press(view.getByTestId('orders-stage-all'))
      expect(cards(view)).toEqual(['order-card-18', 'order-card-17', 'order-card-16', 'order-card-15', 'order-card-14', 'order-card-13'])
    })
  })
})
