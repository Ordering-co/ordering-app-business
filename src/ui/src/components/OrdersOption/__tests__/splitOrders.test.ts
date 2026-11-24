import { buildRows, flattenOrders, groupByDay, splitOrders } from '../splitOrders'
import { ACTIVE_STATUSES, HISTORY_STATUSES, ORDER_GROUP_STATUS, sectionOf, slotOf } from '../orderStatusGroups'
import { makeOrder, orderForStatus } from './fixtures'

describe('status groups', () => {
  it('maps every open status to exactly one section', () => {
    const sections = ACTIVE_STATUSES.map((status) => sectionOf(status))
    expect(sections.every(Boolean)).toBe(true)
    expect(sections.filter((section) => section === 'history')).toHaveLength(0)
  })

  it('files the statuses by status only (OQ-04 (a))', () => {
    expect([0, 13].map(sectionOf)).toEqual(['new', 'new'])
    expect([7, 14].map(sectionOf)).toEqual(['preparing', 'preparing'])
    expect([4, 20, 21].map(sectionOf)).toEqual(['ready', 'ready', 'ready'])
    expect([3, 8, 9, 18, 19, 22, 23, 24, 25, 26].map(sectionOf).every((section) => section === 'with_driver')).toBe(true)
    expect(HISTORY_STATUSES.map(sectionOf).every((section) => section === 'history')).toBe(true)
    expect(sectionOf(99)).toBeNull()
    expect(sectionOf(undefined)).toBeNull()
  })

  it('the controller is configured with the open orders and every closed status', () => {
    expect(ORDER_GROUP_STATUS.active).toEqual(ACTIVE_STATUSES)
    expect(ORDER_GROUP_STATUS.completed).toEqual(HISTORY_STATUSES)
    expect(ORDER_GROUP_STATUS.cancelled).toEqual([])
    expect(slotOf(4)).toBe('active')
    expect(slotOf(17)).toBe('completed')
  })
})

describe('flattenOrders', () => {
  it('flattens the controller\'s nested groups and drops repeats', () => {
    const a = makeOrder({ id: 1, cart_group_id: 'g' })
    const b = makeOrder({ id: 2, cart_group_id: 'g' })
    const c = makeOrder({ id: 3 })
    expect(flattenOrders([[['g', [a, b]]], c, a]).map((order) => order.id)).toEqual([1, 2, 3])
    expect(flattenOrders(null)).toEqual([])
  })
})

describe('buildRows', () => {
  it('keeps single orders and joins the orders of one cart group in one section', () => {
    const rows = buildRows([
      makeOrder({ id: 5, cart_group_id: 'g', status: 0 }),
      makeOrder({ id: 4 }),
      makeOrder({ id: 3, cart_group_id: 'g', status: 0 }),
      makeOrder({ id: 2, cart_group_id: 'h', status: 0 })
    ])
    expect(rows.map((row) => row.key)).toEqual(['g:g:new', 'o:4', 'o:2'])
    expect(rows[0].orders.map((order) => order.id)).toEqual([5, 3])
    expect(rows[0].groupId).toBe('g')
    // A group of one is a plain order.
    expect(rows[2].groupId).toBeUndefined()
  })

  it('splits a cart group whose orders are in different sections', () => {
    const rows = buildRows([makeOrder({ id: 2, cart_group_id: 'g', status: 7 }), makeOrder({ id: 1, cart_group_id: 'g', status: 4 })])
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.groupId === undefined)).toBe(true)
  })
})

describe('splitOrders', () => {
  it('splits the open orders into New and the three stages and counts orders', () => {
    const split = splitOrders([0, 13, 7, 14, 4, 21, 23, 3].map((status, index) => orderForStatus(status, 100 + index)))
    expect(split.counts).toEqual({ new: 2, preparing: 2, ready: 2, withDriver: 2, active: 8 })
    expect(split.newOrders.flatMap((row) => row.orders.map((order) => order.status))).toEqual([0, 13])
    expect(split.withDriver.flatMap((row) => row.orders.map((order) => order.status))).toEqual([23, 3])
  })

  it('counts the orders of a group, not its rows', () => {
    const split = splitOrders([makeOrder({ id: 2, cart_group_id: 'g' }), makeOrder({ id: 1, cart_group_id: 'g' })])
    expect(split.newOrders).toHaveLength(1)
    expect(split.counts.new).toBe(2)
  })

  it('leaves out an order of a closed or unknown status', () => {
    expect(splitOrders([orderForStatus(1), orderForStatus(2), orderForStatus(99)]).counts.active).toBe(0)
  })
})

describe('groupByDay', () => {
  it('groups by the day the caller gives, in the order of the list', () => {
    const orders = [makeOrder({ id: 3, day: 'b' }), makeOrder({ id: 2, day: 'b' }), makeOrder({ id: 1, day: 'a' })]
    const days = groupByDay(orders, (order) => order.day, (day) => `Day ${day}`)
    expect(days.map((day) => day.label)).toEqual(['Day b', 'Day a'])
    expect(days[0].orders.flatMap((row) => row.orders.map((order) => order.id))).toEqual([3, 2])
  })
})
