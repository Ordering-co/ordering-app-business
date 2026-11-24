import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image, Linking, PanResponder, Platform, StyleSheet, View } from 'react-native'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { getApps } from 'react-native-map-link'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'styled-components/native'

import { useConfig, useLanguage } from '@components'
import { statusLabel } from '../OrderDetails/orderStages'
import { OBottomPopup, OButton, OListRow, OSpinner, OText, Icon } from '../shared'
import { themeSpace, themeVisible } from '@/theme/helpers'
import { orderNumberText } from '../OrderDetails/orderData'
import { shortName } from '../OrderActions/useDrivers'
import { MapMarker } from './MapMarker'
import { INITIAL_DELTA, orderMapPoints, type MapPoint } from './mapPoints'
import { mapStyles } from './styles'
import { useDriverTracking, type Coordinates } from './useDriverTracking'

interface Props {
  order: any
  /** The driver's position when the caller already tracks it; otherwise the map tracks it itself. */
  driverLocation?: Coordinates | null
  onClose: () => void
}

/**
 * The order's map and tracking screen (MapTracking): the map with the store, the customer and the driver as the app's
 * markers, a floating back button and a card at the bottom (who and what the order is doing, "Call driver", "Open in
 * Maps"). It is read-only: nothing is accepted from here. The driver's disc moves with `tracking_driver`. No ETA is drawn:
 * the API gives none.
 */
/** The room the framing keeps around the markers on one axis: `ROOM_DISCS` discs, or `ROOM_SHARE` of the map's side when that is more. */
const ROOM_DISCS = 1.5
const ROOM_SHARE = 0.14
export const fitRoom = (disc: number, side: number) =>
  Math.round(Math.max(disc * ROOM_DISCS, Math.max(0, side) * ROOM_SHARE))

export const GoogleMap = ({ order, driverLocation, onClose }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ configs }] = useConfig() as any
  const { top, bottom } = useSafeAreaInsets()
  const styles = useMemo(() => mapStyles(theme, top, bottom), [theme, top, bottom])
  const mapRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [cardHeight, setCardHeight] = useState(0)
  // The map's own size: a rotation (or a window resize) changes it, and the framing of the old one no longer fits (T3-C3).
  const [size, setSize] = useState('')
  const [popUp, setPopUp] = useState(false)
  const [mapApps, setMapApps] = useState<any[] | null>(null)

  const driverPosition = useDriverTracking(order, driverLocation)
  const points = useMemo(() => orderMapPoints(order, driverPosition), [order, driverPosition])
  const all = useMemo(() => [points.store, points.customer, points.driver].filter(Boolean) as MapPoint[], [points])
  const destination = points.customer ?? points.store

  // The map frames every marker once it is ready, whenever the driver moves and whenever the map's size changes.
  const fit = useCallback(() => {
    if (!ready || !all.length) return
    // Room around the outermost markers, so none sits against an edge, the back button or the card: a disc and a half,
    // and a share of the map's side where that is more (a tablet's width), each way on its own.
    const [width, height] = size.split('x').map(Number)
    const disc = theme.native.components.map_marker.base.size
    const side = fitRoom(disc, width || 0)
    const end = fitRoom(disc, (height || 0) - top - cardHeight)
    // The system's top (status bar, Dynamic Island) is no room for a marker: the map runs under it.
    mapRef.current?.fitToCoordinates?.(all, { edgePadding: { top: top + end, right: side, bottom: end, left: side }, animated: true })
  }, [ready, all, theme, top, size, cardHeight])
  useEffect(fit, [fit])

  // The map view keeps every touch, so the iOS swipe from the screen's edge (a modal has no stack to swipe back through) is
  // caught by a strip over the map's left edge: a swipe to the right leaves, as it does on every other screen.
  const swipeBack = useMemo(() => {
    const far = themeSpace(theme, 'xxxl')
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx >= far && Math.abs(gesture.dy) < gesture.dx) onClose()
      }
    })
  }, [theme, onClose])

  // The one name of a status (the details' `statusLabel`): status 4 reads "Ready for pickup" here as everywhere.
  const status = order?.status !== undefined && order?.status !== null ? statusLabel(order.status, t, order) : ''
  const driverName = order?.driver ? shortName(order.driver) : ''
  const line = driverName && status ? `${driverName} · ${status}` : (driverName || status || '')
  const driverPhone = order?.driver?.cellphone
    ? `tel:${order.driver.country_phone_code ? `+${order.driver.country_phone_code}` : ''}${order.driver.cellphone}`
    : null

  const openOtherMaps = async () => {
    if (!destination) return
    setMapApps(null)
    setPopUp(true)
    try {
      setMapApps(await getApps({
        latitude: destination.latitude,
        longitude: destination.longitude,
        ...(points.store && destination !== points.store && { sourceLatitude: points.store.latitude, sourceLongitude: points.store.longitude }),
        alwaysIncludeGoogle: true,
        naverCallerName: 'co.ordering.business'
      }))
    } catch {
      setMapApps([])
    }
  }

  return (
    <View
      style={styles.screen}
      onLayout={(event) => setSize(`${Math.round(event.nativeEvent.layout.width)}x${Math.round(event.nativeEvent.layout.height)}`)}
      testID='order-map'
    >
      {all.length ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...all[0], latitudeDelta: INITIAL_DELTA, longitudeDelta: INITIAL_DELTA }}
          mapPadding={{ top: 0, right: 0, left: 0, bottom: cardHeight }}
          zoomControlEnabled={false}
          moveOnMarkerPress={false}
          onMapReady={() => setReady(true)}
        >
          {points.store && <MapMarker party='store' {...points.store} label={order?.business?.name ?? t('STORE', 'Store')} />}
          {points.customer && <MapMarker party='customer' {...points.customer} label={t('CUSTOMER', 'Customer')} />}
          {points.driver && <MapMarker party='driver' {...points.driver} label={order?.driver?.name ?? t('DRIVER', 'Driver')} />}
        </MapView>
      ) : (
        <View style={styles.empty}>
          <OText preset='body' color='text_muted' testID='order-map-empty'>{t('NO_LOCATION_AVAILABLE', 'No location available for this order.')}</OText>
        </View>
      )}

      {Platform.OS === 'ios' && <View style={styles.swipeEdge} {...swipeBack.panHandlers} testID='order-map-swipe-edge' />}

      <View style={styles.back}>
        <OButton
          iconOnly
          round
          size='md'
          color='neutral'
          style={styles.backShadow}
          icon={<Icon name='arrow-back' size='lg' />}
          onClick={onClose}
          accessibilityLabel={t('GO_BACK', 'Go back')}
          testID='order-map-back'
        />
      </View>

      <View style={styles.card} onLayout={(event) => setCardHeight(Math.round(event.nativeEvent.layout.height))} testID='order-map-card'>
        <View style={styles.who}>
          <OText preset='body_sm' color='text_muted'>
            {orderNumberText(order, t, configs)}
          </OText>
          {!!line && <OText preset='h4' numberOfLines={2} testID='order-map-line'>{line}</OText>}
        </View>
        {(!!driverPhone || (!!destination && themeVisible(theme, 'map.other_maps'))) && (
          <View style={styles.buttons}>
            {!!driverPhone && (
              <View style={styles.grow}>
                <OButton
                  appearance='tonal'
                  icon={<Icon name='call-outline' />}
                  text={t('CALL_DRIVER', 'Call driver')}
                  onClick={() => Linking.openURL(driverPhone)}
                  testID='order-map-call-driver'
                />
              </View>
            )}
            {!!destination && themeVisible(theme, 'map.other_maps') && (
              <View style={styles.grow}>
                <OButton
                  color='neutral'
                  appearance='outline'
                  text={t('OPEN_IN_MAPS', 'Open in Maps')}
                  onClick={openOtherMaps}
                  testID='order-map-open-maps'
                />
              </View>
            )}
          </View>
        )}
      </View>

      <OBottomPopup
        open={popUp}
        onClose={() => setPopUp(false)}
        title={t('SHOW_IN_OTHER_MAPS', 'Show in other maps')}
        closeIcon
        padded
      >
        <View style={styles.sheet} testID='order-map-sheet'>
          <OText preset='body' color='text_muted'>{t('WHAT_APP_WOULD_YOU_USE', 'What app would you like to use?')}</OText>
          {mapApps === null
            ? <OSpinner style={styles.spinner} testID='order-map-apps-loading' />
            : mapApps.map((app: any, index: number) => (
              <OListRow
                key={app.id}
                title={app.name}
                last={index === mapApps.length - 1}
                trailing={<Image source={app.icon} style={styles.appIcon} />}
                onPress={() => {
                  setPopUp(false)
                  // An app that cannot open the route leaves the map as it is.
                  Promise.resolve(app.open()).catch(() => {})
                }}
              />
            ))}
        </View>
      </OBottomPopup>
    </View>
  )
}

export default GoogleMap
