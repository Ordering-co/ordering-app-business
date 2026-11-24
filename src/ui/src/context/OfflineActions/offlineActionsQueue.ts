/** The one queued event: a status change of an order (accept, reject, force status, mark ready, picked up, not picked up). */
export const OFFLINE_STATUS_EVENT = 'evt_off_change_order_status'

export function parseStoredOfflineActions (stored: unknown) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return {}
  }

  return stored as Record<string, any[]>
}

/**
 * What a queued order is sent on replay: **one** body, the queued bodies merged in the order they were made, so the
 * last status wins and what an earlier step carried (the preparation time of an accept) is not lost. The earlier
 * statuses are never sent, and never as a chat message to the customer.
 */
export function mergeQueuedBodies (actions: any[] | undefined): Record<string, any> {
  const merged: Record<string, any> = {}
  for (const action of actions ?? []) {
    const body = action?.data?.body
    if (body && typeof body === 'object') Object.assign(merged, body)
  }
  return merged
}

/** A change to queue: what `applyOffAction` takes. */
export const statusChange = (orderId: number | string, body: Record<string, any>) => ({
  event: OFFLINE_STATUS_EVENT,
  data: { orderId, body }
})

export function getOfflineActionsAfterReplay ({
  queued,
  succeededOrderIds
}: {
  queued: Record<string, unknown>
  succeededOrderIds: Array<string | number>
}) {
  const remaining = { ...queued }

  for (const orderId of succeededOrderIds) {
    delete remaining[String(orderId)]
  }

  return {
    remaining,
    shouldClearAll: Object.keys(remaining).length === 0
  }
}

/** How the lists of the orders screen are cached after a sync: the open orders and History, by id, newest first. */
export const upsertCachedOrder = (list: any[] | null | undefined, order: any, keep: boolean): any[] => {
  const others = (list ?? []).filter((item) => item?.id !== order?.id)
  const next = keep ? [...others, order] : others
  return next.sort((a, b) => b.id - a.id)
}
