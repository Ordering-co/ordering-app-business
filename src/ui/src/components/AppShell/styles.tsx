import styled from 'styled-components/native'
import { spaceCss } from '@/theme/helpers'

/**
 * The pieces of the tab bar and the rail. The bar's own box (background, line, height, inset) depends on the
 * safe area and the system's text size, so `AppTabBar` builds it from the theme; what repeats per tab is here.
 */

/** One tab of the bottom bar: it takes its share of the row, icon over label. */
export const BarItem = styled.Pressable`
  flex: 1;
  align-items: center;
  justify-content: flex-start;
`

/** One tab of the rail: a square of `bottom_nav.item_size`. */
export const RailItem = styled.Pressable<{ side: number }>`
  width: ${({ side }: any) => side}px;
  height: ${({ side }: any) => side}px;
  align-items: center;
  justify-content: center;
`

/** Icon, then label, a small gap apart. */
export const ItemContent = styled.View`
  align-items: center;
  justify-content: center;
  gap: ${({ theme }: any) => spaceCss(theme, 'xs')};
`

/** The icon's box: the count badge hangs from its top end, so it never moves the icon or the label. */
export const IconBox = styled.View`
  align-items: center;
  justify-content: center;
`

/** Over the glyph's upper end. */
export const BadgeSlot = styled.View<{ top: number, left: number }>`
  position: absolute;
  top: ${({ top }: any) => top}px;
  left: ${({ left }: any) => left}px;
`
