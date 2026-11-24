import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { useTheme } from 'styled-components/native'

import { themeColor, themePart, themeRadius } from '@/theme/helpers'
import { MapMarker } from '../GoogleMap/MapMarker'
import { INITIAL_DELTA, orderMapPoints, type MapPoint } from '../GoogleMap/mapPoints'
import type { Coordinates } from '../GoogleMap/useDriverTracking'
import { useLanguage } from '@components'

interface Props {
  order: any
  /** The driver's position when the page already tracks it (else the order's own). */
  driverLocation?: Coordinates | null
}

/** The region that holds every point, with room around it (a single point gets the map's own default span). */
export const regionOf = (points: MapPoint[]) => {
  const lats = points.map((point) => point.latitude)
  const lngs = points.map((point) => point.longitude)
  const [south, north] = [Math.min(...lats), Math.max(...lats)]
  const [west, east] = [Math.min(...lngs), Math.max(...lngs)]
  // 1.6: the markers (a disc each) must not sit on the edge.
  const span = (from: number, to: number) => (to - from) * 1.6 || INITIAL_DELTA
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: span(south, north),
    longitudeDelta: span(west, east)
  }
}

/**
 * The delivery's mini map (OrderDelivery): a block of the order's places, with the store, the customer and the driver
 * as the app's markers (`GoogleMap/MapMarker`). It is a picture: it does not move, zoom or take touches (the card's
 * "Track on map" opens the real map). Nothing is drawn when the order has no position at all.
 */
export const MiniMap = ({ order, driverLocation }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const points = useMemo(() => orderMapPoints(order, driverLocation), [order, driverLocation])
  const all = useMemo(() => [points.store, points.customer, points.driver].filter(Boolean) as MapPoint[], [points])
  const styles = useMemo(() => StyleSheet.create({
    box: {
      height: themePart(theme, 'order_details', 'base.mini_map_height'),
      borderRadius: themeRadius(theme, 'md'),
      backgroundColor: themeColor(theme, 'surface_alt'),
      overflow: 'hidden'
    }
  }), [theme])

  const fit = useCallback(() => {
    if (!ready || !all.length) return
    const room = theme.native.components.map_marker.base.size
    mapRef.current?.fitToCoordinates?.(all, { edgePadding: { top: room, right: room, bottom: room, left: room }, animated: false })
  }, [ready, all, theme])
  useEffect(fit, [fit])

  if (!all.length) return null
  return (
    <View style={styles.box} pointerEvents='none' accessible={false} importantForAccessibility='no-hide-descendants' testID='mini-map'>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={regionOf(all)}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        zoomControlEnabled={false}
        moveOnMarkerPress={false}
        onMapReady={() => setReady(true)}
      >
        {points.store && <MapMarker party='store' {...points.store} label={order?.business?.name ?? t('STORE', 'Store')} />}
        {points.customer && <MapMarker party='customer' {...points.customer} label={t('CUSTOMER', 'Customer')} />}
        {points.driver && <MapMarker party='driver' {...points.driver} label={order?.driver?.name ?? t('DRIVER', 'Driver')} />}
      </MapView>
    </View>
  )
}
