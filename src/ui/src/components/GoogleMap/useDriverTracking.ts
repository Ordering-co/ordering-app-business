import { useEffect, useState } from 'react'

import { useWebsocket } from '@components'

export interface Coordinates { lat: number | string, lng: number | string }

/**
 * The driver's position on the order: the one the order carries, then the `tracking_driver` socket events of that
 * driver (the order's controller reads the same event; the map tracks it itself so it works from any screen).
 * `given` is a position the caller already tracks (the details' controller): it wins over the socket's.
 */
export const useDriverTracking = (order: any, given?: Coordinates | null): Coordinates | null => {
  const socket = useWebsocket() as any
  const [tracked, setTracked] = useState<Coordinates | null>(null)
  const driverId = order?.driver_id ?? order?.driver?.id
  const externalId = order?.external_driver_id

  useEffect(() => {
    if (!socket?.socket || (!driverId && !externalId)) return
    const onTracking = (data: any) => {
      const external = data?.source === 'external'
      const incoming = external ? data?.external_driver_id : data?.driver_id
      const expected = external ? externalId : driverId
      if (!incoming || incoming !== expected || !data?.location) return
      setTracked(data.location)
    }
    socket.on('tracking_driver', onTracking)
    return () => socket.off('tracking_driver', onTracking)
  }, [socket?.socket, driverId, externalId])

  return given ?? tracked ?? order?.driver?.location ?? null
}
