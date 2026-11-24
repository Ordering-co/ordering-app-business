import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useConfig, useEvent, useLanguage, useSession, useUtils } from '@components'
import { canReviewCustomer, useOrderActions } from '@ui'
import { useFormats } from '@/hooks/useFormats'
import { markReadyText } from '../OrderDetails/orderStages'
import { themePart, themeVisible } from '@/theme/helpers'
import { Icon, OBadge, OButton, OCard, OText, useConfirm } from '../shared'
import { orderStatusVariant } from '../shared/orderStates'
import { orderTypeVariant } from '../shared/orderTypeVariant'
import { isCustomerContactHidden } from '../../utils/contactVisibility'
import { statusLabel } from '../OrderDetails/orderStages'
import { sectionOf, type OrderSection } from '../OrdersOption/orderStatusGroups'
import { ORDER_CHANGED_EVENT } from '../OrdersOption/orderChanges'
import { flushLook, orderCardStyles } from './styles'
import { areListedOrderRowPropsEqual } from './areListedOrderRowPropsEqual'
import { cardActionsFor, STATUS_OF_STEP, stepNeedsConfirmation, type CardActionKey, type CardActions } from './cardActions'
import { customerText, itemsText, orderNumber, orderTotal, orderTypeText, paymentState, reasonText, storeOf } from './orderCardData'
import { OrderBand } from './OrderBand'
import { OrderCardHeader, OrderFacts } from './OrderCardParts'
import { useStatusStep } from './useStatusStep'

/**
 * An order of the orders list (`components.order_card`), as the approved drawing has it (the status band): a band across the
 * top with the status and the time ("Waiting 02:14"), the store's tile and name over "#number · customer" with the total at
 * the right, the order type, Paid / Unpaid and the number of items, and the buttons the order's status allows (Reject /
 * Accept, Mark ready, Not picked up / Picked up). No product list. A card of History is `compact`: the same card, its time
 * the one it is listed with, and the review button where the rule allows it.
 *
 * What the payload does not carry is left out. The band's time ticks by itself; the band is the soft colour of the status,
 * or of the time's state when the order is at risk or late (the API's `time_status`, or its promised time gone by). The
 * device's two choices (the quick actions, the clock time) come as props from the list, read once there.
 */
export interface OrderCardProps {
  order: any
  /** Where the order is listed; by default the one its status belongs to. */
  section?: OrderSection
  /** The History layout. */
  compact?: boolean
  /** A row of a group's card: the number and the customer, no box and no buttons. */
  inGroup?: boolean
  /** The status (the band's, or the chip of a group's row): drawn by default (`false` hides it); a row of a group's card draws it only with the driver and in History, or when asked. */
  showStatus?: boolean
  /** The device's choice (the theme's by default) of the quick actions: off, the card draws no button and only opens the order. Read once by the list. */
  quickActions?: boolean
  /** The device's choice of the clock time beside the elapsed time: "Waiting 02:14 · 12:04 PM". A preorder always writes its time. Read once by the list. */
  absoluteTime?: boolean
  /**
   * The store's logo and name are the card's first line: the list says so when the account has more than one store (and the
   * theme's `orders.store` is on). Not drawn in a group's row (the group's card draws it).
   */
  showStore?: boolean
  /** The board's selected card. */
  selected?: boolean
  onPress?: (order: any) => void
  /** The list controller's: `(status, ids, body?, options?)`. */
  handleChangeOrderStatus?: (...args: any[]) => any
  /** The controller's flag: a status change is running. */
  loadingChangeOrder?: boolean
  testID?: string
}

const SHOWS_STATUS: OrderSection[] = ['with_driver', 'history']

const OrderCardBase = ({
  order,
  section: sectionProp,
  compact = false,
  inGroup = false,
  showStatus,
  quickActions = true,
  absoluteTime = false,
  showStore = false,
  selected = false,
  onPress,
  handleChangeOrderStatus,
  loadingChangeOrder,
  testID
}: OrderCardProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const [{ configs }] = useConfig()
  const [{ user }] = useSession() as any
  const [events] = useEvent()
  const actions = useOrderActions()
  const confirm = useConfirm()
  const styles = useMemo(() => orderCardStyles(theme), [theme])

  const section: OrderSection = sectionProp ?? sectionOf(order?.status) ?? 'new'
  const history = compact || section === 'history'

  const formats = useFormats()
  // "Pending sync": a change made offline that the server has not answered; the replay clears it.
  const [synced, setSynced] = useState<Array<number | string>>([])
  useEffect(() => {
    const handle = (ids: Array<number | string>) => ids && setSynced(ids)
    events.on('offline_order_updated', handle)
    return () => events.off('offline_order_updated', handle)
  }, [events])
  const pendingSync = !!order?.unsync && !synced.includes(order?.id)

  const { changeStatus: step, busy, unavailable: cannotAct } = useStatusStep({ handleChangeOrderStatus, loadingChangeOrder })
  const changeStatus = (status: number) => step([order], status)

  // The sheet saved the driver: the lists take the order's answer (the same event the details tell), so the button goes.
  const assigned = (answer: any) => {
    if (!answer || typeof answer !== 'object' || !(answer.driver_id || answer.driver)) return
    events.emit(ORDER_CHANGED_EVENT, { id: order.id, status: answer.status ?? order.status, driver_id: answer.driver_id ?? answer.driver?.id ?? null, driver: answer.driver })
  }

  const runAction = (key: CardActionKey) => {
    // Accepted from a list: the app says so, and "View order" does what a tap on the card does (not offered for the order
    // the board's panel already shows).
    if (key === 'accept') return actions.openAccept(order, { handleChangeOrderStatus, from: 'list', viewOrder: selected ? undefined : (accepted) => onPress?.(accepted) })
    if (key === 'reject') return actions.openReject(order, { handleChangeOrderStatus })
    if (key === 'assign_driver') return actions.openAssignDriver(order, { onDone: assigned })
    const status = STATUS_OF_STEP[key] as number
    if (stepNeedsConfirmation(key)) {
      return confirm({
        message: (key === 'not_arrived'
          ? t('ORDER_NOT_ARRIVED_CONFIRM', 'Mark order _number_ as customer not arrived? This cannot be undone.')
          : t('ORDER_NOT_PICKED_UP_CONFIRM', 'Mark order _number_ as not picked up? This cannot be undone.')
        ).replace('_number_', orderNumber(order, configs?.change_order_id?.value === '1')),
        acceptText: key === 'not_arrived' ? t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived') : t('NOT_PICKED_UP', 'Not picked up'),
        destructive: true,
        onAccept: () => changeStatus(status)
      })
    }
    changeStatus(status)
  }

  const showExternalId = configs?.change_order_id?.value === '1'
  const hideContact = isCustomerContactHidden(configs)
  const number = orderNumber(order, showExternalId)
  const typeText = themeVisible(theme, 'orders.order_type') ? orderTypeText(order.delivery_type, t) : undefined
  const customer = customerText(order, hideContact, t)
  const showTotal = themeVisible(theme, 'orders.total')
  const total = showTotal ? orderTotal(order) : undefined
  const payment = showTotal ? paymentState(order) : undefined
  const items = itemsText(order, t)
  const reason = history ? reasonText(order, t) : undefined
  // The one name of a status (the details' chip, the Messages rows and the map say the same).
  const statusName = order.status !== undefined && order.status !== null ? statusLabel(order.status, t, order) : ''
  const drawsStatus = (inGroup ? (showStatus ?? SHOWS_STATUS.includes(section)) : showStatus !== false) && themeVisible(theme, 'orders.order_status') && !!statusName
  const store = showStore && !inGroup ? storeOf(order) : undefined

  const ready = themePart(theme, 'order_card', 'slots.advance')
  const decline = themePart(theme, 'order_card', 'slots.decline')
  // Assign driver only on the order's own card, by the project's and the user's rule (a group's card never asks).
  const card = cardActionsFor(order, { configs, level: user?.level })
  // Assign driver beside Mark ready is neutral (the bottom bar's secondary look), the size of the card's buttons.
  // The step beside the main one that is not a refusal (Assign driver beside Mark ready): its own slot, never the danger look.
  const secondary = themePart(theme, 'order_card', 'slots.secondary')
  const reviewable = history && quickActions && themeVisible(theme, 'orders.review_order_button') && canReviewCustomer(order)
  const buttons: CardActions = quickActions && !inGroup && !history && !cannotAct ? card : {}
  const hasButtons = !!(buttons.decline || buttons.advance)
  // The left button of a pair: the destructive step, or the neutral one beside the main step.
  const leftKey = buttons.decline ?? buttons.secondary
  const leftLook = buttons.decline ? decline : secondary
  // The pickup pair and Assign driver beside Mark ready have long labels for a narrow cell: they keep one line.
  const longStep = buttons.decline === 'not_picked_up' || buttons.decline === 'not_arrived' || !!buttons.secondary

  const labels: Record<CardActionKey, string> = {
    reject: t('REJECT', 'Reject'),
    accept: t('ACCEPT', 'Accept'),
    ready: markReadyText(t, order.delivery_type),
    not_picked_up: t('NOT_PICKED_UP', 'Not picked up'),
    picked_up: t('PICKED_UP', 'Picked up'),
    not_arrived: t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived'),
    arrived: t('CUSTOMER_ARRIVED', 'Customer arrived'),
    assign_driver: t('ASSIGN_DRIVER', 'Assign driver')
  }

  // The card has no padding of its own: the band reaches its edges and the blocks under it carry the card's.
  const look = useMemo(() => {
    const base = themePart(theme, 'order_card', 'base')
    return flushLook(selected ? { ...base, border: base.selected_border } : base)
  }, [theme, selected])

  const press = () => onPress?.(order)

  if (inGroup) {
    return (
      <Pressable accessibilityRole='button' onPress={press} style={({ pressed }) => [styles.child, pressed && styles.pressed]} testID={testID ?? `order-card-${order.id}-row`}>
        <View style={styles.childBody}>
          <View style={styles.childTitle}>
            <OText style={styles.title} numberOfLines={1}>{number}</OText>
            {!!typeText && <OBadge variant={orderTypeVariant(order.delivery_type)}>{typeText}</OBadge>}
          </View>
          {!!customer && <OText style={styles.meta} numberOfLines={1}>{customer}</OText>}
        </View>
        {drawsStatus && <OBadge variant={orderStatusVariant(order.status)}>{statusName}</OBadge>}
      </Pressable>
    )
  }

  const title = [number, customer].filter(Boolean).join(' · ')
  const showTime = !history || themeVisible(theme, 'orders.date')

  const hasRest = pendingSync || reviewable || hasButtons

  return (
    <OCard look={look} style={styles.flush} testID={testID ?? `order-card-${order.id}`}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={[number, typeText, customer, store?.name, drawsStatus ? statusName : undefined].filter(Boolean).join(', ')}
        onPress={press}
        style={({ pressed }) => pressed && styles.pressed}
        testID={`order-card-${order.id}-open`}
      >
        <OrderBand
          order={order}
          section={section}
          t={t}
          formats={formats}
          status={drawsStatus ? statusName : undefined}
          showTime={showTime}
          absolute={absoluteTime}
          styles={styles}
          testID={`order-card-${order.id}`}
        />
        <View style={styles.main}>
          <OrderCardHeader
            store={store}
            title={title}
            unread={!!order.showNotification}
            total={total !== undefined ? parsePrice(total) : undefined}
            styles={styles}
          />
          <OrderFacts
            type={order.delivery_type}
            typeText={typeText}
            payment={payment}
            paidText={t('PAID', 'Paid')}
            unpaidText={t('UNPAID', 'Unpaid')}
            items={items}
            styles={styles}
            testID={`order-card-${order.id}-facts`}
          />
          {!!reason && <OText style={styles.meta}>{reason}</OText>}
        </View>
      </Pressable>
      {hasRest && (
        <View style={styles.rest}>
          {pendingSync && (
            <View style={styles.pending} testID='order-card-pending-sync'>
              <Icon name='sync-outline' size='sm' color='warning_text' />
              <OText style={styles.pendingText}>{t('PENDING_SYNC', 'Pending sync')}</OText>
            </View>
          )}
          {reviewable && (
            <OButton
              size='md'
              color='primary'
              appearance='tonal'
              text={t('REVIEW_CUSTOMER', 'Review customer')}
              onClick={() => actions.openReview(order)}
              testID={`order-card-${order.id}-review`}
            />
          )}
          {hasButtons && (
            <View style={styles.actions} testID={`order-card-${order.id}-actions`}>
              {!!leftKey && (
                <View style={longStep ? styles.declineLong : styles.decline}>
                  <OButton
                    fitText={longStep}
                    size={leftLook.size}
                    appearance={leftLook.appearance}
                    color={leftLook.color}
                    text={labels[leftKey]}
                    disabled={busy}
                    onClick={() => runAction(leftKey)}
                    testID={`order-card-${order.id}-${leftKey}`}
                  />
                </View>
              )}
              {!!buttons.advance && (
                <View style={leftKey ? (longStep ? styles.advanceLong : styles.advance) : styles.advanceAlone}>
                  <OButton
                    fitText={longStep}
                    size={ready.size}
                    appearance={ready.appearance}
                    color={ready.color}
                    text={labels[buttons.advance]}
                    disabled={busy}
                    onClick={() => runAction(buttons.advance as CardActionKey)}
                    testID={`order-card-${order.id}-${buttons.advance}`}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </OCard>
  )
}

export const OrderCard = React.memo(OrderCardBase, areListedOrderRowPropsEqual)
export default OrderCard
