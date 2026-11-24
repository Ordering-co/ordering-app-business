import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { OrderListGroups, useConfig, useLanguage } from '@components'
import { NotificationSetting } from '@ui'
import { _retrieveStoreData, _setStoreData } from '../../providers/StoreUtil'
import { ORDER_GROUP_STATUS } from './orderStatusGroups'
import { orderStatusList } from './orderStatuses'
import { SEARCH_ENCODES_PERCENT } from './searchText'
import { emptyKeptSearch, KeptSearchContext } from './keptSearch'
import { searchPart, storeKey, useStoreFilter, withStore } from './ordersView'

const COMBINE_KEY = 'combine_pending_and_progress_orders'

/**
 * `combine_pending_and_progress_orders` is a layout flag: tabs "Active" and "History" instead of "New", "In progress"
 * and "History". The server's config decides; the last value is kept for an app that starts offline.
 */
export const useCombinedLayout = (): boolean => {
  const [{ configs }] = useConfig()
  const flag = configs?.combine_pending_and_progress_orders
  const known = !!flag && typeof flag === 'object'
  const [stored, setStored] = useState(false)
  useEffect(() => {
    let alive = true
    _retrieveStoreData(COMBINE_KEY).then((value: any) => alive && setStored(value === true))
    return () => { alive = false }
  }, [])
  useEffect(() => {
    if (known) _setStoreData(COMBINE_KEY, flag.value === '1')
  }, [known, flag?.value])
  return known ? flag.value === '1' : stored
}

/**
 * Wraps the UI of the orders. Two jobs, both about the controller's `filtered`:
 *
 * - The controller's filter is kept in the page's box (`KeptSearchContext`) and given back to a controller that mounts without
 *   one (the tablet was turned and the other layout took over), so a rotation keeps the filter.
 * - The store view (the store chosen in the search and filter sheet, or in the header's chip) is the controller's `business`
 *   filter, but it is not a search: the screens are given `filtered` without it (a store alone is `null`: no result tabs), and a
 *   search they make carries the store. The store itself lives outside the controller (`useStoreFilter`), so the open orders and
 *   History are read again for it whenever it changes, and a controller that mounts with a store chosen is told it.
 */
const KeepsFilter = ({ UI, ...props }: any) => {
  const box = useContext(KeptSearchContext)
  const { store, getStore } = useStoreFilter()
  const business = store?.id ?? ''
  const { filtered: asked, onFiltered: onAsk, loadOrders, currentTabSelected, ordersGroup } = props
  const filtered = useMemo(() => searchPart(asked), [asked])
  // The store is read at the moment of the call: a search applied together with a store (the sheet's Apply) asks with the new one.
  const onFiltered = useCallback((next: any) => onAsk?.(withStore(next, getStore()?.id ?? '')), [onAsk, getStore])

  // The controller asks with the store chosen: its filter holds it, and drops it when it is cleared.
  const askedBusiness = asked?.business ? storeKey(asked.business) : ''
  useEffect(() => {
    if (askedBusiness !== business) onAsk?.(withStore(filtered, business))
  }, [askedBusiness, business]) // eslint-disable-line react-hooks/exhaustive-deps

  // The lists that were read for another store are read again for this one: the one in view now, the other when it is opened.
  // A list still arriving (the first read of a controller that mounted with a store chosen) is waited for, so the answers never cross.
  const readFor = useRef('')
  const outdated = useRef(new Set<string>())
  const slot = currentTabSelected === 'completed' ? 'completed' : 'active'
  const slotFetched = !!ordersGroup?.[slot]?.fetched
  const slotLoading = !!ordersGroup?.[slot]?.loading
  useEffect(() => {
    if (askedBusiness !== business) return
    if (readFor.current !== business) {
      readFor.current = business
      outdated.current = new Set(['active', 'completed'])
    }
    if (!outdated.current.has(slot) || slotLoading) return
    outdated.current.delete(slot)
    if (slotFetched) loadOrders?.({ newFetch: true })
  }, [askedBusiness, business, slot, slotFetched, slotLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // The first pass: a kept filter is on its way back into the controller; it must not be taken for a cleared one.
  const restoring = useRef(!!box?.current?.filters && !filtered)
  useEffect(() => {
    if (restoring.current && box?.current?.filters) onFiltered?.(box.current.filters)
  // Once, when the controller starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!box) return
    if (restoring.current) {
      if (!filtered) return
      restoring.current = false
    }
    if (filtered) box.current = { ...(box.current ?? emptyKeptSearch()), filters: filtered }
    else box.current = null
  }, [box, filtered])
  return <UI {...props} filtered={filtered} onFiltered={onFiltered} />
}

/** One wrapper per UI, made once: its identity must hold, or the controller would remount the whole screen at every render. */
const wrappers = new WeakMap<object, React.ComponentType<any>>()
const keepingFilter = (UI: React.ComponentType<any>): React.ComponentType<any> => {
  let wrapped = wrappers.get(UI)
  if (!wrapped) {
    wrapped = (props: any) => <KeepsFilter UI={UI} {...props} />
    wrappers.set(UI, wrapped)
  }
  return wrapped
}

/**
 * The orders' controller (`OrderListGroups`) as every screen of orders uses it (the phone list and the tablet board)
 * and nothing else: one slot of every open order and one of History (see the `orders` contract), the app's names for
 * the 27 statuses and the layout flag. The `UIComponent` calls `useOrdersSplit(props)` for the rest.
 */
export const OrdersSource = ({ UIComponent, checkNotification, ...props }: any) => {
  const [, t] = useLanguage()
  const combinedLayout = useCombinedLayout()
  const orderStatus = useMemo(() => orderStatusList(t), [t])
  const [checkNotificationStatus, setCheckNotificationStatus] = useState({ open: false, checked: false })
  const Wrapped = keepingFilter(UIComponent)

  return (
    <>
      <OrderListGroups
        {...props}
        UIComponent={Wrapped}
        useDefualtSessionManager
        asDashboard
        combineTabs
        combinedLayout={combinedLayout}
        orderGroupStatusCustom={ORDER_GROUP_STATUS}
        // The controller encodes the search text (`encodeURI`) for what is not iOS: both platforms take that path (see `searchText.ts`).
        isIos={!SEARCH_ENCODES_PERCENT}
        orderStatus={orderStatus}
        // Connected unless the network says it is not (an unknown state is connected: the lists load).
        isNetConnected={props.isNetConnected !== false}
      />
      {checkNotification && (
        <NotificationSetting
          checkNotificationStatus={checkNotificationStatus}
          setCheckNotificationStatus={setCheckNotificationStatus}
        />
      )}
    </>
  )
}
