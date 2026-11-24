import React, { useMemo } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themeGutter, themeSpace } from '@/theme/helpers'
import { columnBleed, useLayout } from '@/theme/platform'
import { FilterChip } from '../shared'

export interface StageChip<K extends string = string> {
  key: K
  /** "Preparing". */
  text: string
}

interface StageChipsProps<K extends string> {
  chips: Array<StageChip<K>>
  selected: K
  onSelect: (key: K) => void
  /** The row's test id: `orders-stages` (In progress), `orders-new-stages` (New) or `orders-history-chips` (History). */
  testID?: string
  /** The prefix of each chip's test id (`orders-stage-preparing`); History's are `orders-history-completed`. */
  chipTestID?: string
}

/**
 * The chips under the tabs: All, Preparing, Ready for pickup, With driver under In progress; Pending, Preorder under New; All,
 * Completed, Cancelled under History: a chip is its text, with no number of orders. One is always selected. The row is not part of
 * the list: it stays in place while the list below it loads or scrolls. It scrolls sideways when the chips do not fit (a narrow
 * phone, a long translation) and never cuts a chip's text.
 */
export const StageChips = <K extends string>({ chips, selected, onSelect, testID = 'orders-stages', chipTestID = 'orders-stage' }: StageChipsProps<K>) => {
  const theme: any = useTheme()
  const layout = useLayout()
  const bleed = columnBleed(layout)
  const styles = useMemo(() => StyleSheet.create({
    row: { flexGrow: 0, marginHorizontal: -bleed },
    content: { gap: themeSpace(theme, 'sm'), paddingHorizontal: themeGutter(theme) + bleed, alignItems: 'center' }
  }), [theme, bleed])
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.content} keyboardShouldPersistTaps='handled' testID={testID}>
      {chips.map((chip) => (
        <FilterChip
          key={chip.key}
          size='sm'
          text={chip.text}
          selected={selected === chip.key}
          onPress={() => onSelect(chip.key)}
          testID={`${chipTestID}-${chip.key}`}
        />
      ))}
    </ScrollView>
  )
}
