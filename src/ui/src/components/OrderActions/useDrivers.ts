import { useCallback, useEffect, useRef, useState } from 'react'

import { useApi, useSession } from '@components'

export interface DriverRow {
  id: number
  name: string
  lastname?: string
  available: boolean
  activeOrders: number
}

/** "Omar H.": the name and the first letter of the last one. */
export const shortName = (driver: any): string => {
  const first = String(driver?.name ?? '').trim()
  const last = String(driver?.lastname ?? '').trim()
  return [first, last ? `${Array.from(last)[0]}.` : ''].filter(Boolean).join(' ')
}

/** The sheet's rows: the drivers of the controls answer, the ones available first, then by name. */
export const driverRows = (drivers: any[], order: any): DriverRow[] =>
  drivers
    .map((driver) => ({
      id: driver.id,
      name: shortName(driver),
      lastname: driver.lastname,
      available: !!driver.available,
      activeOrders: Number(driver.assigned_orders_count) || 0
    }))
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1
      return a.name.localeCompare(b.name)
    })

/**
 * The drivers of an order (`GET controls/orders/:id`) and the assignment (`PUT orders/:id { driver_id }`), for a sheet
 * that is opened from anywhere. A screen that has them (`drivers`, `handleAssignDriver`) passes them and nothing is
 * asked twice.
 */
export const useDrivers = (order: any, given?: any[], handleAssignDriver?: (id: number | null) => any) => {
  const [ordering] = useApi() as any
  const [{ token }] = useSession() as any
  const [state, setState] = useState<{ loading: boolean, drivers: any[], error: string | null }>({
    loading: !given,
    drivers: given ?? [],
    error: null
  })
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    if (given) {
      setState({ loading: false, drivers: given, error: null })
      return () => { alive.current = false }
    }
    const load = async () => {
      try {
        const { content: { error, result } } = await ordering.setAccessToken(token).controls(order.id).get()
        if (!alive.current) return
        setState({ loading: false, drivers: error ? [] : (result?.drivers ?? []), error: error ? (Array.isArray(result) ? result[0] : String(result)) : null })
      } catch (thrown: any) {
        if (alive.current) setState({ loading: false, drivers: [], error: thrown?.message ?? 'ERROR' })
      }
    }
    load()
    return () => { alive.current = false }
  }, [order?.id, given])

  /** Resolves `{ ok, order?, error? }`. */
  const assign = useCallback(async (driverId: number | null): Promise<{ ok: boolean, order?: any, error?: any }> => {
    try {
      if (handleAssignDriver) {
        const result = await handleAssignDriver(driverId)
        const failed = result === null || (result && typeof result === 'object' && result.error)
        return failed ? { ok: false, error: result?.error ?? result?.result } : { ok: true, order: result }
      }
      const { content: { error, result } } = await ordering.setAccessToken(token).orders(order.id).save({ driver_id: driverId })
      return error ? { ok: false, error: result } : { ok: true, order: result }
    } catch (thrown: any) {
      return { ok: false, error: thrown?.message }
    }
  }, [ordering, token, order?.id, handleAssignDriver])

  return { ...state, assign }
}
