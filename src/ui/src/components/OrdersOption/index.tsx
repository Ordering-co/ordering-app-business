import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { RefreshControl, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage } from '@components'
import { WebsocketStatus } from '@ui'
import { themePart, themeVisible } from '@/theme/helpers'
import { Icon, OButton, ONavbar, Tabs } from '../shared'
import { OrderRowsList, OrdersSkeleton, sectionItems, type OrderListItem } from '../PreviousOrders'
import { ordersOptionStyles } from './styles'
import { OrdersSource } from './OrdersSource'
import { useOrdersSplit, type HistoryFilter } from './useOrdersSplit'
import { useOrdersSearch } from './useOrdersSearch'
import { OrdersSearchModal } from './OrdersSearchForm'
import { OrdersNotices } from './OrdersNotices'
import { StageChips } from './StageChips'
import { StoreFilter } from './StoreFilter'
import { NotFoundSource } from '../NotFoundSource'
import { useOrdersEmpty, type EmptyKind } from './emptyContent'
import { StoreStatusCard } from './StoreStatusCard'
import type { OrderSection } from './orderStatusGroups'

export { OrdersSource, useCombinedLayout } from './OrdersSource'
export { useOrdersSplit } from './useOrdersSplit'
export { useOrdersSearch } from './useOrdersSearch'
export { OrdersSearchModal } from './OrdersSearchForm'
export { OrdersNotices } from './OrdersNotices'
export { useOrdersEmpty, type EmptyKind } from './emptyContent'
export { splitOrders, buildRows, flattenOrders } from './splitOrders'
export * from './orderStatusGroups'

/**
 * The orders tab on the phone (Main, OrdersInProgress, OrdersHistory, OrdersSearch, OrdersOffline, OrdersEmpty): the
 * title with the connection state and the search, the tabs, the notices (offline, filters on) and
 * the list. The data is `useOrdersSplit`; the list is `PreviousOrders` rows of `OrderCard`s.
 */
const OrdersOptionUI = (props: any) => {
  const { onNavigationRedirect, handleSendCustomerReview, handleClickOrder, loadingChangeOrder } = props
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig()
  const styles = useMemo(() => ordersOptionStyles(theme), [theme])
  const split = useOrdersSplit(props)
  const searchState = useOrdersSearch(props)
  // The pull-to-refresh spinner in the theme's spinner color, on both platforms.
  const refreshColors = useMemo(() => [themePart(theme, 'spinner', 'base.color')], [theme])

  const online = split.isNetConnected !== false
  const showTitle = themeVisible(theme, 'orders.title')
  const showStatus = themeVisible(theme, 'connection_status')
  const showSearch = themeVisible(theme, 'orders.search')
  const showRefresh = themeVisible(theme, 'orders.refresh')
  // The refresh button has its own key (`orders.refresh`); pull to refresh is never hidden.
  const hasActions = showStatus || showRefresh || showSearch
  // The refresh button reloads what the pull does (`split.refresh`: every slot and the chips' lists) and shows it works. It cannot be
  // pressed again until the reload is over: the ref closes the gap before the render that disables the button.
  const reloading = useRef(false)
  useEffect(() => { if (!split.refreshing) reloading.current = false }, [split.refreshing])
  const { refresh, refreshing } = split
  const refreshNow = useCallback(() => {
    if (!online || reloading.current || refreshing) return
    reloading.current = true
    refresh()
  }, [online, refreshing, refresh])
  const enterprise = !!(configs?.plan_enterprise && configs?.plan_enterprise?.value)

  const sectionTitle: Record<OrderSection, string> = {
    new: t('NEW', 'New'),
    preparing: t('STAGE_PREPARING', 'Preparing'),
    ready: t('READY_FOR_PICKUP', 'Ready for pickup'),
    with_driver: t('STAGE_WITH_DRIVER', 'With driver'),
    history: t('HISTORY', 'History')
  }

  const rowsProps = {
    onNavigationRedirect,
    handleClickOrder,
    // The list applies the server's answer to its own lists: no socket event is needed for the app's own actions.
    handleChangeOrderStatus: split.changeOrderStatus,
    handleSendCustomerReview,
    loadingChangeOrder
  }

  // The stages of In progress as chips.
  const stageChips = useMemo(() => ([
    { key: 'all' as const, text: t('ALL', 'All') },
    { key: 'preparing' as const, text: t('STAGE_PREPARING', 'Preparing') },
    { key: 'ready' as const, text: t('READY_FOR_PICKUP', 'Ready for pickup') },
    { key: 'with_driver' as const, text: t('STAGE_WITH_DRIVER', 'With driver') }
  ]), [t])

  // The two chips of New.
  const newStageChips = useMemo(() => ([
    { key: 'pending' as const, text: t('PENDING', 'Pending') },
    { key: 'preorder' as const, text: t('PREORDER', 'Preorder') }
  ]), [t])

  // The three chips of History.
  const historyStageChips = useMemo<Array<{ key: HistoryFilter, text: string }>>(() => ([
    { key: 'all', text: t('ALL', 'All') },
    { key: 'completed', text: t('COMPLETED', 'Completed') },
    { key: 'cancelled', text: t('CANCELLED', 'Cancelled') }
  ]), [t])

  const emptyOf = useOrdersEmpty()
  const emptyKind: EmptyKind = split.error
    ? (online ? 'error' : 'offline')
    : split.searching ? 'results'
      // Each tab says its own: History by its chip, New by its chip, In progress by its stage.
      : split.tab === 'history' ? (split.historyFilter === 'all' ? 'history' : split.historyFilter)
        : split.tab === 'new' ? (split.newStageShown && split.newStage === 'preorder' ? 'preorder' : 'new')
          : split.tab === 'active' ? 'active'
            : split.stageShown && split.stage !== 'all' ? split.stage : 'progress'

  // What the list shows: its rows (titles and cards), and around them the state the rows cannot say.
  const items = useMemo<OrderListItem[]>(() => {
    if (split.loading) return []
    if (split.searching) return sectionItems([{ key: 'results', showStatus: true, rows: split.tabResults }])
    if (split.tab === 'history') {
      return sectionItems(split.history.map((day) => ({
        key: day.day, title: day.label, titleTestID: `orders-day-${day.day}`, section: 'history' as const, compact: true, rows: day.orders
      })))
    }
    const chipList = split.stageShown || split.newStageShown
    return sectionItems(split.sections.map((section) => {
      // A chip's list (All, Pending, Preorder too) is one list with no title: the chip names it, each card's band says its status.
      const key = section.key
      // "All", "Pending" and "Preorder" are no section of the open orders: each order's own status is its band.
      const own: OrderSection | undefined = key === 'all' || key === 'pending' || key === 'preorder' ? undefined : key
      return {
        key,
        // The New tab is one list: it has no title. Nor has a chip's list.
        title: split.tab === 'new' || chipList || !own ? undefined : sectionTitle[own],
        titleTestID: `orders-section-${key}`,
        section: own,
        rows: section.orders
      }
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [split.loading, split.searching, split.tabResults, split.tab, split.history, split.sections, split.stageShown, split.newStageShown, t])

  // History's chips stand under the tabs like the stage chips of New and of In progress: they stay while the list loads.
  const historyShown = !split.searching && split.tab === 'history'

  const loadMore = !split.searching && split.tab === 'history' && split.canLoadMore
    ? (
      <View style={styles.footer}>
        <OButton
          appearance='outline'
          color='neutral'
          text={t('LOAD_MORE', 'Load more')}
          onClick={split.loadMore}
          testID='orders-load-more'
        />
      </View>
      )
    : null

  // No row to show: the skeleton while it loads, else what the empty list says (the New list adds the store's state).
  const empty = split.loading
    ? <OrdersSkeleton />
    : (
      <View style={styles.empty}>
        <NotFoundSource fill {...emptyOf(emptyKind, split.error)} />
        {!split.searching && split.tab !== 'history' && emptyKind === 'new' && online && <StoreStatusCard />}
      </View>
      )

  return (
    <>
      {(showTitle || hasActions) && (
        <ONavbar
          testID='orders-header'
          tight
          // The pill's text gives way before the title does, and the buttons never do.
          titleFirst
          // A ghost button's glyph sits at the gutter (its box reaches into it); a filled one, with a filter on, has its box edge there.
          rightButtons={!searchState.hasFilters}
          title={showTitle ? t('ORDERS', 'Orders') : undefined}
          right={hasActions
            ? (
              <View style={styles.headerActions}>
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
                {showSearch && (
                  <OButton
                    iconOnly
                    // With a filter on, the button is painted as selected.
                    color={searchState.hasFilters ? 'primary' : 'neutral'}
                    appearance={searchState.hasFilters ? 'tonal' : 'ghost'}
                    icon={<Icon name='search' />}
                    onClick={() => searchState.setOpen(true)}
                    accessibilityLabel={t('SEARCH_ORDERS', 'Search orders')}
                    testID='orders-search'
                  />
                )}
              </View>
              )
            : undefined}
        />
      )}
      <View style={styles.body}>
        {(!online || searchState.hasFilters) && (
          <View style={styles.gutter}>
            <OrdersNotices split={split} searchState={searchState} />
          </View>
        )}
        {/* The store filter: which store's orders every list and History show (only with more than one store). */}
        <StoreFilter style={styles.gutter} />
        {/* The tabs stay with a filter on (OrdersOffline): they split the results by the status of each order. */}
        <View style={styles.gutter} testID='orders-tabs'>
          <Tabs
            fill
            size='sm'
            tabs={split.tabs}
            selected={split.tab}
            onChange={(key) => split.setTab(key)}
          />
        </View>
        {split.stageShown && (
          <StageChips
            chips={stageChips}
            selected={split.stage}
            onSelect={split.setStage}
          />
        )}
        {split.newStageShown && (
          <StageChips
            chips={newStageChips}
            selected={split.newStage}
            onSelect={split.setNewStage}
            testID='orders-new-stages'
          />
        )}
        {historyShown && (
          <StageChips
            chips={historyStageChips}
            selected={split.historyFilter}
            onSelect={split.setHistoryFilter}
            testID='orders-history-chips'
            chipTestID='orders-history'
          />
        )}
        <OrderRowsList
          items={items}
          {...rowsProps}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled
          // The open orders come a page at a time: the next one when the end of the list is reached.
          onEndReached={split.searching
            ? (split.canLoadMore ? split.loadMore : undefined)
            : split.canLoadMoreOpen && split.tab !== 'history' ? split.loadMoreOpen : undefined}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={empty}
          ListFooterComponent={loadMore ?? undefined}
          refreshControl={(
            <RefreshControl
              refreshing={split.refreshing}
              tintColor={refreshColors[0]}
              colors={refreshColors}
              onRefresh={() => { if (online) split.refresh() }}
            />
          )}
        />
      </View>
      <OrdersSearchModal searchState={searchState} showSla={enterprise} />
    </>
  )
}

/** The orders tab: `OrdersSource` (the controller) with the phone's UI. */
export const OrdersOption = (props: any) => <OrdersSource {...props} UIComponent={OrdersOptionUI} />
