import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'styled-components/native'

import { useEvent, useLanguage, useUtils } from '@components'
import dayjs from '@/utils/dayjs'
import { useFormats } from '@/hooks/useFormats'
import { themeVisible } from '@/theme/helpers'
import { useCatchUp } from '../../../../context/SocketReconnectContext'
import { apiErrorText } from '../../utils/errorText'
import { buildRows, flattenOrders, groupByDay, historyMoment, splitOrders, type DayGroup, type OrderRow, type OrdersSplitLists } from './splitOrders'
import { CANCELLED_STATUSES, COMPLETED_STATUSES, HISTORY_STATUSES, NEW_STATUSES, type OrderSection } from './orderStatusGroups'
import { LIST_STATUSES } from './orderQuery'
import { useOrdersCache } from './useOrdersCache'
import { applyOrderChange, changedOrdersFromAnswer, ORDER_CHANGED_EVENT, overlayChanges, sameOrder } from './orderChanges'
import { storeIdOf } from '../PreviousOrders/storesSeen'
import { storeKey, useNewStage, useStage, useStoreFilter, type ListKey, type NewStage, type Stage } from './ordersView'
import { useStageOrders } from './useStageOrders'

export type OrdersTabKey = 'new' | 'progress' | 'active' | 'history'
export type HistoryFilter = 'all' | 'completed' | 'cancelled'

/** A tab is its text: the app shows no number of orders. */
export interface OrdersTab { key: OrdersTabKey, text: string }
/** A list of the screen: a section of the open orders, or what a chip opens (`all`, `pending`, `preorder` are chips' lists, with no title). */
export interface OrdersSection { key: OrderSection | 'all' | 'pending' | 'preorder', orders: OrderRow[] }

/**
 * The search results as the board lays them out (the stages and History, as without a filter, holding only what matches): the
 * open results split by status, and the closed ones by day (narrowed by the History chip).
 */
export interface ResultLists extends OrdersSplitLists {
  history: DayGroup[]
}

export interface OrdersSplit {
  combinedLayout: boolean
  tabs: OrdersTab[]
  tab: OrdersTabKey
  setTab: (key: OrdersTabKey) => void
  searching: boolean
  results: OrderRow[]
  /** The search results of the tab in view (the tabs stay while a filter is on: New, In progress and History split the results). */
  tabResults: OrderRow[]
  /** The same results as the board draws them: its columns and its History (`searching` only; empty without a filter). */
  resultLists: ResultLists
  sections: OrdersSection[]
  newOrders: OrderRow[]
  preparing: OrderRow[]
  ready: OrderRow[]
  withDriver: OrderRow[]
  history: DayGroup[]
  historyFilter: HistoryFilter
  setHistoryFilter: (filter: HistoryFilter) => void
  loading: boolean
  refreshing: boolean
  error: string | null
  canLoadMore: boolean
  loadMore: () => void
  refresh: () => void
  /** The controller's `handleChangeOrderStatus`, applying the server's answer to the lists (no socket event needed). */
  changeOrderStatus: (...args: any[]) => Promise<any>
  isNetConnected: boolean | null
  lastUpdate: string | null
  /** The open orders are all loaded (`false` while the later pages of the controller are still coming). */
  complete: boolean
  /** The list in view can ask for its next page (the end of the list was reached): the open orders', or the open stage's. */
  canLoadMoreOpen: boolean
  loadMoreOpen: () => void
  /** The stage chips of In progress are drawn (`orders.stage_filter`, the In progress tab, no search) and the list is the stage's own. */
  stageShown: boolean
  stage: Stage
  setStage: (stage: Stage) => void
  /** The Pending and Preorder chips of New are drawn (the same key, the New tab, no search) and the list is the chip's own. */
  newStageShown: boolean
  newStage: NewStage
  setNewStage: (stage: NewStage) => void
}

interface SplitOptions {
  /** The kitchen board shows every stage at once: each of New, Preparing and Ready must fill before the loading stops. */
  allStages?: boolean
}

/**
 * The open orders come a page (50) at a time, newest first: the next page is asked for when the list's end is reached, and
 * by itself only while what the view shows is shorter than a screen (the older stages sit behind a long New list), at most
 * `AUTO_LOAD_PAGES` pages in a row. The rows mounted never depend on how many orders are loaded (the lists are virtualized):
 * a page costs its request and one pass over the loaded orders (flatten, split, group), not more cards.
 */
const AUTO_LOAD_PAGES = 6
/** Rows a view needs before the loading by itself stops. */
const FILL_ROWS = 8
/** A pull-to-refresh spinner never stays longer than this (ms) if the list never reports it loaded. */
const REFRESH_LIMIT = 10000

/** Drops the overlay without a render when there is none. */
const noChanges = (previous: Record<string, any>) => (Object.keys(previous).length ? {} : previous)

/** The tab a search result belongs to: History for a closed order, New for a pending one, else In progress (Active when combined). */
const resultTabOf = (status: any, combined: boolean): OrdersTabKey =>
  HISTORY_STATUSES.includes(Number(status)) ? 'history' : combined ? 'active' : NEW_STATUSES.includes(Number(status)) ? 'new' : 'progress'

const sameSet = (a: number[] | undefined, b: number[]) => !!a && a.length === b.length && b.every((status) => a.includes(status))

/**
 * What a chip's list holds in the offline copy: the loaded open orders of its statuses, newest first. "All" is every open order but
 * the new ones.
 */
const copyOf = (orders: any[], key: ListKey): OrderRow[] =>
  buildRows(orders
    .filter((order) => LIST_STATUSES[key].includes(Number(order.status)))
    .sort((a, b) => Number(b.id) - Number(a.id)))

/** The tab a layout can show: the combined layout has no New and In progress tabs, nor the other no Active. */
const tabFor = (tab: OrdersTabKey, combined: boolean): OrdersTabKey =>
  tab === 'history' ? tab : combined ? 'active' : tab === 'active' ? 'new' : tab

/**
 * The single hook over the `OrderListGroups` controller (see the `orders` contract): the open orders in one list,
 * split on the client into New and the stages (Preparing, Ready, With driver), History by day, the
 * search results, pagination, refresh and the offline copy. The app shows no number of orders (no counters, no request for totals). Call it in
 * the `UIComponent` with the props the controller gives (and `combinedLayout` / `isNetConnected` of `OrdersSource`).
 */
export const useOrdersSplit = (props: any, options: SplitOptions = {}): OrdersSplit => {
  const {
    ordersGroup,
    currentTabSelected,
    setCurrentTabSelected,
    setCurrentFilters,
    setOrdersGroup,
    loadOrders,
    loadMoreOrders,
    handleChangeOrderStatus,
    filtered,
    onFiltered,
    ordersFiltered,
    tabRequest,
    navigation,
    combinedLayout: combinedProp
  } = props
  const combined = !!combinedProp
  const online = props.isNetConnected !== false
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ parseDate }] = useUtils()
  const { date: dateOf } = useFormats()
  const [events] = useEvent()

  const searching = !!filtered
  // The store the lists are narrowed to (`useStoreFilter`): the controller reads its orders for it, and the socket's events of
  // other stores, which it adds to its lists whatever the filter, are kept out here.
  const { store } = useStoreFilter()
  const business = store?.id ?? ''
  const [newStage, setNewStage] = useNewStage()
  const ofStore = useCallback((orders: any[]) => (business ? orders.filter((order) => storeKey(storeIdOf(order)) === business) : orders), [business])
  const [tab, setTabState] = useState<OrdersTabKey>(combined ? 'active' : 'new')
  const current = tabFor(tab, combined)
  const setTab = useCallback((key: OrdersTabKey) => setTabState(tabFor(key, combined)), [combined])

  // The shell asks for a tab (the new-order alert's "View orders"): `{ tab, stage?, at }` in the route's params. The ask
  // clears a search (its results span every status), picks the tab and is consumed, so coming back to the tab later
  // does not select it again; `at` makes a repeated ask for the same tab a new one.
  useEffect(() => {
    if (!tabRequest?.at) return
    if (filtered) onFiltered?.(null)
    if (tabRequest.tab === 'new' || tabRequest.tab === 'progress' || tabRequest.tab === 'active' || tabRequest.tab === 'history') {
      const asked = tabFor(tabRequest.tab, combined)
      setTabState(asked)
      // The chip of the order that rang: Preorder when the ask says so (a preorder rang), else Pending. Not drawn (the chips
      // off, the combined layout) the choice only waits in the view's memory: harmless.
      if (asked === 'new') setNewStage(tabRequest.stage === 'preorder' ? 'preorder' : 'pending')
    }
    navigation?.setParams?.({ tab: undefined, stage: undefined, at: undefined })
  }, [tabRequest?.at])

  // The controller holds two slots: the open orders (`active`) and History (`completed`). The tab picks the slot.
  const wanted = current === 'history' ? 'completed' : 'active'
  useEffect(() => {
    if (!searching && currentTabSelected !== wanted) setCurrentTabSelected?.(wanted)
  }, [wanted, currentTabSelected, searching])

  const activeSlot = ordersGroup?.active
  const completedSlot = ordersGroup?.completed

  // The open orders. While the slot reloads empty (a refresh, a slot switch) the last list stays, so the lists never blink.
  const flatActive = useMemo(() => ofStore(flattenOrders(activeSlot?.orders)), [activeSlot?.orders, ofStore])
  const lastActive = useRef(flatActive)
  if (!(activeSlot?.loading && !flatActive.length)) lastActive.current = flatActive
  const activeOrders = lastActive.current
  const lists = useMemo(() => splitOrders(activeOrders), [activeOrders])

  // The chips (`orders.stage_filter`): the stages of In progress (All, Preparing, Ready for pickup, With driver) and Pending / Preorder
  // of New. The chip in view has its own paged list (`useStageOrders`); the open orders of the controller still feed the board, the
  // offline copy and the search.
  const stageFilterOn = themeVisible(theme, 'orders.stage_filter') && !combined && !options.allStages
  const stageShown = stageFilterOn && !searching && current === 'progress'
  const newStageShown = stageFilterOn && !searching && current === 'new'
  const listShown = stageShown || newStageShown
  const [stage, setStage] = useStage()
  const listKey: ListKey = newStageShown ? newStage : stage
  const held = useRef<{ active: any[] }>({ active: activeOrders })
  const lookup = useCallback((id: number | string) => held.current.active.find((order) => sameOrder(order.id, id)), [])
  const stageList = useStageOrders({ enabled: listShown, stage: listKey, business, online, lookup })
  held.current = { active: activeOrders }

  // The open orders load a page at a time (see AUTO_LOAD_PAGES).
  const activePage = activeSlot?.pagination
  const hasMoreActive = !!activeSlot?.fetched && !!activePage?.totalPages && activePage.currentPage < activePage.totalPages
  const canLoadMoreActive = online && !searching && currentTabSelected === 'active' && hasMoreActive && !activeSlot?.loading && !activeSlot?.error?.length
  const loadMoreActive = useCallback(() => loadMoreOrders?.({}), [loadMoreOrders])
  // A stage's list loads its own next page; the open orders' list the controller's.
  const canLoadMoreOpen = listShown ? online && stageList.hasMore && !stageList.loadingMore : canLoadMoreActive
  const loadMoreOpen = listShown ? stageList.loadMore : loadMoreActive
  const viewRows = options.allStages
    ? Math.min(lists.newOrders.length, lists.preparing.length, lists.ready.length + lists.withDriver.length)
    : current === 'new' ? (newStageShown ? FILL_ROWS : lists.newOrders.length)
      // A chip reads its own first page: the open orders do not load for it.
      : current === 'progress' ? (stageShown ? FILL_ROWS : lists.preparing.length + lists.ready.length + lists.withDriver.length)
        : current === 'active' ? lists.counts.active : FILL_ROWS
  useEffect(() => {
    if (!canLoadMoreActive || viewRows >= FILL_ROWS || activePage.currentPage >= AUTO_LOAD_PAGES) return
    loadMoreActive()
  }, [canLoadMoreActive, viewRows, activePage?.currentPage])

  // History: the chips narrow the slot's statuses (the controller fetches and the socket handlers keep only those).
  const filterIds: number[] = completedSlot?.currentFilter ?? HISTORY_STATUSES
  const historyFilter: HistoryFilter = sameSet(filterIds, COMPLETED_STATUSES) ? 'completed' : sameSet(filterIds, CANCELLED_STATUSES) ? 'cancelled' : 'all'
  const setHistoryFilter = useCallback((filter: HistoryFilter) => {
    const ids = filter === 'completed' ? COMPLETED_STATUSES : filter === 'cancelled' ? CANCELLED_STATUSES : HISTORY_STATUSES
    setCurrentFilters?.(ids)
    setOrdersGroup?.((previous: any) => ({ ...previous, completed: { ...previous.completed, currentFilter: ids } }))
  }, [setCurrentFilters, setOrdersGroup])

  const flatHistory = useMemo(() => ofStore(flattenOrders(completedSlot?.orders)).filter((order) => filterIds.includes(Number(order.status))), [completedSlot?.orders, filterIds, ofStore])
  // A closed order is filed under its day (the device's): "Today", "Yesterday" and the date.
  const historyDayOf = useCallback((order: any) => {
    const moment = historyMoment(order)
    if (!moment) return ''
    const utc = !!order.delivery_datetime_utc || (!order.delivery_datetime && !!order.created_at)
    return parseDate(moment, { outputFormat: 'YYYY-MM-DD', utc })
  }, [parseDate])
  const historyDayLabel = useCallback((day: string) => {
    const date = dayjs(day)
    if (date.isSame(dayjs(), 'day')) return t('TODAY', 'Today')
    if (date.isSame(dayjs().subtract(1, 'day'), 'day')) return t('YESTERDAY', 'Yesterday')
    return date.isValid() ? dateOf(day, { utc: false }) : day
  }, [dateOf, t])
  const history = useMemo(() => groupByDay(flatHistory, historyDayOf, historyDayLabel), [flatHistory, historyDayOf, historyDayLabel])

  // The search results: every status, as the controller's own list, with the app's own changes laid over it (`overlayChanges`).
  const [filteredChanges, setFilteredChanges] = useState<Record<string, any>>({})
  const resultOrders = useMemo(
    () => overlayChanges(flattenOrders(ordersFiltered?.orders), filteredChanges),
    [ordersFiltered?.orders, filteredChanges]
  )
  const results = useMemo(() => buildRows(resultOrders), [resultOrders])
  const tabResults = useMemo(
    () => buildRows(resultOrders.filter((order) => resultTabOf(order.status, combined) === current)),
    [resultOrders, combined, current]
  )
  // The results laid out as the board does without a filter: the open ones in their stages, the closed ones by day.
  const resultLists = useMemo<ResultLists>(() => {
    const found = searching ? resultOrders : []
    const open = splitOrders(found)
    const closed = found.filter((order) => HISTORY_STATUSES.includes(Number(order.status)) && filterIds.includes(Number(order.status)))
    return { ...open, history: groupByDay(closed, historyDayOf, historyDayLabel) }
  }, [resultOrders, searching, filterIds, historyDayOf, historyDayLabel])
  // A search opens on a tab that holds a result: the tab it was made from may hold none of them. The board has no tabs to open:
  // its History is a screen of its own that its button opens.
  useEffect(() => {
    if (options.allStages || !searching || !resultOrders.length || resultOrders.some((order) => resultTabOf(order.status, combined) === current)) return
    setTabState(resultTabOf(resultOrders[0].status, combined))
    // The tab is read when the results change, never when the user picks another one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching, resultOrders])
  // A new search starts from the server's answer.
  useEffect(() => { setFilteredChanges(noChanges) }, [filtered])

  // What the current tab lists.
  const sections = useMemo<OrdersSection[]>(() => {
    // The chips: the chip in view is one list, its own (offline, the copy the open orders hold of it).
    if (listShown) {
      const rows = online ? stageList.rows : copyOf(activeOrders, listKey)
      return rows.length ? [{ key: listKey, orders: rows }] : []
    }
    const all: OrdersSection[] = [
      { key: 'new', orders: lists.newOrders },
      { key: 'preparing', orders: lists.preparing },
      { key: 'ready', orders: lists.ready },
      { key: 'with_driver', orders: lists.withDriver }
    ]
    const wantedKeys: Array<OrdersSection['key']> = current === 'new' ? ['new'] : current === 'progress' ? ['preparing', 'ready', 'with_driver'] : current === 'active' ? ['new', 'preparing', 'ready', 'with_driver'] : []
    return all.filter((section) => wantedKeys.includes(section.key) && section.orders.length > 0)
  }, [lists, current, listShown, listKey, activeOrders, online, stageList.rows])

  const tabs = useMemo<OrdersTab[]>(() => combined
    ? [{ key: 'active', text: t('ACTIVE', 'Active') }, { key: 'history', text: t('HISTORY', 'History') }]
    : [
        { key: 'new', text: t('NEW', 'New') },
        { key: 'progress', text: t('ORDERS_TAB_IN_PROGRESS', 'In progress') },
        { key: 'history', text: t('HISTORY', 'History') }
      ], [combined, t])

  // Loading: nothing to show yet and the list is on its way (or has not started).
  const slot = searching ? ordersFiltered : current === 'history' ? completedSlot : activeSlot
  const shown = searching ? results.length : current === 'history' ? flatHistory.length : activeOrders.length
  const slotLoading = !!slot?.loading || (!searching && !slot?.fetched && !slot?.error?.length && online)
  // A stage's list loads on its own: its skeleton is for its first page only.
  const loading = listShown && online ? stageList.loading : slotLoading && shown === 0
  const anyLoading = !!(activeSlot?.loading || completedSlot?.loading || ordersFiltered?.loading || stageList.busy)

  const [refreshing, setRefreshing] = useState(false)
  const sawLoading = useRef(false)
  useEffect(() => {
    if (!refreshing) { sawLoading.current = false; return }
    if (anyLoading) sawLoading.current = true
    else if (sawLoading.current) setRefreshing(false)
  }, [refreshing, anyLoading])
  useEffect(() => {
    if (!refreshing) return
    const timer = setTimeout(() => setRefreshing(false), REFRESH_LIMIT)
    return () => clearTimeout(timer)
  }, [refreshing])

  const refreshStage = stageList.refresh
  const refresh = useCallback(() => {
    setRefreshing(true)
    setFilteredChanges(noChanges)
    if (searching) loadOrders?.({ newFetch: true }, { allStatusses: true })
    else loadOrders?.({ newFetch: true })
    // The stage lists are the app's own requests: the pull, the button and a reconnect ask them again too.
    refreshStage()
  }, [searching, loadOrders, refreshStage])

  // The socket came back, or the network did: the events of the gap are lost, so the lists load again (once for the two when they come together).
  useCatchUp({ online, refresh })
  // A change queued offline has been sent: what the lists show is the server's again.
  useEffect(() => {
    const handle = () => refresh()
    events.on('offline_actions_synced', handle)
    return () => events.off('offline_actions_synced', handle)
  }, [events, refresh])

  // A status change the app made is applied to the lists from the server's answer; the socket event for it, when it comes, finds the order already there.
  const applyChange = useCallback((change: any) => {
    setOrdersGroup?.((previous: any) => applyOrderChange(previous, change))
    // The search's list is the controller's own and cannot be written: the change is laid over it.
    if (change?.id !== undefined && change?.id !== null && change.status !== undefined) {
      setFilteredChanges((previous) => ({ ...previous, [change.id]: { ...previous[change.id], ...change } }))
    }
  }, [setOrdersGroup])
  const latestHandler = useRef(handleChangeOrderStatus)
  latestHandler.current = handleChangeOrderStatus
  const changeOrderStatus = useCallback(async (...args: any[]) => {
    const answer = await latestHandler.current?.(...args)
    const [status, ids, body] = args
    const asked = Number(body?.status ?? status)
    // Told to everyone who shows an order's status (this list, the board, the Messages tab) by the one event; this list hears it below.
    changedOrdersFromAnswer(answer, Array.isArray(ids) ? ids : [], Number.isFinite(asked) ? asked : undefined).forEach((changed) => events.emit(ORDER_CHANGED_EVENT, changed))
    return answer
  }, [events])
  // Another screen of the app changed an order (the details, the new-order alert) and says so.
  useEffect(() => {
    events.on(ORDER_CHANGED_EVENT, applyChange)
    return () => events.off(ORDER_CHANGED_EVENT, applyChange)
  }, [events, applyChange])

  const pagination = searching ? ordersFiltered?.pagination : current === 'history' ? completedSlot?.pagination : undefined
  const canLoadMore = online && !!pagination?.totalPages && pagination.currentPage < pagination.totalPages && !slot?.loading && !slot?.error?.length && shown > 0
  const loadMore = useCallback(() => loadMoreOrders?.({ allStatusses: searching }), [loadMoreOrders, searching])

  const rawError = listShown && online ? (stageList.rows.length ? null : stageList.error) : slot?.error
  const error = Array.isArray(rawError) && rawError.length ? apiErrorText(rawError, t) : null

  // The offline copy is of every store: a list read for one store is not kept as the copy.
  const lastUpdate = useOrdersCache({ ordersGroup, setOrdersGroup, isNetConnected: props.isNetConnected, keep: !business })

  return {
    combinedLayout: combined,
    tabs,
    tab: current,
    setTab,
    searching,
    results,
    tabResults,
    resultLists,
    sections,
    newOrders: lists.newOrders,
    preparing: lists.preparing,
    ready: lists.ready,
    withDriver: lists.withDriver,
    history,
    historyFilter,
    setHistoryFilter,
    loading,
    refreshing,
    error,
    canLoadMore,
    loadMore,
    refresh,
    changeOrderStatus,
    isNetConnected: props.isNetConnected ?? null,
    lastUpdate,
    complete: !hasMoreActive,
    canLoadMoreOpen,
    loadMoreOpen,
    stageShown,
    stage,
    setStage,
    newStageShown,
    newStage,
    setNewStage
  }
}
