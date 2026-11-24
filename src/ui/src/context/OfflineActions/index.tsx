import { isLocalSimulatorMode } from '../../../../onboarding/ios-local-mode';
import React, { useState, createContext, useEffect, useContext } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

import { _retrieveStoreData, _setStoreData, _removeStoreData } from '../../providers/StoreUtil'
import { useApi, useSession, useEvent, useConfig } from '@components'
import { getOfflineActionsAfterReplay, mergeQueuedBodies, parseStoredOfflineActions, upsertCachedOrder } from './offlineActionsQueue'
import { CACHE_KEYS, slotOf } from '../../components/OrdersOption/orderStatusGroups'

type State = {
  isNetConnected: boolean | null
  canSaveChangesOffline: boolean | null
  actions: { [key: string]: any }
  /** The lists cached by a change made offline (`active`, `completed`): what the orders screen shows meanwhile. */
  orders: { [key: string]: any } | null
}

type Functions = {
  applyOffAction: (changes: any) => any
  registerOffOrder: (order: any) => any
  setState: React.Dispatch<React.SetStateAction<State>>
}

const defaultState = {
  isNetConnected: null,
  canSaveChangesOffline: false,
  actions: {},
  orders: null,
}

/** The last known value of `allow_save_changes_offline`, kept so an app opened with no network knows it. */
const ALLOW_OFFLINE_KEY = 'allow_save_changes_offline'

export const OfflineActionsContext = createContext<[State, Functions]>([
  defaultState,
  {
    applyOffAction: () => {},
    registerOffOrder: () => {},
    setState: () => {}
  }
]);

export const OfflineActionsProvider = (props: any) => {
  const netInfo = useNetInfo()
  const [ordering] = useApi()
  const [{ token }] = useSession()
  const [events] = useEvent()
  const [{ configs }] = useConfig()

  const [state, setState] = useState<State>({
    isNetConnected: netInfo.isConnected,
    canSaveChangesOffline: false,
    actions: {},
    orders: null
  })

  // The server's `allow_save_changes_offline` decides; the last value seen is kept for a launch with no network
  // (the configs are not loaded then). It is read by the provider itself, whichever screen is open.
  const configAllows = configs?.allow_save_changes_offline
  const configKnown = !!configAllows && typeof configAllows === 'object'
  const configValue = configKnown ? (configAllows.value ?? '').toString() : null
  useEffect(() => {
    if (isLocalSimulatorMode()) return
    let alive = true
    const apply = (allowed: boolean) => alive && setState((current) => current.canSaveChangesOffline === allowed ? current : { ...current, canSaveChangesOffline: allowed })
    if (configValue !== null) {
      const allowed = configValue === '1'
      apply(allowed)
      _setStoreData(ALLOW_OFFLINE_KEY, allowed)
    } else {
      _retrieveStoreData(ALLOW_OFFLINE_KEY).then((stored: any) => apply(stored === true))
    }
    return () => { alive = false }
  }, [configValue])

  const applyOffAction = async (changes: any) => {
    if (isLocalSimulatorMode() || state.canSaveChangesOffline === false) return false

    const orderId = changes?.data?.orderId
    const previous = state.actions?.[orderId]
    const actions = {
      ...state.actions,
      [orderId]: [...(Array.isArray(previous) ? previous : []), changes]
    }

    setState(state => ({ ...state, actions }))
    await _setStoreData('offline_actions_array', actions)
    return true
  }

  /**
   * Keeps what the orders screen shows in step with a change made offline: the order moves to the list its new status
   * belongs to (the open orders or History) in the cached lists, and the lists are handed to the screen (`orders`).
   */
  const registerOffOrder = async (order: any) => {
    if (!order) return

    const from = slotOf(order?.oldStatus)
    const to = slotOf(order?.status)
    const slots: Array<'active' | 'completed'> = from === to ? [to] : [from, to]

    const lists: any = {}
    for (const slot of slots) {
      const cached = await _retrieveStoreData(CACHE_KEYS[slot])
      lists[slot] = upsertCachedOrder(cached, order, slot === to)
      await _setStoreData(CACHE_KEYS[slot], lists[slot])
    }
    setState(state => ({ ...state, orders: { ...(state.orders ?? {}), ...lists } }))
  }

  /** One request per order: the queued bodies merged, the last status wins. */
  const syncChanges = async (changes: any) => {
    const queued = parseStoredOfflineActions(changes)
    const ordersIdUpdated: Array<string | number> = []

    for (const orderId of Object.keys(queued)) {
      const id = await updateOrderStatus({ orderId, body: mergeQueuedBodies(queued[orderId]) })
      if (id) ordersIdUpdated.push(id)
    }

    if (ordersIdUpdated.length) {
      events.emit('offline_order_updated', ordersIdUpdated)
    }
    events.emit('offline_actions_synced', ordersIdUpdated)

    const { remaining, shouldClearAll } = getOfflineActionsAfterReplay({
      queued,
      succeededOrderIds: ordersIdUpdated
    })

    if (shouldClearAll) {
      await _removeStoreData('offline_actions_array')
      setState(state => ({ ...state, actions: {} }))
      return
    }

    await _setStoreData('offline_actions_array', remaining)
    setState(state => ({ ...state, actions: remaining }))
  }

  const actionsFromStorage = async (isConnected: boolean) => {
    setState(state => ({ ...state, isNetConnected: isConnected }))
    const storedActions = parseStoredOfflineActions(await _retrieveStoreData('offline_actions_array'))

    if (isConnected && Object.keys(storedActions).length) {
      await syncChanges(storedActions)
      return
    }

    if (Object.keys(storedActions).length) {
      setState(state => ({ ...state, actions: storedActions }))
    }
  }

  useEffect(() => {
    if (isLocalSimulatorMode()) return
    if (netInfo.isConnected === null || state.canSaveChangesOffline === false) return
    actionsFromStorage(netInfo.isConnected)
  }, [netInfo.isConnected, state.canSaveChangesOffline])

  const functions: any = {
    applyOffAction,
    registerOffOrder,
    setState
  }

  const updateOrderStatus = async (offlineData: any) => {
    try {
      const { content: { result: order, error } } = await ordering
        .setAccessToken(token)
        .orders(offlineData?.orderId)
        .save(offlineData?.body)

      return error ? null : order?.id
    } catch {
      return null
    }
  }

  return (
    <OfflineActionsContext.Provider value={[{ ...state, isNetConnected: netInfo.isConnected }, functions]}>
      {props.children}
    </OfflineActionsContext.Provider>
  );
};

export const useOfflineActions = () => {
  const actionsManager = useContext(OfflineActionsContext)
  return actionsManager || [defaultState, {}]
}
