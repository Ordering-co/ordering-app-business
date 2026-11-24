import React, { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { Keyboard } from 'react-native'

import { useConfig, useLanguage } from '@components'
import { usePrinting } from '@/printing/usePrinting'
import { OBottomPopup, OModal } from '../shared'
import { GoogleMap } from '../GoogleMap'
import { ReviewCustomer } from '../ReviewCustomer'
import { AcceptSheet } from './AcceptSheet'
import { AssignDriverSheet } from './AssignDriverSheet'
import { ForceStatusSheet } from './ForceStatusSheet'
import { MoreSheet } from './MoreSheet'
import { PrepTimeSheet } from './PrepTimeSheet'
import { RejectSheet } from './RejectSheet'
import { orderNumberOf } from './rules'
import { orderNumberText } from '../OrderDetails/orderData'
import { closeRequest, getRequest, isBusy, subscribe } from './store'
import type { ActionRequest } from './types'

const FULL_SCREEN = ['map', 'review']
// The sheets that hold a field the keyboard types into (the reject note, the reason, the preparation time).
const WITH_FIELD = ['reject', 'forceStatus', 'accept', 'prepTime']

/**
 * The one place the order's action sheets, the map and the review are drawn. The shell mounts it once, inside the providers,
 * so a sheet opens the same way over the orders list, the order's details and the tablet panel (`useOrderActions`).
 * One window at a time: the sheets share one bottom popup (a card in the middle on a tablet, by the theme), so a sheet
 * that leads to another (More, then Adjust time) changes its content in place; the map and the review are a full-screen
 * modal. After an accepted order it prints the ticket (`usePrinting`: the saved printers, when auto-print is on).
 */
export const OrderActionsHost = () => {
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const printing = usePrinting()
  const request = useSyncExternalStore(subscribe, getRequest, getRequest)
  // What was open, kept while the window fades out.
  const lastRef = useRef<ActionRequest | null>(null)
  if (request) lastRef.current = request
  const shown = request ?? lastRef.current

  const printerNames = useMemo(() => (printing.autoTargets ?? [])
    .map((printer: any) => printer?.nickname || printer?.model)
    .filter(Boolean)
    .join(', '), [printing.autoTargets])

  const onAccepted = useCallback((order: any) => {
    Promise.resolve(printing.printOrder(order)).catch(() => {})
  }, [printing])

  const finish = useCallback((_orders?: any) => {
    const done = getRequest()
    closeRequest()
    done?.opts?.onDone?.(Array.isArray(_orders) ? _orders : _orders ? [_orders] : [])
  }, [])

  // The dimmed page and the close button close a sheet, but not one whose request is on its way, and not on the touch that
  // only meant to put the keyboard away (the sheet moves down as it goes: that touch landed on the page and closed the
  // sheet with a typed note still in it).
  const dismissSheet = useCallback(() => {
    if (isBusy()) return
    const kind = getRequest()?.kind
    if (kind && WITH_FIELD.includes(kind) && Keyboard.isVisible()) {
      Keyboard.dismiss()
      return
    }
    closeRequest()
  }, [])

  const isFull = !!request && FULL_SCREEN.includes(request.kind)
  const isSheet = !!request && !FULL_SCREEN.includes(request.kind)
  const sheetKind = shown && !FULL_SCREEN.includes(shown.kind) ? shown : null

  const title = (current: ActionRequest): string => {
    const number = orderNumberOf(current.order, configs)
    const count = current.opts?.orders?.length ?? 0
    switch (current.kind) {
      case 'accept':
        return count > 1
          ? t('ACCEPT_ORDERS_COUNT', 'Accept _count_ orders').replace('_count_', String(count))
          : t('ACCEPT_ORDER_NUMBER', 'Accept order #_number_').replace('_number_', number)
      case 'reject':
        return count > 1
          ? t('REJECT_ORDERS_COUNT', 'Reject _count_ orders').replace('_count_', String(count))
          : t('REJECT_ORDER_NUMBER', 'Reject order #_number_').replace('_number_', number)
      case 'prepTime': return t('ADJUST_PREPARATION_TIME', 'Adjust preparation time')
      case 'assignDriver': return t('ASSIGN_DRIVER', 'Assign driver')
      case 'forceStatus': return t('REASON_REQUIRED', 'Reason required')
      default: return orderNumberText(current.order, t, configs)
    }
  }

  const sheet = (current: ActionRequest) => {
    switch (current.kind) {
      case 'accept': return <AcceptSheet key={current.key} request={current} onFinish={finish} printerNames={printerNames} onAccepted={onAccepted} />
      case 'reject': return <RejectSheet key={current.key} request={current} onFinish={finish} />
      case 'forceStatus': return <ForceStatusSheet key={current.key} request={current} onFinish={finish} />
      case 'prepTime': return <PrepTimeSheet key={current.key} request={current} onFinish={finish} />
      case 'assignDriver': return <AssignDriverSheet key={current.key} request={current} onFinish={finish} />
      default: return <MoreSheet key={current.key} request={current} />
    }
  }

  return (
    <>
      {printing.host}
      {sheetKind && (
        <OBottomPopup
          open={isSheet}
          onClose={dismissSheet}
          title={title(sheetKind)}
          closeIcon
          padded
          keyboardAware={WITH_FIELD.includes(sheetKind.kind)}
          testID='order-sheet'
        >
          {sheet(sheetKind)}
        </OBottomPopup>
      )}
      {shown && FULL_SCREEN.includes(shown.kind) && (
        <OModal open={isFull} onClose={closeRequest} entireModal customClose fullWidth={shown.kind === 'map'}>
          {shown.kind === 'map' ? (
            <GoogleMap order={shown.order} driverLocation={shown.opts?.driverLocation} onClose={closeRequest} />
          ) : (
            <ReviewCustomer
              order={shown.order}
              closeModal={closeRequest}
              initialQualification={shown.opts?.qualification}
              onClose={() => { closeRequest(); shown.opts?.onClose?.() }}
              handleCustomCustomerReview={shown.opts?.handleCustomCustomerReview
                ? async (body: any) => {
                  await shown.opts.handleCustomCustomerReview(body)
                  closeRequest()
                }
                : undefined}
            />
          )}
        </OModal>
      )}
    </>
  )
}

export default OrderActionsHost
