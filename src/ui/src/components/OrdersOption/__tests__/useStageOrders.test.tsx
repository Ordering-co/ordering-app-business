import { act, renderHook } from '@testing-library/react-native'
import { useApi, useEvent, useSession } from '@components'

import { ORDER_CHANGED_EVENT } from '../orderChanges'
import { STAGE_PAGE_SIZE, useStageOrders } from '../useStageOrders'
import { makeOrder } from './fixtures'
import { fakeOrdersApi } from './fakeOrdersApi'

const handlers: Record<string, Array<(...args: any[]) => void>> = {}
const emit = (name: string, ...data: any[]) => (handlers[name] ?? []).slice().forEach((handler) => handler(...data))
const bus = {
  on: (name: string, handler: any) => { (handlers[name] ??= []).push(handler) },
  off: (name: string, handler: any) => { handlers[name] = (handlers[name] ?? []).filter((item) => item !== handler) },
  emit
}

const order = (id: number, status: number, business = 41) => makeOrder({ id, status, business_id: business })
const ids = (rows: Array<{ orders: any[] }>) => rows.map((row) => row.orders[0].id)
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }

describe('useStageOrders', () => {
  let api: ReturnType<typeof fakeOrdersApi>
  const lookup = jest.fn()

  const mount = async (initial: any[], props: Record<string, any> = {}) => {
    api = fakeOrdersApi(initial)
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    const hook = renderHook((current: any) => useStageOrders({ enabled: true, stage: 'preparing', business: '', online: true, lookup, ...current }), { initialProps: props })
    await flush()
    return hook
  }

  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(handlers)) delete handlers[key]
    ;(useSession as jest.Mock).mockReturnValue([{ token: 'token', user: { id: 7 } }, {}])
    ;(useEvent as jest.Mock).mockReturnValue([bus])
  })

  it('reads the first page of the open stage, newest first, and nothing of the others', async () => {
    const { result } = await mount([order(5, 7), order(9, 14), order(3, 7), order(8, 4), order(7, 0)])
    expect(api.state.requests).toEqual([{ statuses: [7, 14], business: undefined, beforeId: undefined, page: 1, pageSize: STAGE_PAGE_SIZE }])
    expect(ids(result.current.rows)).toEqual([9, 5, 3])
    expect(result.current.loading).toBe(false)
    expect(result.current.hasMore).toBe(false)
  })

  it('says it is loading until the first page is in', async () => {
    api = fakeOrdersApi([order(5, 7)])
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    const { result } = renderHook(() => useStageOrders({ enabled: true, stage: 'preparing', business: '', online: true, lookup }))
    expect(result.current.loading).toBe(true)
    await flush()
    expect(result.current.loading).toBe(false)
  })

  it('reads the next page from the last order read, whatever left the stage meanwhile', async () => {
    const many = Array.from({ length: 120 }, (_, index) => order(1000 - index, 7))
    const { result } = await mount(many)
    expect(result.current.rows).toHaveLength(50)
    expect(result.current.hasMore).toBe(true)
    // Ten of the first page are marked ready while the list is read: an offset would skip ten orders of the next one.
    act(() => { many.slice(0, 10).forEach((item) => emit(ORDER_CHANGED_EVENT, { ...item, status: 4 })) })
    api.state.orders = api.state.orders.map((item) => (item.id > 990 ? { ...item, status: 4 } : item))
    act(() => { result.current.loadMore() })
    await flush()
    expect(api.state.requests[1]).toMatchObject({ page: 1, beforeId: 951 })
    expect(result.current.rows).toHaveLength(40 + 50)
    expect(new Set(ids(result.current.rows)).size).toBe(90)
    expect(result.current.hasMore).toBe(true)
    act(() => { result.current.loadMore() })
    await flush()
    expect(result.current.hasMore).toBe(false)
    expect(result.current.rows).toHaveLength(110)
  })

  it('does not ask for a page while one is on its way, nor when there is none', async () => {
    const { result } = await mount(Array.from({ length: 70 }, (_, index) => order(500 - index, 7)))
    act(() => { result.current.loadMore(); result.current.loadMore() })
    await flush()
    expect(api.state.requests).toHaveLength(2)
    act(() => { result.current.loadMore() })
    expect(api.state.requests).toHaveLength(2)
  })

  it('reads the first page again on refresh', async () => {
    const { result } = await mount([order(5, 7)])
    api.state.orders = [order(6, 7), order(5, 7)]
    act(() => { result.current.refresh() })
    await flush()
    expect(ids(result.current.rows)).toEqual([6, 5])
  })

  it('narrows to the chosen store and starts again when it changes', async () => {
    const { result, rerender } = await mount([order(5, 7, 41), order(4, 7, 49)])
    expect(ids(result.current.rows)).toEqual([5, 4])
    rerender({ business: '49' })
    await flush()
    expect(api.state.requests[api.state.requests.length - 1]).toMatchObject({ business: '49' })
    expect(ids(result.current.rows)).toEqual([4])
  })

  it('says why when the first page fails, and has no rows', async () => {
    api = fakeOrdersApi([])
    api.state.failing = true
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    const { result } = renderHook(() => useStageOrders({ enabled: true, stage: 'ready', business: '', online: true, lookup }))
    await flush()
    expect(result.current.error).toEqual(['Network request failed'])
    expect(result.current.rows).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('asks for nothing while the chips are not drawn, offline, or without a session', async () => {
    api = fakeOrdersApi([order(5, 7)])
    ;(useApi as jest.Mock).mockReturnValue([api.ordering, {}])
    renderHook(() => useStageOrders({ enabled: false, stage: 'preparing', business: '', online: true, lookup }))
    renderHook(() => useStageOrders({ enabled: true, stage: 'preparing', business: '', online: false, lookup }))
    await flush()
    expect(api.state.requests).toEqual([])
  })

  describe('All, Pending and Preorder', () => {
    const open = [order(30, 0), order(29, 13), order(28, 0), order(18, 7), order(16, 14), order(15, 4), order(13, 23), order(12, 1)]

    it('reads every in-progress status in one list, newest first, and nothing of New or History', async () => {
      const { result } = await mount(open, { stage: 'all' })
      expect(api.state.requests[0].statuses.slice().sort((a, b) => a - b)).toEqual([3, 4, 7, 8, 9, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26])
      expect(ids(result.current.rows)).toEqual([18, 16, 15, 13])
    })

    it('pages All on its own, from the last order read', async () => {
      const many = Array.from({ length: 120 }, (_, index) => order(1000 - index, index % 2 ? 4 : 7))
      const { result } = await mount(many, { stage: 'all' })
      expect(result.current.rows).toHaveLength(50)
      expect(result.current.hasMore).toBe(true)
      act(() => { result.current.loadMore() })
      await flush()
      expect(api.state.requests[1]).toMatchObject({ beforeId: 951 })
      expect(result.current.rows).toHaveLength(100)
    })

    it('reads Pending (status 0) and Preorder (status 13) apart, each its own list', async () => {
      const { result, rerender } = await mount(open, { stage: 'pending' })
      expect(api.state.requests[0]).toMatchObject({ statuses: [0], pageSize: STAGE_PAGE_SIZE })
      expect(ids(result.current.rows)).toEqual([30, 28])
      rerender({ stage: 'preorder' })
      await flush()
      expect(api.state.requests[1]).toMatchObject({ statuses: [13] })
      expect(ids(result.current.rows)).toEqual([29])
    })

    it('keeps an order that changes stage in All, with its new status, and drops one that leaves In progress', async () => {
      const { result } = await mount(open, { stage: 'all' })
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 18, status: 4 }) })
      expect(ids(result.current.rows)).toEqual([18, 16, 15, 13])
      expect(result.current.rows[0].orders[0].status).toBe(4)
      act(() => { emit('order_updated', { id: 16, status: 1 }) })
      expect(ids(result.current.rows)).toEqual([18, 15, 13])
    })

    it('takes an order accepted in Pending into All (at its head) and out of Pending', async () => {
      lookup.mockImplementation((id: any) => (id === 30 ? order(30, 0) : undefined))
      const { result, rerender } = await mount(open, { stage: 'pending' })
      rerender({ stage: 'all' })
      await flush()
      rerender({ stage: 'pending' })
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 30, status: 7 }) })
      expect(ids(result.current.rows)).toEqual([28])
      rerender({ stage: 'all' })
      expect(ids(result.current.rows)).toEqual([30, 18, 16, 15, 13])
    })

    it('moves an order between Pending and Preorder, and hears the socket\'s new orders of each', async () => {
      const { result, rerender } = await mount(open, { stage: 'pending' })
      act(() => { emit('order_added', order(31, 0)) })
      expect(ids(result.current.rows)).toEqual([31, 30, 28])
      act(() => { emit('order_updated', { ...order(28, 13) }) })
      expect(ids(result.current.rows)).toEqual([31, 30])
      api.state.orders = [...api.state.orders, order(31, 0)].map((item) => (item.id === 28 ? { ...item, status: 13 } : item))
      rerender({ stage: 'preorder' })
      await flush()
      expect(ids(result.current.rows)).toEqual([29, 28])
    })

    it('starts the New lists again for another store', async () => {
      const { result, rerender } = await mount([order(30, 0, 41), order(29, 0, 49)], { stage: 'pending' })
      expect(ids(result.current.rows)).toEqual([30, 29])
      rerender({ stage: 'pending', business: '49' })
      await flush()
      expect(ids(result.current.rows)).toEqual([29])
    })
  })

  describe('an order changes', () => {
    it('leaves the stage it was in, and heads the one it enters when the app changed it', async () => {
      const { result, rerender } = await mount([order(9, 7), order(8, 7), order(2, 4), order(1, 4)])
      rerender({ stage: 'ready' })
      await flush()
      expect(ids(result.current.rows)).toEqual([2, 1])
      // The order is marked ready in Preparing: the Preparing list of the same hook holds it.
      rerender({ stage: 'preparing' })
      await flush()
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 8, status: 4 }) })
      expect(ids(result.current.rows)).toEqual([9])
      rerender({ stage: 'ready' })
      // Newer than the others, and the first row even when it was older than them: it heads the list until it is read again.
      expect(ids(result.current.rows)).toEqual([8, 2, 1])
    })

    it('pins the app\'s own change above newer orders, and the server\'s order returns on refresh', async () => {
      const { result, rerender } = await mount([order(9, 7), order(3, 7), order(20, 4)])
      rerender({ stage: 'ready' })
      await flush()
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 3, status: 4 }) })
      expect(ids(result.current.rows)).toEqual([3, 20])
      api.state.orders = api.state.orders.map((item) => (item.id === 3 ? { ...item, status: 4 } : item))
      act(() => { result.current.refresh() })
      await flush()
      expect(ids(result.current.rows)).toEqual([20, 3])
    })

    it('heads a stage the app moved an order into before the stage was opened', async () => {
      const { result, rerender } = await mount([order(9, 7), order(3, 7), order(20, 4), order(2, 4)])
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 3, status: 4 }) })
      api.state.orders = api.state.orders.map((item) => (item.id === 3 ? { ...item, status: 4 } : item))
      rerender({ stage: 'ready' })
      await flush()
      // By number it would be second; the app just moved it, so it is first.
      expect(ids(result.current.rows)).toEqual([3, 20, 2])
    })

    it('takes an order accepted in New from the list that holds it (the open orders), not from the server', async () => {
      lookup.mockImplementation((id: any) => (id === 30 ? order(30, 0) : undefined))
      const { result } = await mount([order(9, 7)])
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 30, status: 7 }) })
      expect(ids(result.current.rows)).toEqual([30, 9])
      expect(result.current.rows[0].orders[0].customer).toBeTruthy()
    })

    it('marks a stage to be read again when it learns of an order it cannot draw', async () => {
      const { result, rerender } = await mount([order(5, 7)])
      rerender({ stage: 'ready' })
      await flush()
      const reads = api.state.requests.length
      act(() => { emit(ORDER_CHANGED_EVENT, { id: 77, status: 4 }) })
      await flush()
      expect(api.state.requests.length).toBe(reads + 1)
    })

    it('hears the socket: an order that arrives in the stage, one that leaves it', async () => {
      const { result } = await mount([order(5, 7), order(4, 7)])
      act(() => { emit('order_added', order(6, 7)) })
      expect(ids(result.current.rows)).toEqual([6, 5, 4])
      act(() => { emit('order_updated', { ...order(5, 7), status: 3 }) })
      expect(ids(result.current.rows)).toEqual([6, 4])
      // An update with no status (a message, the driver) changes the card, not the stage.
      act(() => { emit('order_updated', { id: 6, driver: { name: 'Omar' } }) })
      expect(result.current.rows[0].orders[0].driver).toEqual({ name: 'Omar' })
      expect(ids(result.current.rows)).toEqual([6, 4])
    })

    it('leaves out of the list an order older than what is read while more pages are to come: its page brings it', async () => {
      const { result } = await mount(Array.from({ length: 60 }, (_, index) => order(1000 - index, 7)))
      act(() => { emit('order_updated', order(3, 7)) })
      expect(result.current.rows).toHaveLength(50)
    })
  })
})
