import { useRef, useState } from 'react'

import { useOfflineActions } from '../../context/OfflineActions'
import { statusChange } from '../../context/OfflineActions/offlineActionsQueue'
import { isGroupedOrderStatusInFlight } from './isGroupedOrderStatusInFlight'

interface Params {
  /** The list controller's: `(status, ids, body?, options?)`. */
  handleChangeOrderStatus?: (...args: any[]) => any
  /** The controller's flag: a status change is running. */
  loadingChangeOrder?: boolean
}

/**
 * How the list changes the status of its orders (Mark ready, Picked up, Not picked up, for one order or a group):
 * one request through the controller while online, a queued change while offline (when the server allows it,
 * `allow_save_changes_offline`), and never two at once. When the network is down and the server does not allow
 * queued changes the buttons are not drawn (`unavailable`).
 */
export const useStatusStep = ({ handleChangeOrderStatus, loadingChangeOrder }: Params) => {
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions() as any
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const offline = isNetConnected === false

  const changeStatus = async (orders: any[], status: number) => {
    if (submittingRef.current || !orders.length) return
    if (offline) {
      for (const order of orders) {
        const queued = await applyOffAction?.(statusChange(order.id, { status, id: order.id }))
        if (queued) await registerOffOrder?.({ ...order, oldStatus: order.status, status, unsync: true })
      }
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      await handleChangeOrderStatus?.(status, orders.map((order) => order.id))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return {
    changeStatus,
    busy: isGroupedOrderStatusInFlight({ loadingChangeOrder, submitting }),
    unavailable: offline && canSaveChangesOffline === false
  }
}
