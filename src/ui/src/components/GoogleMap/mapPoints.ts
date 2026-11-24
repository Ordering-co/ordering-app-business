import type { Coordinates } from './useDriverTracking'

export interface MapPoint { latitude: number, longitude: number }

/**
 * A coordinate pair of the API (numbers or numeric strings) as the map library's, or null when it is not a position. The pair
 * (0, 0) is the API's value for a place that was never located (a store saved without its address: `zipcode: -1`): it is
 * not a position, and drawn it would put the point in the Gulf of Guinea, 8 000 km from its customer, where no map can
 * frame both (the library's minimum zoom shows less than that, so the markers sat on the box's edges).
 */
export const toMapPoint = (place?: Partial<Coordinates> | null): MapPoint | null => {
  if (place?.lat === undefined || place?.lat === null || place?.lat === '' || place?.lng === undefined || place?.lng === null || place?.lng === '') return null
  const latitude = Number(place.lat)
  const longitude = Number(place.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) return null
  return { latitude, longitude }
}

/** The points the order's map draws: the store, the customer and the driver, each only when it has a position. */
export const orderMapPoints = (order: any, driverLocation?: Coordinates | null) => ({
  store: toMapPoint(order?.business?.location),
  customer: toMapPoint(order?.customer?.location),
  driver: toMapPoint(driverLocation ?? order?.driver?.location)
})

/** The span (degrees) the map shows before it frames the markers. */
export const INITIAL_DELTA = 0.05
