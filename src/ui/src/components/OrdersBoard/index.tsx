import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage } from '@components'
import { themeVisible } from '@/theme/helpers'
import { useLayout } from '@/theme/platform'
import { Icon, OButton, OText } from '../shared'
import { WebsocketStatus } from '../WebsocketStatus'
import { OrderDetailsPage } from '../OrderDetails/OrderDetailsPage'
import { OrdersSkeleton, sectionItems } from '../PreviousOrders'
import { OrdersSource } from '../OrdersOption/OrdersSource'
import { useOrdersSplit } from '../OrdersOption/useOrdersSplit'
import { useOrdersSearch } from '../OrdersOption/useOrdersSearch'
import { OrdersSearchModal } from '../OrdersOption/OrdersSearchForm'
import { OrdersNotices } from '../OrdersOption/OrdersNotices'
import { NotFoundSource } from '../NotFoundSource'
import { useOrdersEmpty } from '../OrdersOption/emptyContent'
import { boardStyles } from './styles'
import { BoardColumn } from './BoardColumn'
import { BoardHistory } from './BoardHistory'
import { StoreFilter } from '../OrdersOption/StoreFilter'

/**
 * The kitchen board for a tablet held sideways (TabletBoard): the orders in three columns, New, Preparing and Ready (Ready
 * also holds the orders with a driver), each with its number of orders and the cards of the phone (with their actions);
 * a header with the title, the store filter, the connection pill, History and search; and the order's details in a panel
 * on the right (`screen.detail_pane_width`) over the columns, closed by its arrow. The sheets of the actions open as
 * centered dialogs (the theme's large-screen rule). The data is the phone's (`useOrdersSplit`): one controller, split on
 * the client. With a filter or a text search on (OQ-02) the columns stay and hold only the orders that match, each with its
 * count under the "Filters on" notice; History holds the closed ones that match.
 */
const OrdersBoardUI = (props: any) => {
  const { navigation, onNavigationRedirect, handleSendCustomerReview, loadingChangeOrder } = props
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const layout = useLayout()
  const split = useOrdersSplit(props, { allStages: true })
  const emptyOf = useOrdersEmpty()
  const searchState = useOrdersSearch(props)
  const [selected, setSelected] = useState<any>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const styles = useMemo(() => boardStyles(theme, layout.panes.detail ?? 0), [theme, layout.panes.detail])

  const online = split.isNetConnected !== false
  const showTitle = themeVisible(theme, 'orders.title')
  const showStatus = themeVisible(theme, 'connection_status')
  const showSearch = themeVisible(theme, 'orders.search')
  const showRefresh = themeVisible(theme, 'orders.refresh')
  const enterprise = !!(configs?.plan_enterprise && configs?.plan_enterprise?.value)

  // The refresh button reloads what the pull does (`split.refresh`: the lists) and shows it works. It cannot be pressed
  // again until the reload is over: the ref closes the gap before the render that disables the button.
  const reloading = useRef(false)
  useEffect(() => { if (!split.refreshing) reloading.current = false }, [split.refreshing])
  const { refresh, refreshing } = split
  const refreshNow = useCallback(() => {
    if (!online || reloading.current || refreshing) return
    reloading.current = true
    refresh()
  }, [online, refreshing, refresh])

  const openOrder = useCallback((order: any) => setSelected(order), [])
  const rowsProps = {
    onNavigationRedirect,
    // The board applies the server's answer to its own lists: no socket event is needed for the app's own actions.
    handleChangeOrderStatus: split.changeOrderStatus,
    handleSendCustomerReview,
    loadingChangeOrder,
    selectedId: selected?.id
  }

  const openHistory = () => {
    split.setTab('history')
    setHistoryOpen(true)
  }
  const closeHistory = () => {
    setHistoryOpen(false)
    split.setTab('new')
  }
  // A History order opens in the panel of the board it is closed over.
  const openFromHistory = (order: any) => {
    closeHistory()
    openOrder(order)
  }

  // With a filter on the columns hold the search's results (every status, split here as the phone's tabs split them); without
  // one, the controller's open orders.
  const lists = split.searching ? split.resultLists : split
  const noOrders = !lists.newOrders.length && !lists.preparing.length && !lists.ready.length && !lists.withDriver.length
  const ready = [...lists.ready, ...lists.withDriver]
  // The column's cards: the orders with a driver follow the ones that wait for pickup.
  const newItems = useMemo(() => sectionItems([{ key: 'new', section: 'new', rows: lists.newOrders }]), [lists.newOrders])
  const preparingItems = useMemo(() => sectionItems([{ key: 'preparing', section: 'preparing', rows: lists.preparing }]), [lists.preparing])
  const readyItems = useMemo(() => sectionItems([
    { key: 'ready', section: 'ready', rows: lists.ready },
    { key: 'with_driver', section: 'with_driver', rows: lists.withDriver }
  ]), [lists.ready, lists.withDriver])
  // The open orders come a page at a time; the search's results (every status) a page at a time too.
  const onEnd = split.searching ? (split.canLoadMore ? split.loadMore : undefined) : split.canLoadMoreOpen ? split.loadMoreOpen : undefined
  const columns = () => {
    if (split.loading) {
      return ['new', 'preparing', 'ready'].map((key) => (
        <View style={styles.column} key={key} testID={`board-skeleton-${key}`}><OrdersSkeleton count={2} /></View>
      ))
    }
    // Nothing to show and the list could not load (the API said no, or there is no network and no copy): one state.
    if (split.error && noOrders) {
      return <NotFoundSource fill {...emptyOf(online ? 'error' : 'offline', split.error)} />
    }
    // A search that matched nothing at all, in any status: the phone's "no results", not three empty columns.
    if (split.searching && !split.results.length) {
      return <NotFoundSource fill {...emptyOf('results', split.error)} />
    }
    return (
      <>
        <BoardColumn styles={styles} testID='board-column-new' title={t('NEW', 'New')} onEndReached={onEnd} empty={!lists.newOrders.length} emptyText={t('NO_NEW_ORDERS', 'No new orders')} items={newItems} rowsProps={rowsProps} onOpenOrder={openOrder} />
        <BoardColumn styles={styles} testID='board-column-preparing' title={t('STAGE_PREPARING', 'Preparing')} onEndReached={onEnd} empty={!lists.preparing.length} emptyText={t('NO_ORDERS_PREPARING', 'No orders being prepared')} items={preparingItems} rowsProps={rowsProps} onOpenOrder={openOrder} />
        <BoardColumn styles={styles} testID='board-column-ready' title={t('STAGE_READY', 'Ready')} onEndReached={onEnd} empty={!ready.length} emptyText={t('NO_ORDERS_READY', 'No orders ready for pickup')} items={readyItems} rowsProps={rowsProps} onOpenOrder={openOrder} />
      </>
    )
  }

  return (
    <View style={styles.page} testID='orders-board'>
      <View style={styles.header} testID='board-header'>
        {showTitle && <OText style={styles.title} numberOfLines={1}>{t('ORDERS', 'Orders')}</OText>}
        <StoreFilter testID='board-store-filter' style={styles.store} />
        <View style={styles.spacer} />
        <View style={styles.actions}>
          {showStatus && <WebsocketStatus />}
          {showRefresh && (
            <OButton
              iconOnly
              color='neutral'
              appearance='ghost'
              icon={<Icon name='refresh' />}
              loading={split.refreshing}
              disabled={!online}
              onClick={refreshNow}
              accessibilityLabel={t('REFRESH_ORDERS', 'Refresh orders')}
              testID='orders-refresh'
            />
          )}
          <OButton
            appearance='ghost'
            color='neutral'
            size='md'
            icon={<Icon name='time-outline' />}
            text={t('HISTORY', 'History')}
            onClick={openHistory}
            testID='board-history-button'
          />
          {showSearch && (
            <OButton
              iconOnly
              color={searchState.hasFilters ? 'primary' : 'neutral'}
              appearance={searchState.hasFilters ? 'tonal' : 'ghost'}
              icon={<Icon name='search' />}
              onClick={() => searchState.setOpen(true)}
              accessibilityLabel={t('SEARCH_ORDERS', 'Search orders')}
              testID='orders-search'
            />
          )}
        </View>
      </View>

      {(!online || searchState.hasFilters) && (
        <View style={styles.notices}>
          <OrdersNotices split={split} searchState={searchState} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.columns} testID='board-columns'>{columns()}</View>
        {!!selected && (
          <View style={styles.panel} testID='board-panel'>
            <OrderDetailsPage
              key={selected.id}
              presentation='panel'
              orderId={selected.id}
              order={selected}
              navigation={navigation}
              onClose={() => setSelected(null)}
            />
          </View>
        )}
      </View>

      <BoardHistory open={historyOpen} onClose={closeHistory} split={split} rowsProps={rowsProps} onOpenOrder={openFromHistory} styles={styles} />
      <OrdersSearchModal searchState={searchState} showSla={enterprise} />
    </View>
  )
}

/** The kitchen board: `OrdersSource` (the orders' controller, as the phone list mounts it) with the board's UI. */
export const OrdersBoard = (props: any) => <OrdersSource {...props} UIComponent={OrdersBoardUI} />
