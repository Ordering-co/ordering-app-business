import React, { useMemo, useState } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage, useUtils } from '@components'
import { canReviewCustomer, useOrderActions } from '@ui'
import { useFormats } from '@/hooks/useFormats'
import { themePart, themeVisible } from '@/theme/helpers'
import { Icon, OButton, OCard, ODivider, useConfirm } from '../shared'
import { statusLabel } from '../OrderDetails/orderStages'
import { sectionOf, type OrderSection } from '../OrdersOption/orderStatusGroups'
import { markReadyText } from '../OrderDetails/orderStages'
import { OrderCard } from './OrderCard'
import { OrderBand } from './OrderBand'
import { OrderCardHeader, OrderFacts } from './OrderCardParts'
import { groupPaymentState, itemsCount, orderTotal, orderTypeText, storesOf } from './orderCardData'
import { flushLook, orderCardStyles, ordersListStyles } from './styles'
import { cardActionsFor, STATUS_OF_STEP, type CardActionKey } from './cardActions'
import { areListedOrderRowPropsEqual } from './areListedOrderRowPropsEqual'
import { useStatusStep } from './useStatusStep'

/**
 * Orders of one cart group in one section, in the language of the order's card: the band with the status and the time of
 * its first order, the group's stores and its title with the group's total, and the facts (how many orders, their type,
 * Paid / Unpaid, the items). The header opens and closes the group's orders (simple rows of the card) and, under them, the actions that speak for the group ("Accept 2 orders", "Reject 2 orders", Mark ready...). A step
 * that changes every order of the group at once asks first, naming the group; accept and reject are the sheets of
 * `orderActions`, which name the group too.
 */
export interface GroupedOrderCardProps {
  groupId: string
  orders: any[]
  section?: OrderSection
  onPress?: (order: any) => void
  handleChangeOrderStatus?: (...args: any[]) => any
  /** The controller's review of a customer, for a group: `({ customerId, orderIds, body, onClose })`. */
  handleSendCustomerReview?: (params: any) => any
  loadingChangeOrder?: boolean
  showStatus?: boolean
  /** The device's choices (read once by the list): the quick actions, and the clock time beside the elapsed time. */
  quickActions?: boolean
  absoluteTime?: boolean
  /** The store's logo and name as the first line (the account has more than one store); a group of several stores names them all. */
  showStore?: boolean
}

const GroupedOrderCardBase = ({
  groupId,
  orders,
  section: sectionProp,
  onPress,
  handleChangeOrderStatus,
  handleSendCustomerReview,
  loadingChangeOrder,
  showStatus,
  quickActions = true,
  absoluteTime = false,
  showStore = false
}: GroupedOrderCardProps) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parsePrice }] = useUtils()
  const formats = useFormats()
  const actions = useOrderActions()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const card = useMemo(() => orderCardStyles(theme), [theme])
  const list = useMemo(() => ordersListStyles(theme), [theme])
  const look = useMemo(() => flushLook(themePart(theme, 'order_card', 'base')), [theme])
  const { changeStatus, busy, unavailable } = useStatusStep({ handleChangeOrderStatus, loadingChangeOrder })

  const first = orders[0]
  const section: OrderSection = sectionProp ?? sectionOf(first?.status) ?? 'new'
  const count = orders.length
  const title = `${t('GROUP_NRO', 'Group No.')}${groupId}`
  const ids = orders.map((order) => order.id)
  const statusName = first?.status !== undefined && first?.status !== null ? statusLabel(first.status, t, first) : ''

  // The group speaks only when every order is at a step with the same buttons.
  // No assignment here: a driver is assigned to one order (the group's rows open their order).
  const steps = orders.map((order) => cardActionsFor(order))
  const same = steps.every((step) => step.advance === steps[0].advance && step.decline === steps[0].decline)
  const step = same ? steps[0] : {}
  const history = section === 'history'
  const reviewer = history && quickActions && themeVisible(theme, 'orders.review_order_button') && canReviewCustomer(first)

  const advance = themePart(theme, 'order_card', 'slots.advance')
  const decline = themePart(theme, 'order_card', 'slots.decline')

  const label = (key: CardActionKey): string => {
    switch (key) {
      case 'accept': return t('ACCEPT_ORDERS_COUNT', 'Accept _count_ orders').replace('_count_', String(count))
      case 'reject': return t('REJECT_ORDERS_COUNT', 'Reject _count_ orders').replace('_count_', String(count))
      case 'ready': return markReadyText(t, first?.delivery_type)
      case 'not_picked_up': return t('NOT_PICKED_UP', 'Not picked up')
      case 'picked_up': return t('PICKED_UP', 'Picked up')
      case 'not_arrived': return t('CUSTOMER_NOT_ARRIVED', 'Customer not arrived')
      default: return t('CUSTOMER_ARRIVED', 'Customer arrived')
    }
  }

  const run = (key: CardActionKey) => {
    // The notice says how many were accepted; it has no order to go to.
    if (key === 'accept') return actions.openAccept(first, { orders, handleChangeOrderStatus, from: 'list' })
    if (key === 'reject') return actions.openReject(first, { orders, handleChangeOrderStatus })
    const status = STATUS_OF_STEP[key] as number
    // A step on every order of the group at once asks first, naming the group.
    confirm({
      message: t('GROUP_STEP_CONFIRM', '_action_ for the _count_ orders of _group_?')
        .replace('_action_', label(key))
        .replace('_count_', String(count))
        .replace('_group_', title),
      acceptText: label(key),
      destructive: key === 'not_picked_up' || key === 'not_arrived',
      onAccept: () => changeStatus(orders, status)
    })
  }

  const store = showStore ? storesOf(orders) : undefined
  const hasActions = quickActions && !unavailable && !!(step.decline || step.advance)
  // The pickup pair is written, not shared 1 : 2 (as the order's card draws it, T3-C2): each cell is as wide as its label.
  const longStep = step.decline === 'not_picked_up' || step.decline === 'not_arrived'

  // The group as one card: the first order's status and time, the sum of the totals, what the orders share.
  const showTotal = themeVisible(theme, 'orders.total')
  const totals = orders.map(orderTotal).filter((value): value is number => value !== undefined)
  const total = showTotal && totals.length ? parsePrice(totals.reduce((sum, value) => sum + value, 0)) : undefined
  const sameType = orders.every((order) => Number(order.delivery_type) === Number(first?.delivery_type))
  const typeText = sameType && themeVisible(theme, 'orders.order_type') ? orderTypeText(first?.delivery_type, t) : undefined
  const units = orders.map(itemsCount).filter((value): value is number => value !== undefined).reduce((sum, value) => sum + value, 0)
  const itemsLine = units ? (units === 1 ? t('ORDER_ITEMS_COUNT_ONE', '_count_ item') : t('ORDER_ITEMS_COUNT', '_count_ items')).replace('_count_', String(units)) : undefined
  const drawsStatus = showStatus !== false && themeVisible(theme, 'orders.order_status') && !!statusName
  const showTime = !history || themeVisible(theme, 'orders.date')

  return (
    <OCard look={look} style={card.flush} testID={`orders-group-${groupId}`}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={[title, store?.name, drawsStatus ? statusName : undefined].filter(Boolean).join(', ')}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => pressed && card.pressed}
        testID={`orders-group-${groupId}-toggle`}
      >
        <OrderBand
          order={first}
          section={section}
          t={t}
          formats={formats}
          status={drawsStatus ? statusName : undefined}
          showTime={showTime}
          absolute={absoluteTime}
          styles={card}
          testID={`orders-group-${groupId}`}
        />
        <View style={card.main}>
          <OrderCardHeader store={store} title={title} total={total} styles={card} testID={`orders-group-${groupId}-store`} />
          <OrderFacts
            type={first?.delivery_type}
            typeText={typeText}
            payment={showTotal ? groupPaymentState(orders) : undefined}
            paidText={t('PAID', 'Paid')}
            unpaidText={t('UNPAID', 'Unpaid')}
            items={[`${count} ${t('ORDERS', 'Orders').toLocaleLowerCase()}`, itemsLine].filter(Boolean).join(' · ')}
            trailing={<Icon name={open ? 'chevron-up' : 'chevron-down'} color='text_muted' />}
            styles={card}
            testID={`orders-group-${groupId}-facts`}
          />
        </View>
      </Pressable>

      {/* Kept mounted while closed: a row keeps its state. Nothing to show (closed, no button), no room taken. */}
      <View style={open || hasActions || reviewer ? card.rest : card.hidden}>
        <View style={open ? list.groupBody : list.hidden} testID={`orders-group-${groupId}-body`}>
          <ODivider />
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} inGroup section={section} showStatus={showStatus} onPress={onPress} />
          ))}
        </View>

        {hasActions && (
          <View style={card.actions} testID={`orders-group-${groupId}-actions`}>
            {!!step.decline && (
              <View style={longStep ? card.declineLong : card.decline}>
                <OButton
                  fitText={longStep}
                  size={decline.size}
                  appearance={decline.appearance}
                  color={decline.color}
                  text={label(step.decline)}
                  disabled={busy}
                  onClick={() => run(step.decline as CardActionKey)}
                  testID={`orders-group-${groupId}-${step.decline}`}
                />
              </View>
            )}
            {!!step.advance && (
              <View style={step.decline ? (longStep ? card.advanceLong : card.advance) : card.advanceAlone}>
                <OButton
                  fitText={longStep}
                  size={advance.size}
                  appearance={advance.appearance}
                  color={advance.color}
                  text={label(step.advance)}
                  disabled={busy}
                  onClick={() => run(step.advance as CardActionKey)}
                  testID={`orders-group-${groupId}-${step.advance}`}
                />
              </View>
            )}
          </View>
        )}

        {reviewer && (
          <OButton
            size='md'
            color='primary'
            appearance='tonal'
            text={t('REVIEW_CUSTOMER', 'Review customer')}
            onClick={() => actions.openReview(first, {
              handleCustomCustomerReview: (body: any, onClose?: () => void) =>
                handleSendCustomerReview?.({ customerId: first?.customer_id ?? first?.customer?.id, orderIds: ids, body, onClose })
            })}
            testID={`orders-group-${groupId}-review`}
          />
        )}
      </View>
    </OCard>
  )
}

export const GroupedOrderCard = React.memo(GroupedOrderCardBase, areListedOrderRowPropsEqual)
export default GroupedOrderCard
