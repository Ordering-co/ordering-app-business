/**
 * The platform layer: which schema platform the app is on (`phone` | `tablet`, the
 * `platforms` of product.schema.json) and the layout it asks for.
 *
 * - `platformOf` decides: the device is a tablet (`DeviceInfo.isTablet()`), or the
 *   window's shorter side reaches a tablet's (a foldable, an Android desktop window).
 *   Rotation never changes it (the shorter side stays), the window does.
 * - `usePlatform()` reads it in a component; the one `AppThemeProvider` calls it to
 *   resolve the theme for the platform, so every reader sees the tablet's values.
 * - `useLayout()` says what the screen does with it: landscape tablet (side rail,
 *   board and panes), the width of the content column and the panes, all from the
 *   theme. No `Dimensions.get` at module load: everything follows the window.
 */
import { useMemo } from 'react'
import { useWindowDimensions } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { useTheme } from 'styled-components/native'
import type { PlatformName } from './engine'
import { themePart } from './helpers'

/** Android's own tablet breakpoint (sw600dp): the shorter side of a tablet's window, in dp. */
export const TABLET_SHORTEST_SIDE = 600

export interface WindowSize { width: number, height: number }

/** The platform of a device and its window. Pure: rotation keeps the shorter side. */
export const platformOf = ({ isTablet, width, height }: WindowSize & { isTablet: boolean }): PlatformName =>
  isTablet || Math.min(width, height) >= TABLET_SHORTEST_SIDE ? 'tablet' : 'phone'

let deviceIsTablet: boolean | null = null
/** `DeviceInfo.isTablet()` is a property of the device: read once, when first asked, never at import. */
const readDeviceIsTablet = (): boolean => {
  if (deviceIsTablet === null) {
    try {
      deviceIsTablet = !!DeviceInfo.isTablet()
    } catch (_) {
      deviceIsTablet = false
    }
  }
  return deviceIsTablet
}
/** Test seam: forget what the device said. */
export const resetDeviceIsTablet = () => { deviceIsTablet = null }

export const usePlatform = (): PlatformName => {
  const { width, height } = useWindowDimensions()
  return platformOf({ isTablet: readDeviceIsTablet(), width, height })
}

export interface Layout {
  platform: PlatformName
  width: number
  height: number
  landscape: boolean
  tablet: boolean
  /** A tablet turned sideways: the side rail, the board and the two panes. */
  landscapeTablet: boolean
  /** The tab bar is a side rail (the theme asks for it, on a landscape tablet). */
  rail: boolean
  /** The rail's width (`bottom_nav.rail_width`) while there is a rail, else 0. */
  railWidth: number
  /** The widest a stack screen's content goes (`screen.max_width`; 0 = the whole width). */
  maxContentWidth: number
  /** The width a screen's content column takes: the window less the rail, capped at `maxContentWidth`. */
  contentWidth: number
  /** The widest a sheet goes (`sheet.max_width`), and whether it is a centred card (`sheet.presentation`). */
  sheetMaxWidth: number
  sheetCentered: boolean
  /** The two-pane layouts' widths (`screen.list_pane_width`, `screen.detail_pane_width`); undefined while the schema has none. */
  panes: { list?: number, detail?: number }
}

/** The layout of a window for a theme (pure, for tests and for `useLayout`). */
export const layoutOf = (theme: any, { width, height }: WindowSize): Layout => {
  const platform: PlatformName = theme.meta.platform
  const part = (component: string, key: string) => themePart(theme, component, `base.${key}`)
  const landscape = width > height
  const landscapeTablet = platform === 'tablet' && landscape
  const rail = landscapeTablet && part('bottom_nav', 'placement') === 'rail'
  const railWidth = rail ? part('bottom_nav', 'rail_width') : 0
  const maxContentWidth: number = part('screen', 'max_width') ?? 0
  const available = width - railWidth
  const sheetMaxWidth: number = part('sheet', 'max_width') ?? 0
  return {
    platform,
    width,
    height,
    landscape,
    tablet: platform === 'tablet',
    landscapeTablet,
    rail,
    railWidth,
    maxContentWidth,
    contentWidth: maxContentWidth > 0 ? Math.min(available, maxContentWidth) : available,
    sheetMaxWidth,
    sheetCentered: part('sheet', 'presentation') === 'centered',
    panes: { list: part('screen', 'list_pane_width'), detail: part('screen', 'detail_pane_width') }
  }
}

/**
 * How far past its column a horizontal scroller (chips, tabs) may run on each side: to the window's edge, so a row longer than
 * the column of a portrait tablet fades out at the screen's edge instead of being cut mid-word at the column's. 0 on a phone
 * (the column is the window) and while the screen is a pane (a landscape tablet's second column has no screen edge to run to).
 */
export const columnBleed = (layout: Layout): number =>
  layout.landscapeTablet ? 0 : Math.max(0, Math.floor((layout.width - layout.contentWidth) / 2))

export const useLayout = (): Layout => {
  const theme: any = useTheme()
  const { width, height } = useWindowDimensions()
  return useMemo(() => layoutOf(theme, { width, height }), [theme, width, height])
}
