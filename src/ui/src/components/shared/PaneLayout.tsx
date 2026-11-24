import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLayout } from '@/theme/platform'
import { themeBorderWidth, themeColor } from '@/theme/helpers'

interface Props {
  /** The master pane (the list). */
  list: React.ReactNode
  /** The detail pane (the chat, the menu, the wizard), taking what is left. */
  detail: React.ReactNode
  /** The list pane's width: the theme's (`screen.list_pane_width`) unless the screen sets its own. */
  listWidth?: number
  testID?: string
}

/**
 * Two panes side by side for a landscape tablet (`useLayout().landscapeTablet`): the list at a fixed width,
 * a line, and the detail taking the rest. Each pane scrolls on its own. A screen draws it only on a landscape
 * tablet; on a phone (and a portrait tablet) the same screens are the phone flow in a `ScreenContainer`.
 * When neither the screen nor the theme gives a width the list takes a third of the row.
 */
export const PaneLayout = ({ list, detail, listWidth, testID }: Props) => {
  const theme: any = useTheme()
  const layout = useLayout()
  const width = listWidth ?? layout.panes.list
  const styles = useMemo(() => StyleSheet.create({
    row: { flex: 1, flexDirection: 'row' },
    list: width ? { width } : { flex: 1 },
    divider: { width: themeBorderWidth(theme, 'thin'), backgroundColor: themeColor(theme, 'border') },
    detail: { flex: width ? 1 : 2 }
  }), [theme, width])
  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.list} testID={testID && `${testID}-list`}>{list}</View>
      <View style={styles.divider} />
      <View style={styles.detail} testID={testID && `${testID}-detail`}>{detail}</View>
    </View>
  )
}

export default PaneLayout
