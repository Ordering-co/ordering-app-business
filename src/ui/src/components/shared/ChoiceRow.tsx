import React, { useMemo } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { themeOpacity } from '@/theme/helpers'
import ChoiceMark from './ChoiceMark'

interface Props {
  /** `radio` for a single choice, `check` for a multiple one. */
  kind?: 'radio' | 'check'
  selected: boolean
  /** The row cannot be changed (sold out, or its group reached its maximum): the theme's disabled look. */
  disabled?: boolean
  /** The disabled look of a row that still answers its tap (a group at its maximum shows why). */
  dimmed?: boolean
  /** The row's own action. Without it the row is a plain box (its controls apart). */
  onPress?: () => void
  /** The row's text: its title (`OText` at the weight the caller gives the selected one) and what follows it. */
  children: React.ReactNode
  /** What comes before the mark (a price, a quantity). */
  trailing?: React.ReactNode
  /** The last row of a list: no divider under it. */
  last?: boolean
  testID?: string
  accessibilityLabel?: string
}

/**
 * A row of a list of choices (a language, a reason, a printer, a sound), as every board draws it: a row of
 * `components.list_row` (its minimum height, its gap and its divider) with the text first and the mark
 * (`ChoiceMark`: a radio, or a check for several) at the end. The whole row is the touch target. The row
 * that is selected is told by its mark and by the weight its caller gives its title.
 */
const ChoiceRow = ({ kind = 'radio', selected, disabled, dimmed, onPress, children, trailing, last = false, testID, accessibilityLabel }: Props) => {
  const theme: any = useTheme()
  const row = theme.native.components.list_row.base
  const styles = useMemo(() => StyleSheet.create({
    row: {
      minHeight: row.min_height,
      flexDirection: 'row',
      alignItems: 'center',
      gap: row.gap,
      ...(!last && row.divider && { borderBottomWidth: row.divider.borderWidth, borderBottomColor: row.divider.borderColor })
    },
    content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: row.gap },
    disabled: { opacity: themeOpacity(theme, 'disabled') },
    pressed: { opacity: themeOpacity(theme, 'pressed') }
  }), [theme, row, last])

  return (
    <Pressable
      testID={testID}
      accessibilityRole={kind === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, (disabled || dimmed) && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.content}>{children}</View>
      {trailing}
      <ChoiceMark kind={kind} checked={selected} />
    </Pressable>
  )
}

export default ChoiceRow
