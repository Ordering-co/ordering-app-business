import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import { ToastType, useApi, useLanguage, useToast } from '@components'
import { canPause, getStoreStatus, type StoreStatus } from './storeStatus'
import { PauseOrdersSheet } from './PauseOrdersSheet'
import { useNow } from './useNow'
import { useWhen } from './useWhen'
import type { PauseOption } from './pauseOptions'

export interface PauseStore {
  id: number
  name: string
  slug: string
  business: any
  status: StoreStatus
}

/** What the user's stores need to tell their state and be paused. */
const STORE_FIELDS = ['id', 'name', 'slug', 'enabled', 'open', 'schedule', 'timezone', 'snooze_until']

const PAGE_SIZE = 50

/**
 * The stores' pause state and the sheet that pauses them, for a screen that is not the stores list (the orders'
 * empty state's "Pause orders" card). It asks for the user's stores once (and on `reload`), derives each store's
 * state with `getStoreStatus`, and `openPauseSheet(id?)` opens the same sheet as the Stores tab: with an id, that
 * store; without, a choice among the stores that are accepting orders. Render `sheet` once in the screen.
 * Offline, the sheet does not open (a pause that lands minutes later is worse than none).
 */
export const usePauseOrders = () => {
  const [, t] = useLanguage()
  const [ordering] = useApi()
  const [, { showToast }] = useToast()
  const when = useWhen()
  const now = useNow()
  const netInfo = useNetInfo()
  const isOffline = netInfo.isConnected === false
  const [state, setState] = useState<{ businesses: any[], loading: boolean, error: boolean }>({ businesses: [], loading: true, error: false })
  const [sheet, setSheet] = useState<{ targets: any[] } | null>(null)
  const [saving, setSaving] = useState(false)
  const request = useRef(0)
  // The latest API client, read when a request starts: the hook's callbacks do not change with it.
  const orderingRef = useRef(ordering)
  orderingRef.current = ordering

  const reload = useCallback(async () => {
    const id = ++request.current
    setState((previous) => ({ ...previous, loading: true, error: false }))
    try {
      const { content } = await orderingRef.current.businesses().select(STORE_FIELDS).parameters({ page: 1, page_size: PAGE_SIZE }).asDashboard().get()
      if (id !== request.current) return
      if (content?.error) setState({ businesses: [], loading: false, error: true })
      else setState({ businesses: Array.isArray(content?.result) ? content.result : [], loading: false, error: false })
    } catch (_) {
      if (id === request.current) setState({ businesses: [], loading: false, error: true })
    }
  }, [])

  useEffect(() => {
    reload()
    return () => { request.current++ }
  }, [reload])

  const stores: PauseStore[] = useMemo(() => state.businesses.map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    business,
    status: getStoreStatus(business, now),
  })), [state.businesses, now])

  const save = useCallback(async (id: number, changes: Record<string, any>): Promise<boolean> => {
    try {
      const { content } = await orderingRef.current.businesses(id).save(changes)
      if (content?.error) {
        showToast(ToastType.Error, t('ERROR_UPDATING_BUSINESS', 'Error updating business'))
        return false
      }
      const applied = { ...changes, ...(changes.snooze_until === '' ? { snooze_until: null } : {}) }
      setState((previous) => ({ ...previous, businesses: previous.businesses.map((business) => business.id === id ? { ...business, ...applied } : business) }))
      return true
    } catch (_) {
      showToast(ToastType.Error, t('ERROR_UPDATING_BUSINESS', 'Error updating business'))
      return false
    }
  }, [showToast, t])

  const openPauseSheet = useCallback((storeId?: number) => {
    if (isOffline) return
    const candidates = stores
      .filter((store) => canPause(store.status) && (storeId === undefined || store.id === storeId))
      .map((store) => store.business)
    if (candidates.length > 0) setSheet({ targets: candidates })
  }, [stores, isOffline])

  const resume = useCallback(async (storeId: number) => {
    if (isOffline) return false
    const ok = await save(storeId, { snooze_until: '', enabled: true })
    if (ok) showToast(ToastType.Success, t('ORDERS_RESUMED', 'Orders resumed'))
    return ok
  }, [isOffline, save, showToast, t])

  const confirm = useCallback(async (option: PauseOption, target: any) => {
    setSaving(true)
    const ok = await save(target.id, option.changes)
    setSaving(false)
    if (!ok) return
    setSheet(null)
    showToast(ToastType.Success, option.until
      ? t('ORDERS_PAUSED_UNTIL', 'Orders paused until _time_').replace('_time_', when(option.until, target.timezone))
      : t('DISABLED_BUSINESS', 'Disabled business'))
  }, [save, showToast, t, when])

  const sheetElement = sheet
    ? (
      <PauseOrdersSheet
        open
        onClose={() => !saving && setSheet(null)}
        targets={sheet.targets}
        name={sheet.targets.length === 1 ? sheet.targets[0].name : undefined}
        onConfirm={confirm}
        loading={saving}
      />
    )
    : null

  const count = (kind: StoreStatus['kind']) => stores.filter((store) => store.status.kind === kind).length
  const openCount = count('open') + count('closed')
  const pausedCount = count('paused')
  const offCount = count('off')

  return {
    loading: state.loading,
    error: state.error,
    stores,
    openCount,
    pausedCount,
    offCount,
    allPaused: stores.length > 0 && openCount === 0,
    isOffline,
    openPauseSheet,
    resume,
    reload,
    sheet: sheetElement,
  }
}

export type UsePauseOrders = ReturnType<typeof usePauseOrders>
