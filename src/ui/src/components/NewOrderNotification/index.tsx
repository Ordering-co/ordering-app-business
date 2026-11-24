import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import {
  NewOrderNotification as NewOrderNotificationController,
  useApi,
  useConfig,
  useEvent,
  useLanguage,
  useSession,
  useUtils
} from '@components'
import dayjs from '@/utils/dayjs'
import { useFormats } from '@/hooks/useFormats'
import { themeMotion, themePart, themeVisible } from '@/theme/helpers'
import { openChatOrderId, openMessagesTab, openOrderDetails, openOrdersTab } from '@/navigators/NavigationRef'
import { Icon, IconTile, ModalCloseButton, OBottomPopup, OButton, ODivider, OLink, OText } from '../shared'
import { useOrderActions } from '../OrderActions/useOrderActions'
import { useAlertSettings, onTestAlert } from '../AlertSettings'
import { orderClock } from '../PreviousOrders/orderTimes'
import { useNow } from '../PreviousOrders/useNow'
import { isCustomerContactHidden } from '../../utils/contactVisibility'
import { changedOrdersFromAnswer, ORDER_CHANGED_EVENT } from '../OrdersOption/orderChanges'
import { newOrderAlertStyles } from './styles'
import {
  addAlert, closeAlert, emptyQueue, hasOrder, openAlert, removeOrders,
  type AlertItem, type AlertKind, type AlertQueue
} from './alertQueue'
import { alertContent, isPendingOrder, type AlertAction, type AlertContent, type AlertLine } from './alertContent'
import { registerAlertHost, useAlertRing, useAppActive } from './alertRing'

export { isAlertHostMounted } from './alertRing'

/** The arrival's `created_at` as the API writes it (UTC), for an order whose payload has none. */
const apiTime = (moment: number) => dayjs(moment).utc().format('YYYY-MM-DD HH:mm:ss')

/** The order the settings' test alert shows: a sample, marked as a test, that calls no API. */
const sampleOrder = (): any => ({
  id: 1053,
  status: 0,
  delivery_type: 1,
  customer: { name: 'Sample', lastname: 'customer' },
  products: [{ name: 'Sample product', quantity: 1 }, { name: 'Sample side', quantity: 2 }],
  summary: { total: 24.5 }
})

/** The clock of an order's line: "Waiting 00:42", counting from when the order was made (or heard of). */
const AlertClock = ({ line, styles }: { line: AlertLine, styles: any }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const preorder = Number(line.clockOrder?.status) === 13
  const now = useNow(!preorder)
  const { orderTime: timeOfDay } = useFormats()
  const clock = useMemo(() => {
    const order = line.clockOrder?.created_at ? line.clockOrder : { ...line.clockOrder, created_at: apiTime(line.clockStartedAt) }
    return orderClock(order, 'new', now, t, timeOfDay)
  }, [line.clockOrder, line.clockStartedAt, now, t, timeOfDay])
  if (!clock) return null
  const state = clock.state ?? 'neutral'
  return (
    <View style={styles.clock} testID={`alert-clock-${line.key}`}>
      {!!clock.icon && <Icon name={clock.icon} size={themePart(theme, 'order_card', 'base.timer_icon_size')} color={clock.state ? `${clock.state}_text` : 'text_muted'} />}
      <OText style={[styles.clockText, styles[`clock_${state}` as 'clock_neutral']]}>{clock.text}</OText>
    </View>
  )
}

const AlertLineRow = ({ line, styles, acceptSlot, onAccept }: { line: AlertLine, styles: any, acceptSlot: any, onAccept: (line: AlertLine) => void }) => {
  const [, t] = useLanguage()
  return (
    <View style={styles.line} testID={`alert-line-${line.key}`}>
      <View style={styles.lineTexts}>
        <OText style={styles.lineTitle} numberOfLines={1}>{line.title}</OText>
        {!!line.detail && <OText style={styles.lineDetail} numberOfLines={2}>{line.detail}</OText>}
        {!line.test && <AlertClock line={line} styles={styles} />}
      </View>
      {line.canAccept && (
        <OButton
          text={t('ACCEPT', 'Accept')}
          size={acceptSlot.size}
          appearance={acceptSlot.appearance}
          color={acceptSlot.color}
          style={styles.accept}
          onClick={() => onAccept(line)}
          accessibilityLabel={`${t('ACCEPT', 'Accept')} ${line.title}`}
          testID={`alert-accept-${line.key}`}
        />
      )}
    </View>
  )
}

/** The value an event carries, read as the alert's item. */
const itemOf = (value: any, kind: AlertKind): AlertItem => {
  const orderId = kind === 'message' ? (value?.order?.id ?? value?.order_id) : (value?.order_id ?? value?.id)
  return {
    key: `o:${orderId}`,
    orderId,
    status: typeof value?.status === 'number' ? value.status : undefined,
    order: kind === 'message' ? undefined : value,
    receivedAt: Date.now()
  }
}

const kindOf = (evtType: number): AlertKind => (evtType === 1 ? 'message' : evtType === 3 ? 'order_update' : 'order')

/** The ids of the stores a level 2 user owns: the alert tells only about their orders (as the list does). */
const useOwnBusinessIds = (): number[] | null => {
  const [{ user, token }] = useSession() as any
  const [ordering] = useApi() as any
  const api = useRef(ordering)
  api.current = ordering
  const [ids, setIds] = useState<number[] | null>(null)
  useEffect(() => {
    if (user?.level !== 2 || !token) return
    let alive = true
    api.current.setAccessToken(token).businesses().asDashboard().select(['id', 'name']).get()
      .then(({ content: { error, result } }: any) => {
        if (alive && !error && Array.isArray(result) && result.length) setIds(result.map(({ id }: any) => id))
      })
      .catch(() => {})
    return () => { alive = false }
  }, [user?.level, token])
  return ids
}

/**
 * The new-order alert (NewOrderAlert), global: mounted once by the signed-in shell (`GlobalOverlays`), over whatever tab
 * or stack screen is in front (a modal opened from a tab that is not focused is not shown on iOS). It listens to the
 * notifications the orders list emits from the socket's events and gathers what arrives while it is open (see
 * `alertQueue`): one alert with the count, up to three orders with their customer, products and total, and an Accept
 * on each pending one.
 *
 * - Accept opens the accept sheet of `orderActions` (the group's, when the order is one of a cart group); the alert
 *   steps aside while it is open and is back, with what is left, when it closes.
 * - View opens the order (the New list when there are several); closing, accepting everything or opening stops the sound.
 * - Mute silences the sound and the vibration of this alert without closing it; a new order rings again.
 * - An order that stops being pending while the alert is open (`order_updated`: accepted on another device, rejected,
 *   cancelled) leaves it; the same order twice counts once.
 * - The sound and the vibration follow the settings of Alerts and sound (`useAlertSettings`) and the app being in
 *   front; the settings' test alert shows the alert with a sample order (`onTestAlert`).
 */
const NewOrderAlertUI = (props: any) => {
  const { orderStatus } = props
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [events] = useEvent() as any
  const [{ user, token }] = useSession() as any
  const [ordering] = useApi() as any
  const [{ configs }] = useConfig() as any
  const [{ parsePrice }] = useUtils() as any
  const actions = useOrderActions()
  const settings = useAlertSettings()
  const appActive = useAppActive()
  const businessIds = useOwnBusinessIds()
  const styles = useMemo(() => newOrderAlertStyles(theme), [theme])

  const [queue, setQueue] = useState<AlertQueue>(emptyQueue)
  const queueRef = useRef(queue)
  queueRef.current = queue
  const [arrival, setArrival] = useState(0)
  const [muted, setMuted] = useState(false)
  // The accept sheet is open: the alert steps aside (two modals do not stack well) and is quiet.
  const [handling, setHandling] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef({ orderStatus, user, businessIds })
  latest.current = { orderStatus, user, businessIds }

  useEffect(() => registerAlertHost(), [])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const gather = useCallback((kind: AlertKind, item: AlertItem) => {
    // The same order arriving again is the same thing: it neither rings nor counts twice.
    const known = hasOrder(queueRef.current, kind, item.orderId) && !item.test
    setQueue((previous) => addAlert(previous, kind, item))
    if (known) return
    setArrival((count) => count + 1)
    setMuted(false)
  }, [])

  const handleEvent = useCallback((evtType: number, value: any) => {
    if (!value) return
    const { orderStatus: states, user: me, businessIds: owned } = latest.current
    const kind = kindOf(evtType)
    const item = itemOf(value, kind)
    if (item.orderId === undefined || item.orderId === null) return
    // A message of the chat that is on screen is read as it arrives: it needs no alert.
    if (kind === 'message' && openChatOrderId() === Number(item.orderId)) return
    // What the business itself did is not told back to it.
    if (value?.author_id !== undefined && value?.author_id === me?.id) return
    if (kind !== 'message') {
      // The project says which statuses it wants to hear about (`notification_business_states`).
      if (states?.length > 0 && !states.includes(value.status)) return
      // A store owner is told only about their own stores.
      if (me?.level === 2 && owned?.length && value?.business_id !== undefined && !owned.includes(value.business_id)) return
    }
    // An order already in the open alert is leaving it, not being "updated".
    if (kind === 'order_update' && hasOrder(queueRef.current, 'order', item.orderId)) return
    gather(kind, item)
  }, [gather])

  useEffect(() => {
    const onMessage = (value: any) => handleEvent(1, value)
    const onAdded = (value: any) => handleEvent(2, value)
    const onUpdated = (value: any) => handleEvent(3, value)
    // The raw event: an order that stops being pending leaves the alert, whoever changed it.
    const onOrderUpdated = (order: any) => {
      const id = order?.id ?? order?.order_id
      if (id === undefined || id === null || typeof order?.status !== 'number') return
      if (!isPendingOrder(order.status)) setQueue((previous) => removeOrders(previous, 'order', [id]))
    }
    events.on('message_added_notification', onMessage)
    events.on('order_added_notification', onAdded)
    events.on('order_updated_notification', onUpdated)
    events.on('order_updated', onOrderUpdated)
    return () => {
      events.off('message_added_notification', onMessage)
      events.off('order_added_notification', onAdded)
      events.off('order_updated_notification', onUpdated)
      events.off('order_updated', onOrderUpdated)
    }
  }, [events, handleEvent])

  // The settings' "Send a test alert": the alert with a sample order, no API call.
  useEffect(() => onTestAlert(() => {
    const order = sampleOrder()
    gather('order', { key: 'o:test', orderId: 'test', status: 0, order, receivedAt: Date.now(), test: true })
  }), [gather])

  const opened = openAlert(queue)
  const showExternalId = configs?.change_order_id?.value === '1'
  const hideContact = isCustomerContactHidden(configs)
  const content: AlertContent | null = opened
    ? alertContent(opened.kind, opened.items, {
      t,
      parsePrice,
      hideContact,
      showExternalId,
      visible: (key: string) => themeVisible(theme, key)
    })
    : null

  const visible = !!content && !handling
  const ringing = visible && !muted && appActive
  useAlertRing({ ringing, sound: settings.sound, loop: settings.ringUntilOpened, vibrate: settings.vibrate, arrival })

  // Closing one kind's alert opens the next one (if any): it is a new arrival for the ears.
  const close = useCallback(() => {
    setQueue((previous) => closeAlert(previous))
    setArrival((count) => count + 1)
    setMuted(false)
  }, [])

  // The list controller's request shape (`handleChangeOrderStatus`), for the accept sheet: the alert has no list of its own.
  const changeStatus = useCallback(async (status: number | undefined, ids: number[], body: any = {}) => {
    const bodyToSend = Object.keys(body || {}).length > 0 ? { ...body } : { status }
    delete bodyToSend.id
    const answer = await Promise.all(ids.map(async (id) => {
      try {
        const { content: { result, error, error_codes: errorCodes, retry_after: retryAfter } } = await ordering.setAccessToken(token).orders(id).save({ ...bodyToSend, id })
        return { id, result, error, errorCodes, retryAfter }
      } catch (error: any) {
        return { id, result: [error?.message], error: true }
      }
    }))
    // The lists learn of the change from the answer (the socket is not needed for the app's own action).
    const wanted = Number(bodyToSend.status ?? status)
    changedOrdersFromAnswer(answer, ids, Number.isFinite(wanted) ? wanted : undefined).forEach((order) => events.emit(ORDER_CHANGED_EVENT, order))
    return answer
  }, [ordering, token, events])

  const accept = (line: AlertLine) => {
    const [first] = line.orders
    if (!first) return
    setHandling(true)
    const open = () => actions.openAccept(first, {
      ...(line.orders.length > 1 && { orders: line.orders }),
      handleChangeOrderStatus: changeStatus,
      // The alert is not the order's own screen: the app says the order was accepted, and "View order" opens its details.
      from: 'list',
      viewOrder: (accepted: any) => openOrderDetails(accepted.id),
      // The orders that were accepted are no longer waiting: they leave the alert.
      onDone: (done: any[]) => setQueue((previous) => removeOrders(previous, 'order', (done?.length ? done : line.orders).map((order: any) => order.id))),
      // Whatever closed the sheet, the alert is back with what is left (or gone, when nothing is).
      onClosed: () => {
        setHandling(false)
        setArrival((count) => count + 1)
      }
    })
    // The alert's sheet leaves first, so the accept sheet does not open over a modal that is closing.
    const wait = themeMotion(theme, 'slow').duration
    if (wait > 0) timer.current = setTimeout(open, wait)
    else open()
  }

  const act = (action: AlertAction) => {
    close()
    switch (action.type) {
      case 'details': return openOrderDetails(action.orderId)
      case 'orders': return openOrdersTab(action.tab, action.stage)
      case 'messages': return openMessagesTab()
    }
  }

  if (!content) return null

  const tile = themePart(theme, 'new_order_alert', 'slots.tile')
  const acceptSlot = themePart(theme, 'new_order_alert', 'slots.accept')
  const openSlot = themePart(theme, 'new_order_alert', 'slots.open')
  const test = content.lines.some((line) => line.test)

  return (
    <OBottomPopup open={visible} onClose={close} padded animationType='slide' testID='new-order-alert'>
      <View style={styles.content}>
        <View style={styles.row} testID='new-order-row'>
          <IconTile icon='notifications-outline' size={tile.size} variant={tile.variant} round={tile.shape === 'round'} testID='new-order-tile' />
          <View style={styles.copy}>
            <OText style={styles.title} accessibilityRole='header'>{content.title}</OText>
            {!!content.message && <OText style={styles.text}>{content.message}</OText>}
            {!!content.numbers && <OText style={styles.text} testID='new-order-numbers'>{content.numbers}</OText>}
          </View>
          <View style={styles.close}>
            <ModalCloseButton onPress={close} testID='new-order-close' />
          </View>
        </View>

        {content.lines.length > 0 && (
          <View style={styles.lines} testID='new-order-lines'>
            {content.lines.map((line, index) => (
              <React.Fragment key={line.key}>
                {index > 0 && <ODivider />}
                <AlertLineRow line={line} styles={styles} acceptSlot={acceptSlot} onAccept={accept} />
              </React.Fragment>
            ))}
            {!!content.more && <OText style={styles.more} testID='new-order-more'>{content.more}</OText>}
          </View>
        )}

        {settings.ringUntilOpened && (
          <View style={styles.ringing} testID='new-order-ringing'>
            <Icon name={muted ? 'notifications-off-outline' : 'notifications-outline'} size='sm' color='text_muted' />
            <OText style={styles.ringingText}>
              {muted
                ? t('ALERT_MUTED', 'Muted. It rings again when a new order arrives.')
                : t('ALERT_RINGING_UNTIL', 'Ringing until you open or accept them.')}
            </OText>
            {!muted && (
              <View style={styles.mute}>
                <OLink shorcut={t('MUTE', 'Mute')} onPress={() => setMuted(true)} testID='new-order-mute' />
              </View>
            )}
          </View>
        )}

        <OButton
          text={test ? t('CLOSE', 'Close') : content.button.text}
          size={openSlot.size}
          appearance={openSlot.appearance}
          color={openSlot.color}
          onClick={() => (test ? close() : act(content.button.action))}
          testID='new-order-view'
        />
      </View>
    </OBottomPopup>
  )
}

/** The new-order alert: the headless controller (which gives the states the project notifies) and the alert as its UI. */
export const NewOrderAlert = (props: any) => (
  <NewOrderNotificationController {...props} isBusinessApp UIComponent={NewOrderAlertUI} />
)
