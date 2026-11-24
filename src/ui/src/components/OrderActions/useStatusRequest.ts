import { useCallback, useMemo, useRef, useState } from 'react'

import { useLanguage } from '@components'
import { useOfflineActions } from '../../context/OfflineActions'
import { apiErrorText } from './rules'
import { updateGroupStatus } from './statusAnswer'
import { markBusy } from './store'
import type { ActionRequest } from './types'

/** What a sheet's request did: every order changed (`done`), or why not. */
export interface StatusOutcome {
  done: boolean
  error?: string
  /** The change was queued for when the connection returns. */
  queued?: boolean
  /** The updated order, when the request answers with one (the details' request). */
  updated?: any
}

/**
 * The status change of a sheet: the orders it speaks for (one, or a group), the request the screen gave it, the
 * offline queue and what a failure says.
 *
 * - Online, with the list's request (`handleChangeOrderStatus`) one call carries the ids; success means every order
 *   changed. A failure keeps the sheet open with the API's message (or how many orders did not change), and the next
 *   try sends only the orders that did not change.
 * - With the details' request (`changeStatus`) the order changed when the answer is the updated order; `null` or
 *   `{ error }` is a failure, and an exception's message is the reason.
 * - Offline (`isNetConnected === false && canSaveChangesOffline !== false`) the change is queued as `evt_off_change_order_status`
 *   and the order is registered locally (`registerOffOrder`), as the old accept flow did.
 */
export const useStatusRequest = (request: ActionRequest) => {
  const [, t] = useLanguage()
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions() as any
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)
  // The orders that did not change yet: none until an attempt fails.
  const pendingRef = useRef<number[] | null>(null)

  const { order, opts } = request
  const orders: any[] = useMemo(() => (opts?.orders?.length ? opts.orders : [order]), [opts?.orders, order])
  const isGroup = orders.length > 1
  const latest = useRef({ opts, orders })
  latest.current = { opts, orders }

  const send = useCallback(async (status: number | undefined, body: any, { queueOffline = true }: { queueOffline?: boolean } = {}): Promise<StatusOutcome> => {
    if (submittingRef.current) return { done: false }
    const { opts: current, orders: all } = latest.current
    submittingRef.current = true
    markBusy(true)
    setSubmitting(true)
    setError(null)
    const fail = (text: string): StatusOutcome => {
      setError(text)
      return { done: false, error: text }
    }
    try {
      const ids: number[] = pendingRef.current ?? all.map((item) => item.id)
      const targets = all.filter((item) => ids.includes(item.id))

      // Offline: queue every order's change and register its new state.
      let offlineUpdated: any
      // Offline is a connection known to be down: while the state is still unknown (`null`, NetInfo's first reading) the change
      // is sent, never queued (a reject queued on an unknown state closed the sheet and rejected nothing).
      if (queueOffline && isNetConnected === false && canSaveChangesOffline !== false) {
        for (const target of targets) {
          const queuedBody = { ...body, id: target.id }
          await applyOffAction?.({ event: 'evt_off_change_order_status', data: { orderId: target.id, body: queuedBody } })
          if (current.changeStatus && !isGroupOf(all)) {
            const updated = await current.changeStatus(status, queuedBody, { dataToSave: { ...queuedBody, unsync: true } })
            await registerOffOrder?.(updated)
            offlineUpdated = updated
          } else {
            await registerOffOrder?.({ ...target, ...body, unsync: true, oldStatus: target.status })
          }
        }
        pendingRef.current = null
        return { done: true, queued: true, updated: offlineUpdated }
      }

      if (current.handleChangeOrderStatus) {
        const outcome = await updateGroupStatus({ ids, handleChangeOrderStatus: current.handleChangeOrderStatus, status, body: { ...body } })
        if (!outcome) return fail(t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'))
        if (outcome.succeeded) {
          pendingRef.current = null
          return { done: true }
        }
        const { failures } = outcome
        pendingRef.current = failures.map((failure) => failure.id)
        const reason = failures.find((failure) => failure.message != null)?.message
        const why = apiErrorText(reason, t)
        const someChanged = failures.length < ids.length
        return fail(someChanged
          ? [t('ORDERS_NOT_CHANGED', 'Orders that did not change: _count_').replace('_count_', String(failures.length)), reason != null && why].filter(Boolean).join(' · ')
          : why)
      }

      if (current.changeStatus) {
        let result: any
        try {
          result = await current.changeStatus(status, { ...body, id: targets[0]?.id ?? all[0]?.id })
        } catch (thrown: any) {
          return fail(apiErrorText(thrown?.message ?? thrown, t))
        }
        const failed = !result || (typeof result === 'object' && result.error)
        if (failed) return fail(apiErrorText(result?.error ?? result?.result, t))
        return { done: true, updated: result }
      }
      return fail(t('THE_CHANGE_WAS_NOT_SAVED', 'The change was not saved. Try again.'))
    } finally {
      submittingRef.current = false
      markBusy(false)
      setSubmitting(false)
    }
  }, [isNetConnected, canSaveChangesOffline, applyOffAction, registerOffOrder, t])

  return { send, submitting, error, setError, orders, isGroup }
}

const isGroupOf = (orders: any[]) => orders.length > 1
