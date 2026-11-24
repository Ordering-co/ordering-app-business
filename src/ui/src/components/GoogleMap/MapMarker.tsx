import React, { memo, useEffect, useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Marker } from 'react-native-maps'
import { useTheme } from 'styled-components/native'

import { Icon } from '../shared'
import { nativeShadowStyle, themeRadius } from '@/theme/helpers'

/**
 * The app's marker over the order's map: a round disc with a ring and a glyph, `components.map_marker` (its size, ring and
 * shadow in `base`, the disc's color and the glyph's in the variant of who it stands for: the store, the customer or
 * the driver). It is a `Marker` of the map library: what the library paints around it (tiles, labels) is not themed. It
 * never has a `title`: the library would draw a square, unthemed info window for it; what the stop says about itself is
 * the screen's own card.
 */
export type MapMarkerParty = 'store' | 'customer' | 'driver'

interface Props {
  latitude: number
  longitude: number
  party: MapMarkerParty
  /** What a screen reader says of the disc. */
  label?: string
}

const GLYPHS: Record<MapMarkerParty, string> = {
  store: 'storefront-outline',
  customer: 'location-outline',
  driver: 'car-outline'
}

/** Anchored at the disc's center, so the disc sits on its coordinate. */
const CENTER = { x: 0.5, y: 0.5 }

/** What is drawn above what: the stores and customers, then the driver (the one that moves). */
const LAYER: Record<MapMarkerParty, number> = { store: 1, customer: 1, driver: 2 }

/** How long a marker's view is photographed after it changes (Android renders a custom marker to a bitmap). */
const SETTLE_MS = 1000

const markerLook = (theme: any, party: MapMarkerParty) => {
  const marker = theme.native.components.map_marker
  const variant = marker.variants[party]
  return {
    size: marker.base.size,
    ring: marker.base.ring_width,
    ringColor: marker.base.ring_color,
    background: variant.background,
    glyph: marker.base.icon_size,
    glyphColor: variant.icon_color,
    shadow: nativeShadowStyle(marker.base.shadow),
    // Room around the disc for its shadow, so a bitmap of the view does not cut it.
    bleed: marker.base.shadow ? Math.ceil(marker.base.shadow.shadowRadius + Math.abs(marker.base.shadow.shadowOffset.height)) : 0
  }
}

const MapMarkerView = ({ latitude, longitude, party, label }: Props) => {
  const theme: any = useTheme()
  const look = useMemo(() => markerLook(theme, party), [theme, party])
  const styles = useMemo(() => StyleSheet.create({
    stage: {
      width: look.size + 2 * look.bleed,
      height: look.size + 2 * look.bleed,
      alignItems: 'center',
      justifyContent: 'center'
    },
    disc: {
      width: look.size,
      height: look.size,
      borderRadius: themeRadius(theme, 'full', { fixed: true }),
      borderWidth: look.ring,
      borderColor: look.ringColor,
      backgroundColor: look.background,
      alignItems: 'center',
      justifyContent: 'center',
      ...look.shadow
    }
  }), [theme, look])

  const [settled, setSettled] = useState<unknown>(null)
  const tracking = settled !== look
  useEffect(() => {
    if (!tracking) return
    const timer = setTimeout(() => setSettled(look), SETTLE_MS)
    return () => clearTimeout(timer)
  }, [tracking, look])

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={CENTER}
      zIndex={LAYER[party]}
      tracksViewChanges={tracking}
      accessibilityLabel={label}
    >
      <View style={styles.stage}>
        <View style={styles.disc} testID={`map-marker-${party}`}>
          <Icon name={GLYPHS[party]} size={look.glyph} color={look.glyphColor} />
        </View>
      </View>
    </Marker>
  )
}

export const MapMarker = memo(MapMarkerView)
export default MapMarker
