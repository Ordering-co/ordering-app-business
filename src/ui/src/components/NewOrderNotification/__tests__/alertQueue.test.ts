import { addAlert, closeAlert, emptyQueue, hasOrder, openAlert, removeOrders, type AlertItem } from '../alertQueue'

const item = (id: number, extra: Partial<AlertItem> = {}): AlertItem => ({ key: `o:${id}`, orderId: id, status: 0, receivedAt: 1000 + id, ...extra })

describe('alertQueue', () => {
  it('gathers the arrivals of a kind into the one open alert', () => {
    let queue = addAlert(emptyQueue, 'order', item(1))
    queue = addAlert(queue, 'order', item(2))
    expect(openAlert(queue)).toMatchObject({ kind: 'order', items: [{ orderId: 1 }, { orderId: 2 }] })
  })

  it('counts the same order arriving twice once, keeping where it first arrived', () => {
    let queue = addAlert(emptyQueue, 'order', item(1, { receivedAt: 10 }))
    queue = addAlert(queue, 'order', item(1, { receivedAt: 99, status: 13 }))
    const open = openAlert(queue)!
    expect(open.items).toHaveLength(1)
    expect(open.items[0]).toMatchObject({ status: 13, receivedAt: 10 })
  })

  it('keeps another kind waiting behind the open one, and opens it when the first is closed', () => {
    let queue = addAlert(emptyQueue, 'order', item(1))
    queue = addAlert(queue, 'message', item(5, { status: undefined }))
    expect(openAlert(queue)?.kind).toBe('order')
    queue = closeAlert(queue)
    expect(openAlert(queue)).toMatchObject({ kind: 'message', items: [{ orderId: 5 }] })
    expect(openAlert(closeAlert(queue))).toBeNull()
  })

  it('takes orders out, and a kind left with nothing is gone', () => {
    let queue = addAlert(addAlert(emptyQueue, 'order', item(1)), 'order', item(2))
    queue = removeOrders(queue, 'order', [1])
    expect(openAlert(queue)?.items.map((entry) => entry.orderId)).toEqual([2])
    queue = removeOrders(queue, 'order', ['2'])
    expect(openAlert(queue)).toBeNull()
    expect(queue.kinds).toEqual([])
  })

  it('leaves the queue as it was when the order is not in it', () => {
    const queue = addAlert(emptyQueue, 'order', item(1))
    expect(removeOrders(queue, 'order', [9])).toBe(queue)
    expect(removeOrders(queue, 'message', [1])).toBe(queue)
    expect(hasOrder(queue, 'order', 1)).toBe(true)
    expect(hasOrder(queue, 'order', undefined)).toBe(false)
  })
})
