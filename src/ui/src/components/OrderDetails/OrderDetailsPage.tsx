import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { ScrollView, View } from 'react-native'
import Clipboard from '@react-native-clipboard/clipboard'
import { useTheme } from 'styled-components/native'

import { useFormats } from '@/hooks/useFormats'
import { usePageSections } from '@/theme/sections'
import { themeVisible } from '@/theme/helpers'
import { detailsStyles } from './styles'
import { isManualDriverAssignmentEnabled } from './isManualDriverAssignmentEnabled'
import {
  GUARDED_STEPS, STEP_STATUS, barSteps, isDeliveryOrder, isEndedOrder, isReservationOrder, markReadyText, orderStage, statusLabel,
  type BarStepKey, type OrderStage
} from './orderStages'
import { statusMoments } from './orderTimes'
import { buildOrderCopyText } from './copyText'
import { orderCommentText, orderNumberText } from './orderData'
import { isCustomerContactHidden } from '../../utils/contactVisibility'
import { OrderHeader } from './OrderHeader'
import { StatusRow } from './StatusRow'
import { CustomerCard, DriverCard, HandoffCard } from './PartyCards'
import { ProductsCard } from './ProductsCard'
import { PaymentCard } from './PaymentCard'
import { hasBill } from './OrderBill'
import { MoreDetails } from './MoreDetails'
import { NoteNotice, PrepTimeCard, ReviewCard, TimelineCard } from './StageCards'
import { OrderDetailsSkeleton } from './OrderDetailsSkeleton'
import { useChecklist } from './useChecklist'
import { useUnreadMessagesOfOrder } from './useUnreadMessages'
import { useOfflineActions } from '../../context/OfflineActions'
import { useOnReconnect } from '../../../../context/SocketReconnectContext'
import { changedOrdersFromAnswer, ORDER_CHANGED_EVENT } from '../OrdersOption/orderChanges'
import { canAssignDriver, canReviewCustomer, hasMapCoordinates } from '../OrderActions/rules'
import { useOrderActions } from '../OrderActions/useOrderActions'
import { Icon, OBottomBar, OButton, ONotice, useConfirm } from '../shared'
import type { BottomBarAction } from '../shared/OBottomBar'

import {
  ToastType, useConfig, useEvent, useLanguage, useSession, useToast, useUtils,
  OrderDetails as OrderDetailsController
} from '@components'

export type OrderDetailsPresentation = 'screen' | 'panel'

export interface OrderDetailsPageProps {
  /** `screen`: a stack screen with its own back arrow. `panel`: the tablet board's right-hand panel (its arrow calls `onClose`). */
  presentation?: OrderDetailsPresentation
  orderId?: number | string
  /** The list's order: painted at once, the controller does not fetch it again. */
  order?: any
  navigation?: any
  isFromRoot?: boolean
  isFromCheckout?: boolean
  onClose?: () => void
}

/** What the bar says when a step fails (its own text, with the same key and English). */
const FAILED_TEXT: Record<BarStepKey, [string, string]> = {
  accept: ['COULDNT_UPDATE_ORDER', "Couldn't update the order"],
  reject: ['COULDNT_UPDATE_ORDER', "Couldn't update the order"],
  ready: ['COULDNT_MARK_READY', "Couldn't mark the order as ready"],
  picked_up: ['COULDNT_MARK_PICKED_UP', "Couldn't mark the order as picked up"],
  not_picked_up: ['COULDNT_MARK_NOT_PICKED_UP', "Couldn't mark the order as not picked up"],
  arrived: ['COULDNT_MARK_ARRIVED', "Couldn't mark the customer as arrived"],
  not_arrived: ['COULDNT_MARK_NOT_ARRIVED', "Couldn't mark the customer as not arrived"],
  print: ['COULDNT_UPDATE_ORDER', "Couldn't update the order"]
}

/** The sections of the page in the order each stage draws them (the theme only hides; the stage orders). */
const SECTION_ORDER: Record<OrderStage, string[]> = {
  new: ['status', 'customer', 'note', 'products', 'bill', 'more_details'],
  scheduled: ['status', 'customer', 'note', 'products', 'bill', 'more_details'],
  preparing: ['status', 'prep_time', 'driver', 'customer', 'note', 'products', 'bill', 'more_details'],
  ready_handoff: ['status', 'handoff', 'customer', 'note', 'products', 'bill', 'more_details'],
  with_driver: ['status', 'driver', 'timeline', 'customer', 'note', 'products', 'bill', 'more_details'],
  done: ['status', 'review', 'customer', 'note', 'products', 'bill', 'timeline', 'more_details'],
  closed: ['status', 'review', 'customer', 'note', 'products', 'bill', 'timeline', 'more_details']
}

export const OrderDetailsUI = (props: any) => {
  const {
    navigation, onClose, getOrder, clearError, handleChangeOrderStatus: changeOrderStatus, handleAssignDriver: assignDriver, messages, messagesReadList,
    showReservationAlert, setShowReservationAlert, regressionRequest, clearRegressionRequest
  } = props
  const { order, loading, error } = props.order
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ configs }] = useConfig()
  const [{ user }] = useSession()
  const [{ parsePrice }] = useUtils()
  const { time, dateTime } = useFormats()
  const [, { showToast }] = useToast()
  const [events] = useEvent() as any
  const actions = useOrderActions()
  const confirm = useConfirm()
  const [{ isNetConnected, canSaveChangesOffline }, { applyOffAction, registerOffOrder }] = useOfflineActions()
  const { isVisible } = usePageSections('order_details')
  const styles = useMemo(() => detailsStyles(theme), [theme])

  const hasOrder = !!order && Object.keys(order).length > 0

  /**
   * The page's own controller does not reach the lists (or the board behind the tablet's panel): every change it makes
   * and the server answers is told to them with `ORDER_CHANGED_EVENT`, once, with the order as answered. Every way to
   * change (the bar, the sheets, the regression retry) goes through these two. A failed change (`null`, an error) and a
   * queued one (offline: nothing was answered) tell nothing.
   */
  const handleChangeOrderStatus = useCallback(async (...args: any[]) => {
    const [status, body, options] = args
    const answer = await changeOrderStatus?.(...args)
    if (!options?.dataToSave && answer && typeof answer === 'object' && !answer.error) {
      const wanted = Number(body?.status ?? status)
      changedOrdersFromAnswer([{ ...answer }], [answer.id ?? order?.id], Number.isFinite(wanted) ? wanted : undefined)
        .forEach((changed) => events?.emit?.(ORDER_CHANGED_EVENT, changed))
    }
    return answer
  }, [changeOrderStatus, events, order?.id])

  /** The controller answers a driver change with nothing: it is a success when the order it updated now has that driver. */
  const handleAssignDriver = useCallback(async (driverId: number | null) => {
    const target = order
    const before = target?.driver_id ?? null
    const answer = await assignDriver?.(driverId)
    const done = !!target && before !== driverId && (target.driver_id ?? null) === driverId
    if (done) {
      const { id, status, driver_id: driverIdNow, driver } = target
      events?.emit?.(ORDER_CHANGED_EVENT, { id, status, driver_id: driverIdNow, driver })
    }
    return answer
  }, [assignDriver, events, order])
  const stage = orderStage(order)
  const hideContact = isCustomerContactHidden(configs)

  // The step the bar last ran, and the error the controller had before it ran: an error the screen shows is a new one.
  const lastStep = useRef<BarStepKey | null>(null)
  const errorBefore = useRef<any>(null)
  const supportsClear = typeof clearError === 'function'

  const clockOn = themeVisible(theme, 'confirmation.order.countdown')

  const checklistOn = stage === 'preparing' && themeVisible(theme, 'confirmation.order.checklist')
  const checklist = useChecklist(order?.id, checklistOn)

  const readIds = messagesReadList?.map((message: any) => message?.order_message_id)
  const visibleMessages = messagesReadList?.length > 0
    ? messages?.messages?.filter((message: any) => !readIds?.includes(message?.id))
    : messages?.messages
  const unread = useUnreadMessagesOfOrder(order?.id, visibleMessages, user?.id)

  const canMessage = themeVisible(theme, 'confirmation.order.messages') && !isEndedOrder(order) && !hideContact

  // The controller says a reservation was accepted: the page shows it as a notice, never as a system alert.
  useEffect(() => {
    if (showReservationAlert) setShowReservationAlert?.(false)
  }, [showReservationAlert, setShowReservationAlert])

  // The API refused a status regression: ask for the reason in the sheet.
  useEffect(() => {
    if (!regressionRequest || !hasOrder) return
    actions.openForceStatus(order, { changeStatus: handleChangeOrderStatus, pendingStatusBody: regressionRequest.body })
    clearRegressionRequest?.()
  }, [regressionRequest, hasOrder, order, actions, handleChangeOrderStatus, clearRegressionRequest])

  const goBack = () => {
    if (onClose) onClose()
    else if (navigation?.canGoBack?.()) navigation.goBack()
    else navigation?.navigate?.('BottomTab', { screen: 'Orders' })
  }

  const openMessages = () => {
    navigation?.navigate?.('OrderMessage', { orderId: order?.id })
    props.readMessages?.()
    props.loadMessages?.()
  }

  const openTicket = () => navigation?.navigate?.('TicketPreview', { order, orderStatus: statusLabel(order?.status, t, order) })

  const copy = () => {
    if (loading || !Array.isArray(order?.products)) return
    Clipboard.setString(buildOrderCopyText({ order, t, parsePrice, hideCustomerContact: hideContact, configs }))
    showToast(ToastType.Info, t('COPIED', 'Copied'), 1000)
  }

  const level = user?.level
  const canAssign = hasOrder && canAssignDriver(order, configs, level)
  const assignOptions = { drivers: props.drivers?.drivers, handleAssignDriver }
  const canAdjust = Number(order?.prepared_in) > 0
  const driverLocation = props.driverLocation

  const forget = () => { lastStep.current = null; errorBefore.current = error }

  const openMore = () => actions.openMore(order, {
    onPrint: themeVisible(theme, 'confirmation.order.print') ? openTicket : undefined,
    onShare: openTicket,
    onCopy: themeVisible(theme, 'confirmation.order.copy') ? copy : undefined,
    onMessage: openMessages,
    prepTime: { changeStatus: handleChangeOrderStatus },
    assignDriver: assignOptions,
    driverLocation
  })

  /** One step of the bar: the status the stage allows, queued when the device is offline and the project saves offline. */
  const runStep = useCallback(async (step: BarStepKey) => {
    const status = STEP_STATUS[step]
    if (status === undefined || !handleChangeOrderStatus) return
    lastStep.current = step
    errorBefore.current = error
    if (!isNetConnected && canSaveChangesOffline !== false) {
      const body = { status, id: order?.id }
      applyOffAction({ event: 'evt_off_change_order_status', data: { orderId: order?.id, body } })
      const updated = await handleChangeOrderStatus(status, body, { dataToSave: { ...body, unsync: true } })
      await registerOffOrder(updated)
      return
    }
    await handleChangeOrderStatus(status)
  }, [handleChangeOrderStatus, isNetConnected, canSaveChangesOffline, applyOffAction, registerOffOrder, order?.id, error])

  const onStep = (step: BarStepKey) => {
    switch (step) {
      case 'accept':
        forget()
        // From the order's own screen (or the board's panel): the owner is already on it, so no notice follows.
        return actions.openAccept(order, { changeStatus: handleChangeOrderStatus, from: 'details' })
      case 'reject':
        forget()
        return actions.openReject(order, { changeStatus: handleChangeOrderStatus })
      case 'print':
        return openTicket()
      default:
        if (GUARDED_STEPS.includes(step)) {
          const name = step === 'not_picked_up' ? t('NOT_PICKED_UP', 'Not picked up') : t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived')
          confirm({
            message: t('CANT_BE_UNDONE', "This can't be undone."),
            acceptText: name,
            destructive: true,
            onAccept: () => { runStep(step) }
          })
          return
        }
        runStep(step)
    }
  }

  const retry = () => {
    clearError?.()
    if (lastStep.current) runStep(lastStep.current)
    else getOrder?.()
  }

  // The socket came back: the changes of the gap are lost, so the order is read again (the page and the board's panel alike;
  // the page keeps showing the order while it loads). Not while a request of the page is running (an action, a load), and not offline.
  useOnReconnect(() => {
    if (loading || isNetConnected === false) return
    getOrder?.()
  })

  const buttonOf = (step: BarStepKey): BottomBarAction => {
    const running = loading && lastStep.current === step
    const common = { key: step, onClick: () => onStep(step), disabled: !!loading, loading: running, testID: `bar-${step}` }
    switch (step) {
      case 'reject': return { ...common, slot: 'decline', text: t('REJECT', 'Reject') }
      case 'accept': return { ...common, slot: 'advance', text: t('ACCEPT', 'Accept') }
      case 'ready': return { ...common, slot: 'advance', text: markReadyText(t, order?.delivery_type) }
      case 'not_picked_up': return { ...common, slot: 'decline', text: t('NOT_PICKED_UP', 'Not picked up') }
      case 'picked_up': return { ...common, slot: 'advance', text: t('PICKED_UP', 'Picked up') }
      case 'not_arrived': return { ...common, slot: 'decline', text: t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived') }
      case 'arrived': return { ...common, slot: 'advance', text: t('CUSTOMER_ARRIVED', 'Customer arrived') }
      default: return { ...common, slot: 'secondary', text: t('PRINT_TICKET', 'Print ticket'), icon: <Icon name='print-outline' /> }
    }
  }

  // ---- Without an order: loading, or a load that failed (the bar keeps its back arrow in both) ----
  if (!hasOrder) {
    return (
      <View style={styles.screen} testID='order-details'>
        <OrderHeader onBack={goBack} />
        {error
          ? (
            <View style={styles.centered} testID='order-load-error'>
              <ONotice
                variant='danger'
                title={t('COULDNT_LOAD_ORDER', "Couldn't load the order")}
                action={{ text: t('TRY_AGAIN_SENTENCE', 'Try again'), onPress: () => { clearError?.(); getOrder?.() }, testID: 'order-load-retry' }}
              >
                {(Array.isArray(error) ? error[0] : error) || t('NETWORK_ERROR', 'Network Error')}
              </ONotice>
              <OButton text={t('GO_TO_MY_ORDERS', 'Go to my orders')} appearance='outline' color='neutral' onClick={() => navigation?.navigate?.('BottomTab', { screen: 'Orders' })} testID='order-go-orders' />
            </View>
          )
          : <ScrollView style={styles.scroll}><OrderDetailsSkeleton /></ScrollView>}
      </View>
    )
  }

  // ---- The page ----
  const moments = statusMoments(order)
  const store = order?.business?.name
  const timeText = (at: number | null) => (at === null ? null : time(at))
  const subtitleTime = (() => {
    const placed = timeText(moments.createdAt)
    const make = (key: string, fallback: string, at: number | null) => timeText(at) && t(key, fallback).replace('_time_', timeText(at) as string)
    switch (stage) {
      case 'preparing': return make('ORDER_TIME_ACCEPTED', 'accepted _time_', moments.at(7)) || (placed && make('ORDER_TIME_PLACED', 'placed _time_', moments.createdAt))
      case 'ready_handoff': return make('ORDER_TIME_READY', 'ready _time_', moments.at(4)) || (placed && make('ORDER_TIME_PLACED', 'placed _time_', moments.createdAt))
      case 'with_driver':
        return make('ORDER_TIME_PICKED_UP', 'picked up _time_', moments.at(9, true)) ||
          make('ORDER_TIME_READY', 'ready _time_', moments.at(4, true)) ||
          make('ORDER_TIME_ACCEPTED', 'accepted _time_', moments.at(7, true)) ||
          (placed && make('ORDER_TIME_PLACED', 'placed _time_', moments.createdAt))
      case 'done':
        return make('ORDER_TIME_DELIVERED', 'delivered _time_', moments.firstOf([1, 11])) ||
          make('ORDER_TIME_PICKED_UP', 'picked up _time_', moments.at(15)) ||
          (placed && make('ORDER_TIME_PLACED', 'placed _time_', moments.createdAt))
      default: return placed && make('ORDER_TIME_PLACED', 'placed _time_', moments.createdAt)
    }
  })()
  // The store's name gives way to the time when the line is short; without a store the time is the whole line.
  const subtitle = store || subtitleTime || undefined
  const subtitleEnd = store && subtitleTime ? subtitleTime : undefined
  const title = orderNumberText(order, t, configs)

  const showError = !!error && lastStep.current !== null && (supportsClear || error !== errorBefore.current)
  const errorMessage = Array.isArray(error) ? error[0] : error
  const failedText = FAILED_TEXT[lastStep.current ?? 'accept']

  const delivery = isDeliveryOrder(order)
  const reservation = isReservationOrder(order)
  const driverVisible = stage === 'with_driver' || (stage === 'preparing' && delivery && (canAssign || !!order?.driver))
  const trackable = stage === 'with_driver' && !!order?.driver && hasMapCoordinates(order) && themeVisible(theme, 'confirmation.order.directions')
  // The mini map: a delivery in its last stage, when the order has a position to draw (and the theme shows it).
  const miniMapShown = stage === 'with_driver' && hasMapCoordinates(order) && themeVisible(theme, 'map.mini_map')
  const comment = orderCommentText(order)
  const readyAt = moments.at(4)
  const handoffShown = stage === 'ready_handoff' && isVisible('handoff')

  // An address opens the app's own map, the one of "View on map" (it offers "Open in Maps" for the trip); with no place to draw
  // (no coordinates, or the theme hides directions) the address is plain text.
  const mapShown = hasMapCoordinates(order) && themeVisible(theme, 'confirmation.order.directions')
  const openMap = mapShown ? () => actions.openMap(order, { driverLocation }) : undefined

  const customer = (
    <CustomerCard order={order} hideContact={hideContact} canMessage={canMessage} unread={unread} onMessage={openMessages} onOpenMap={openMap} />
  )

  const nodes: Record<string, React.ReactNode> = {
    status: (
      <>
        <StatusRow order={order} stage={stage} />
        {showError && (
          <ONotice
            variant='danger'
            title={t(failedText[0], failedText[1])}
            action={{ text: t('TRY_AGAIN_SENTENCE', 'Try again'), onPress: retry, testID: 'order-error-retry' }}
            testID='order-error'
          >
            {errorMessage || t('CHECK_CONNECTION_NOTHING_CHANGED', 'Check your connection and try again. Nothing was changed.')}
          </ONotice>
        )}
        {stage === 'preparing' && reservation && !!order?.reservation && (
          <ONotice variant='info' title={t('RESERVATION', 'Reservation')} testID='reservation-notice'>
            {`${t('SCHEDULED_FOR', 'Scheduled for')}: ${dateTime(order.reservation.reserve_date, { utc: false })}`}
          </ONotice>
        )}
        {stage === 'closed' && !!order?.reject_reason && (
          <ONotice variant='danger' title={t('REJECTION_REASON', 'Reason')} testID='closed-reason'>{String(order.reject_reason)}</ONotice>
        )}
      </>
    ),
    prep_time: stage === 'preparing' && (
      <PrepTimeCard
        order={order}
        showCountdown={clockOn}
        canAdjust={canAdjust}
        onAdjust={() => { forget(); actions.openPrepTime(order, { changeStatus: handleChangeOrderStatus }) }}
      />
    ),
    handoff: stage === 'ready_handoff' && (
      <>
        <HandoffCard order={order} hideContact={hideContact} canMessage={canMessage} unread={unread} onMessage={openMessages} />
        {readyAt !== null && (
          <ONotice variant='info' testID='handoff-notice'>
            {t('CUSTOMER_TOLD_READY_AT', 'We told the customer the order is ready at _time_.').replace('_time_', time(readyAt))}
          </ONotice>
        )}
      </>
    ),
    driver: driverVisible && (
      <DriverCard
        order={order}
        canAssign={canAssign}
        onAssign={() => { forget(); actions.openAssignDriver(order, assignOptions) }}
        onTrack={trackable ? () => actions.openMap(order, { driverLocation }) : undefined}
        onMessage={stage === 'with_driver' && canMessage ? openMessages : undefined}
        miniMap={miniMapShown}
        driverLocation={driverLocation}
      />
    ),
    customer: stage === 'ready_handoff' && handoffShown ? null : customer,
    note: !!comment && <NoteNotice comment={comment} />,
    products: (
      <ProductsCard
        order={order}
        folded={stage === 'with_driver'}
        checklist={checklistOn ? { done: checklist.done, toggle: checklist.toggle } : undefined}
      />
    ),
    bill: hasBill(order) && <PaymentCard order={order} folded={stage === 'preparing' || stage === 'with_driver'} />,
    timeline: <TimelineCard order={order} folded={stage === 'done' || stage === 'closed'} />,
    review: (stage === 'done' || stage === 'closed') && canReviewCustomer(order) && (
      <ReviewCard onReview={(qualification?: number) => actions.openReview(order, qualification ? { qualification } : undefined)} />
    ),
    more_details: <MoreDetails order={order} hideContact={hideContact} onOpenMap={openMap} />
  }

  const sections = SECTION_ORDER[stage]
    .filter((key) => isVisible(key))
    .map((key) => {
      const node = nodes[key]
      return node ? <React.Fragment key={key}>{node}</React.Fragment> : null
    })

  const steps = barSteps(order, { canPrint: themeVisible(theme, 'confirmation.order.print') })
  const showBar = isVisible('actions') && steps.length > 0
  // The mockups' bar is 1 : 2 (the secondary beside the main one), "Not picked up" with "Picked up" too: the bar's buttons
  // fit their text now. Only "Customer not arrived" beside "Customer arrived" stays 1 : 1 (both labels are as long).
  const barActions = steps.map(buttonOf).map((action) => steps.includes('not_arrived') ? { ...action, flex: 1 } : action)

  return (
    <View style={styles.screen} testID='order-details'>
      {isVisible('header') && (
        <OrderHeader
          title={title}
          subtitle={subtitle}
          subtitleEnd={subtitleEnd}
          onBack={goBack}
          onPrint={themeVisible(theme, 'confirmation.order.print') ? openTicket : undefined}
          onMore={openMore}
        />
      )}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
        {sections}
        {stage === 'with_driver' && (
          <ONotice variant='info' testID='driver-notice'>
            {t('DRIVER_COMPLETES_ORDER', "The driver completes this order. We'll let you know when it's delivered.")}
          </ONotice>
        )}
      </ScrollView>
      {showBar && <OBottomBar actions={barActions} testID='order-bar' />}
    </View>
  )
}

/**
 * The order's details: one page for every stage of an order (new, preparing, ready for pickup, with a driver,
 * done, closed), as a stack screen or as the tablet board's right-hand panel. It wraps the details controller
 * (clearing its error on every action, so a failed step is a notice on the page and never replaces it).
 */
export const OrderDetailsPage = (props: OrderDetailsPageProps) => {
  const [{ configs }] = useConfig()
  const [{ user }] = useSession()
  const orderId = props.orderId ?? props.order?.id
  // The controller writes the server's answer into the order it is given (`Object.assign(order, result)`). The list's own
  // object must never be that one: its card would hold the new status before the list knew, find nothing changed and keep
  // the old card (the filtered list that stayed stale). The page works on a copy and tells the lists with `ORDER_CHANGED_EVENT`.
  const order = useMemo(() => (props.order && typeof props.order === 'object' ? { ...props.order } : props.order), [props.order])
  return (
    <OrderDetailsController
      key={String(orderId)}
      {...props}
      order={order}
      orderId={orderId}
      driverAndBusinessId
      isFetchDrivers={isManualDriverAssignmentEnabled(configs, user?.level)}
      isBusiness
      isDisabledOrdersRoom
      isBusinessApp
      clearErrorOnAction
      actions={{ accept: 'acceptByBusiness', reject: 'rejectByBusiness', forceStatus: 'forceStatus' }}
      appTitle={{ key: 'BUSINESS_APP', text: 'Business App' }}
      UIComponent={OrderDetailsUI}
    />
  )
}

/** The name the orders list and the board used before the page took the panel too. */
export const OrderDetailsBusiness = OrderDetailsPage
