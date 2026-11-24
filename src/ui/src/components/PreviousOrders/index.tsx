import React, { useCallback, useMemo, useRef } from 'react'
import { FlatList, View, type FlatListProps } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeVisible } from '@/theme/helpers'
import { useOrdersDisplay } from '@/context/ordersDisplay'
import { SectionTitle } from '../shared'
import { OrderCard } from './OrderCard'
import { GroupedOrderCard } from './GroupedOrderCard'
import { ordersListStyles } from './styles'
import { useMultiStore } from './storesSeen'
import type { OrderRow } from '../OrdersOption/splitOrders'
import type { OrderSection } from '../OrdersOption/orderStatusGroups'

/**
 * The rows of one list of orders: a card for each order and a group card for the orders of one cart group, `md`
 * apart. A section of the open orders (New, Preparing, Ready, With driver), History's day or the search results are
 * each one of these.
 *
 * The cards are memoized on what they draw, so what they call is read from the latest props through one stable
 * handler: a card that did not change never calls the controller with an old render's state.
 */
interface Props {
  rows: OrderRow[]
  /** The section the rows are in; by default each order's own. */
  section?: OrderSection
  /** The History layout. */
  compact?: boolean
  showStatus?: boolean
  /** The board's selected order. */
  selectedId?: number | string
  /** Opens an order. By default `onNavigationRedirect('OrderDetails', { order })`. */
  handleClickEvent?: (order: any) => void
  handleClickOrder?: (order: any) => void
  onNavigationRedirect?: (page: string, params?: any) => void
  handleChangeOrderStatus?: (...args: any[]) => any
  handleSendCustomerReview?: (params: any) => any
  loadingChangeOrder?: boolean
}

type HandlerProps = Omit<Props, 'rows' | 'section' | 'compact' | 'showStatus' | 'selectedId'>

/** The calls of the cards, stable for the life of the list: each reads the latest props when it is called. */
export const useOrderRowHandlers = (props: HandlerProps) => {
  const latest = useRef(props)
  latest.current = props
  return useMemo(() => ({
    onPress: (order: any) => {
      const current = latest.current
      current.handleClickOrder?.(order)
      if (current.handleClickEvent) current.handleClickEvent(order)
      else current.onNavigationRedirect?.('OrderDetails', { order })
    },
    handleChangeOrderStatus: (...args: any[]) => latest.current.handleChangeOrderStatus?.(...args),
    handleSendCustomerReview: (params: any) => latest.current.handleSendCustomerReview?.(params)
  }), [])
}

interface RowViewProps {
  row: OrderRow
  section?: OrderSection
  compact?: boolean
  showStatus?: boolean
  selectedId?: number | string
  loadingChangeOrder?: boolean
  /** The store's logo and name are drawn on the cards (more than one store, `orders.store` on). */
  showStore?: boolean
  /** What this device shows on a card, read once by the list: the quick actions, the clock time. */
  quickActions?: boolean
  absoluteTime?: boolean
  handlers: ReturnType<typeof useOrderRowHandlers>
}

/** One row of a list: the card of an order, or the card of a group of them. */
export const OrderRowView = ({ row, section, compact, showStatus, selectedId, loadingChangeOrder, showStore, quickActions, absoluteTime, handlers }: RowViewProps) => row.groupId !== undefined
  ? (
    <GroupedOrderCard
      groupId={row.groupId}
      orders={row.orders}
      section={section}
      showStatus={showStatus}
      showStore={showStore}
      quickActions={quickActions}
      absoluteTime={absoluteTime}
      onPress={handlers.onPress}
      handleChangeOrderStatus={handlers.handleChangeOrderStatus}
      handleSendCustomerReview={handlers.handleSendCustomerReview}
      loadingChangeOrder={loadingChangeOrder}
    />
    )
  : (
    <OrderCard
      order={row.orders[0]}
      section={section}
      compact={compact}
      showStatus={showStatus}
      showStore={showStore}
      quickActions={quickActions}
      absoluteTime={absoluteTime}
      selected={selectedId !== undefined && row.orders[0]?.id === selectedId}
      onPress={handlers.onPress}
      handleChangeOrderStatus={handlers.handleChangeOrderStatus}
      loadingChangeOrder={loadingChangeOrder}
    />
    )

/** An item of a virtualized list of orders: a title of a section, or a row (an order or a group). */
export type OrderListItem =
  | { kind: 'title', key: string, text: string, testID?: string }
  | { kind: 'row', key: string, row: OrderRow, section?: OrderSection, compact?: boolean, showStatus?: boolean }

/** The items of a list of sections: each title, then its rows. */
export const sectionItems = (
  sections: Array<{ key: string, title?: string, titleTestID?: string, section?: OrderSection, compact?: boolean, showStatus?: boolean, rows: OrderRow[] }>
): OrderListItem[] => sections.flatMap((entry) => [
  ...(entry.title ? [{ kind: 'title', key: `title:${entry.key}`, text: entry.title, testID: entry.titleTestID } as OrderListItem] : []),
  ...entry.rows.map((row): OrderListItem => ({ kind: 'row', key: `${entry.key}/${row.key}`, row, section: entry.section, compact: entry.compact, showStatus: entry.showStatus }))
])

type ListProps = HandlerProps & Pick<Props, 'selectedId'> & {
  items: OrderListItem[]
} & Omit<FlatListProps<OrderListItem>, 'data' | 'renderItem' | 'keyExtractor'>

/**
 * A virtualized list of order cards (the phone's tabs, the board's columns, History, the search results): only the rows
 * near the screen are mounted. A title opens a section `lg` after the rows above it, its rows follow `sm` under it, and
 * rows are `md` apart.
 */
export const OrderRowsList = ({
  items,
  selectedId,
  handleClickEvent,
  handleClickOrder,
  onNavigationRedirect,
  handleChangeOrderStatus,
  handleSendCustomerReview,
  loadingChangeOrder,
  ...listProps
}: ListProps) => {
  const theme: any = useTheme()
  const styles = useMemo(() => ordersListStyles(theme), [theme])
  // The stores are seen once for the lists (not per card); the theme's key can turn the line off.
  const multiStore = useMultiStore(items)
  const showStore = multiStore && themeVisible(theme, 'orders.store')
  // What this device shows on a card (its choice, else the theme's): read once here, so no card subscribes on its own.
  const { quickActions, absoluteTime } = useOrdersDisplay()
  const handlers = useOrderRowHandlers({ handleClickEvent, handleClickOrder, onNavigationRedirect, handleChangeOrderStatus, handleSendCustomerReview })
  const keyOf = useCallback((item: OrderListItem) => item.key, [])
  const render = useCallback(({ item, index }: { item: OrderListItem, index: number }) => {
    const before = index === 0 ? null : items[index - 1]
    const gap = !before ? undefined : item.kind === 'title' ? styles.beforeTitle : before.kind === 'title' ? styles.afterTitle : styles.beforeRow
    return (
      <View style={gap} testID={item.kind === 'title' ? item.testID : undefined}>
        {item.kind === 'title'
          ? <SectionTitle>{item.text}</SectionTitle>
          : <OrderRowView row={item.row} section={item.section} compact={item.compact} showStatus={item.showStatus} selectedId={selectedId} loadingChangeOrder={loadingChangeOrder} showStore={showStore} quickActions={quickActions} absoluteTime={absoluteTime} handlers={handlers} />}
      </View>
    )
  }, [items, styles, handlers, selectedId, loadingChangeOrder, showStore, quickActions, absoluteTime])
  return (
    <FlatList
      showsVerticalScrollIndicator={false}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={7}
      {...listProps}
      data={items}
      keyExtractor={keyOf}
      renderItem={render}
      extraData={[selectedId, loadingChangeOrder, handlers, showStore, quickActions, absoluteTime]}
    />
  )
}

export { OrderCard } from './OrderCard'
export { GroupedOrderCard } from './GroupedOrderCard'
export { OrdersSkeleton } from './OrdersSkeleton'
export { orderClock } from './orderTimes'
