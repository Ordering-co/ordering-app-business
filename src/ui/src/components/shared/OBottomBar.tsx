import React, { useCallback, useId, useMemo, useState } from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, barBottomSpace } from '@/theme/helpers'
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible'
import { useReportBottomBar } from '../../../../context/BottomBarContext'
import OButton from './OButton'

/** The look of each button of the bar, by `components.bottom_bar.slots`. */
export type BottomBarSlot = 'button' | 'secondary' | 'advance' | 'decline' | 'reject'

export interface BottomBarAction {
  key?: string
  slot?: BottomBarSlot
  text: React.ReactNode
  onClick?: () => void
  /** Its share of the row; by default 1 for a bar's single button or a `secondary` / `decline` one, 2 for the main one beside it. */
  flex?: number
  icon?: React.ReactNode
  loading?: boolean
  disabled?: boolean
  testID?: string
  accessibilityLabel?: string
}

interface Props {
  actions: BottomBarAction[]
  /** What goes above the buttons, inside the bar (a notice, a total). */
  children?: React.ReactNode
  /**
   * The system space under the bar, when the screen already knows it: 0 inside the bottom tabs (the tab bar
   * stands under the bar), else the bottom inset (never less than the theme's minimum). With the keyboard up it is
   * always 0: the keyboard covers the inset, so the bar sits its own padding over the keyboard.
   */
  bottomSpace?: number
  testID?: string
}

/**
 * The action bar pinned to the bottom of a screen (`components.bottom_bar`): a line above it, the theme's padding,
 * and its buttons in a row (`gap` apart), each in the look of its slot: `button` (the main action), `secondary`
 * (outline), `advance` (accept, mark ready: green), `decline` (reject, not picked up: red outline) and `reject`
 * (the destructive confirmation: solid red). Two buttons share the row 1 : 2, the main one wider (reject beside
 * accept). A label stays on one line: the buttons keep `button_padding_x` at their sides and the text shrinks to its
 * share of the row when it still does not fit ("Not picked up", "Customer not arrived" in the 1 : 2 pair). The bar tells the toast how tall it is, so a toast rides above it.
 *
 * The keyboard rule: with the keyboard up the bar keeps no system space (it was added twice: the bar floated 40 pt
 * above the keyboard); the screen's `KeyboardScreen` lifts the bar to the keyboard's top, so the buttons sit
 * `components.bottom_bar.base.padding` over it, the same on every screen.
 *
 *   <OBottomBar actions={[{ slot: 'decline', text: t('REJECT', 'Reject'), onClick: reject }, { slot: 'advance', text: t('ACCEPT', 'Accept'), onClick: accept }]} />
 */
export const OBottomBar = ({ actions, children, bottomSpace, testID }: Props) => {
  const theme: any = useTheme()
  const insets = useSafeAreaInsets()
  const bar = theme.native.components.bottom_bar
  const keyboardUp = useKeyboardVisible()
  const space = keyboardUp ? 0 : (bottomSpace ?? barBottomSpace(theme, insets.bottom))
  const [height, setHeight] = useState(0)
  const id = useId()
  useReportBottomBar(`bottom-bar-${id}`, height)
  const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(Math.round(event.nativeEvent.layout.height)), [])
  const styles = useMemo(() => StyleSheet.create({
    bar: {
      paddingTop: bar.base.padding,
      paddingHorizontal: bar.base.padding_x,
      paddingBottom: bar.base.padding + space,
      gap: bar.base.gap,
      ...nativeBoxStyle({ background: bar.base.background, shadow: bar.base.shadow }),
      // Only the line above the bar.
      borderTopWidth: bar.base.border_top.borderWidth,
      borderStyle: bar.base.border_top.borderStyle,
      borderColor: bar.base.border_top.borderColor
    },
    row: { flexDirection: 'row', gap: bar.base.gap },
    // The bar's buttons keep little side space (`button_padding_x`) so a label fits its share of a pair.
    button: { paddingHorizontal: bar.base.button_padding_x }
  }), [bar, space])
  const paired = actions.length > 1
  return (
    <View style={styles.bar} onLayout={onLayout} testID={testID}>
      {children}
      <View style={styles.row}>
        {actions.map((action, index) => {
          const slot = bar.slots[action.slot ?? 'button']
          const main = !action.slot || action.slot === 'button' || action.slot === 'advance' || action.slot === 'reject'
          return (
            <View key={action.key ?? index} style={{ flex: action.flex ?? (paired && main ? 2 : 1) }} testID={action.testID && `${action.testID}-cell`}>
              <OButton
              text={action.text}
              fitText
              style={styles.button}
              onClick={action.onClick}
              icon={action.icon}
              loading={action.loading}
              disabled={action.disabled}
              size={slot.size}
              appearance={slot.appearance}
              color={slot.color}
              testID={action.testID}
              accessibilityLabel={action.accessibilityLabel}
              />
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default OBottomBar
