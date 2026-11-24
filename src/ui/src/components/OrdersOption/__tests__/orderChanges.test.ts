import { applyOrderChange, applyStatusToRows, changedOrdersFromAnswer, overlayChanges, sameOrder } from '../orderChanges'
import { makeOrder, slot } from './fixtures'

const HISTORY = [1, 2, 5, 6, 10, 11, 12, 15, 16, 17]
const group = () => ({
  active: slot([makeOrder({ id: 9, status: 0 }), makeOrder({ id: 5, status: 7 })]),
  completed: slot([makeOrder({ id: 2, status: 1 })], { currentFilter: HISTORY })
})
const ids = (list: any) => list.orders.map((order: any) => order.id)

describe('changedOrdersFromAnswer', () => {
  it('reads the orders of a plain answer and skips the ones that failed', () => {
    expect(changedOrdersFromAnswer([{ id: 1, status: 7 }, null, 'boom'], [1, 2, 3])).toEqual([{ id: 1, status: 7 }])
  })
  it('reads the orders of an answer with details', () => {
    expect(changedOrdersFromAnswer([{ id: 1, result: { id: 1, status: 4 }, error: false }, { id: 2, result: ['x'], error: true }], [1, 2])).toEqual([{ id: 1, status: 4 }])
  })
  it('takes the status asked for when the answer carries none, and nothing from a text', () => {
    expect(changedOrdersFromAnswer([{ id: 1, result: { id: 1 } }], [1], 15)).toEqual([{ id: 1, status: 15 }])
    expect(changedOrdersFromAnswer('a message', [1])).toEqual([])
  })
})

describe('applyOrderChange', () => {
  it('updates an order in place when it stays in its list', () => {
    const next = applyOrderChange(group(), { id: 9, status: 7 })
    expect(ids(next.active)).toEqual([9, 5])
    expect(next.active.orders[0].status).toBe(7)
    expect(next.active.orders[0].customer).toBeTruthy()
  })
  it('moves an order to History, newest first, and corrects the totals', () => {
    const next = applyOrderChange(group(), { id: 5, status: 15 })
    expect(ids(next.active)).toEqual([9])
    expect(ids(next.completed)).toEqual([5, 2])
    expect(next.active.pagination.total).toBe(1)
    expect(next.completed.pagination.total).toBe(2)
  })
  it('leaves History alone when its filter drops the status, and an order the lists do not hold', () => {
    const filtered = { ...group(), completed: slot([], { currentFilter: [2, 5, 6, 10, 12, 16, 17] }) }
    expect(ids(applyOrderChange(filtered, { id: 5, status: 15 }).completed)).toEqual([])
    const same = group()
    expect(applyOrderChange(same, { id: 404, status: 7 })).toBe(same)
  })
  it('keeps the list\'s amounts when the answer brings the API\'s flat ones', () => {
    const next = applyOrderChange(group(), { id: 9, status: 7, total: 1, subtotal: 1 })
    expect(next.active.orders[0].summary.total).toBe(32.37)
    expect(next.active.orders[0].total).toBeUndefined()
  })
})

describe('an id as text or as a number is the same order', () => {
  it('sameOrder compares by number and never matches a missing id', () => {
    expect(sameOrder(2988, '2988')).toBe(true)
    expect(sameOrder('2988', 2988)).toBe(true)
    expect(sameOrder(2988, 2989)).toBe(false)
    expect(sameOrder(undefined, undefined)).toBe(false)
    expect(sameOrder(null, 0)).toBe(false)
  })
  it('applyOrderChange finds an order whose list holds its id as text, and the change that came as text', () => {
    const next = applyOrderChange({ active: slot([makeOrder({ id: '9' as any, status: 0 })]), completed: slot([], { currentFilter: HISTORY }) }, { id: 9, status: 15 })
    expect(next.active.orders).toHaveLength(0)
    expect(next.completed.orders).toHaveLength(1)
    const same = applyOrderChange(group(), { id: '9' as any, status: 7 })
    expect(same.active.orders[0].status).toBe(7)
  })
  it('overlayChanges lays a change over a search result by id', () => {
    const [laid] = overlayChanges([makeOrder({ id: 9, status: 7 })], { 9: { id: 9, status: 4 } })
    expect(laid.status).toBe(4)
  })
})

describe('applyStatusToRows (the Messages list)', () => {
  const rows = [{ id: 1, status: 0, unread_count: 3 }, { id: 2, status: 7, unread_count: 0 }]
  it('takes the status of the order and nothing else of the answer', () => {
    const next = applyStatusToRows(rows, { id: '1', status: 4, unread_count: 0, customer: { name: 'x' } }) as any[]
    expect(next[0]).toEqual({ id: 1, status: 4, unread_count: 3 })
    expect(next[1]).toBe(rows[1])
  })
  it('returns the same list when no row changes, so nothing is drawn again', () => {
    expect(applyStatusToRows(rows, { id: 9, status: 4 })).toBe(rows)
    expect(applyStatusToRows(rows, { id: 2, status: 7 })).toBe(rows)
    expect(applyStatusToRows(rows, { id: 2 })).toBe(rows)
    expect(applyStatusToRows(undefined, { id: 2, status: 7 })).toBeUndefined()
  })
})
