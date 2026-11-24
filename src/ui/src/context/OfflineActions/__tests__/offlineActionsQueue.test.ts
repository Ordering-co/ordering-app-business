import {
  getOfflineActionsAfterReplay,
  mergeQueuedBodies,
  OFFLINE_STATUS_EVENT,
  parseStoredOfflineActions,
  statusChange,
  upsertCachedOrder
} from '../offlineActionsQueue'

describe('parseStoredOfflineActions', () => {
  it('returns an empty object when storage is null', () => {
    expect(parseStoredOfflineActions(null)).toEqual({})
  })

  it('returns an empty object when storage is undefined', () => {
    expect(parseStoredOfflineActions(undefined)).toEqual({})
  })

  it('returns an empty object when storage is an array leftover', () => {
    expect(parseStoredOfflineActions([])).toEqual({})
  })

  it('keeps a keyed queue object', () => {
    const queued = {
      '101': [{ event: 'evt_off_change_order_status', data: { orderId: 101, body: { status: 7 } } }]
    }
    expect(parseStoredOfflineActions(queued)).toEqual(queued)
  })
})

describe('statusChange', () => {
  it('is the one event the queue holds, for any step', () => {
    expect(statusChange(12, { status: 4, id: 12 })).toEqual({ event: OFFLINE_STATUS_EVENT, data: { orderId: 12, body: { status: 4, id: 12 } } })
  })
})

describe('mergeQueuedBodies', () => {
  it('sends one body: the last status wins and an earlier step\'s other data is kept', () => {
    const queue = [
      statusChange(1, { status: 7, prepared_in: 20 }),
      statusChange(1, { status: 4 })
    ]
    expect(mergeQueuedBodies(queue)).toEqual({ status: 4, prepared_in: 20 })
  })

  it('is empty for nothing and ignores an entry without a body', () => {
    expect(mergeQueuedBodies(undefined)).toEqual({})
    expect(mergeQueuedBodies([{ data: {} }, null])).toEqual({})
  })
})

describe('upsertCachedOrder', () => {
  const list = [{ id: 3, status: 7 }, { id: 1, status: 7 }]

  it('replaces the order where it is and keeps the list newest first', () => {
    expect(upsertCachedOrder(list, { id: 1, status: 4 }, true)).toEqual([{ id: 3, status: 7 }, { id: 1, status: 4 }])
  })

  it('takes the order out of the list it left and puts it in the one it joins', () => {
    expect(upsertCachedOrder(list, { id: 3, status: 15 }, false)).toEqual([{ id: 1, status: 7 }])
    expect(upsertCachedOrder(null, { id: 3, status: 15 }, true)).toEqual([{ id: 3, status: 15 }])
    expect(upsertCachedOrder([{ id: 1 }], { id: 9 }, true).map((order) => order.id)).toEqual([9, 1])
  })
})

describe('getOfflineActionsAfterReplay', () => {
  const queued = {
    '101': [{ data: { orderId: 101, body: { status: 7 } } }],
    '202': [{ data: { orderId: 202, body: { status: 12 } } }]
  }

  it('keeps failed order ids so reconnect can retry them', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: [101]
    })).toEqual({
      remaining: {
        '202': queued['202']
      },
      shouldClearAll: false
    })
  })

  it('clears storage only when every queued order succeeded', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: [101, 202]
    })).toEqual({
      remaining: {},
      shouldClearAll: true
    })
  })

  it('keeps the full queue when no replay succeeded', () => {
    expect(getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: []
    })).toEqual({
      remaining: queued,
      shouldClearAll: false
    })
  })
})
