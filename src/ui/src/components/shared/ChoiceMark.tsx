import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { onColor } from '@orderingco/ordering-theme-engine/colors'
import { themeBorderWidth, themeSpace } from '@/theme/helpers'
import Icon from './Icon'

interface Props {
  /** `radio` for a single choice, `check` for a multiple one. */
  kind: 'radio' | 'check'
  checked: boolean
  style?: any
  testID?: string
}

/**
 * The indicator of a choice: the theme's radio (`components.radio`: a ring with its dot) for a single
 * choice and its checkbox (`components.checkbox`: a rounded box, filled with a check when checked)
 * for a multiple one. Both are drawn, at the theme's size, so they are the same on both platforms.
 * The row around it carries the disabled look and the touch area (`ChoiceRow`, `OCheckbox`).
 */
const ChoiceMark = ({ kind, checked, style, testID }: Props) => {
  const theme: any = useTheme()
  const radio = theme.native.components.radio.base
  const checkbox = theme.native.components.checkbox.base
  const ink = checked ? radio.checked : radio.unchecked
  const styles = useMemo(() => StyleSheet.create({
    // The ring is the radio's size as drawn (the border is inside it); a radius over half of it makes a circle.
    ring: {
      width: radio.size,
      height: radio.size,
      borderRadius: radio.size,
      borderWidth: themeBorderWidth(theme, 'thick'),
      padding: themeSpace(theme, 'xxs')
    },
    dot: { flex: 1, borderRadius: radio.size },
    box: {
      width: checkbox.size,
      height: checkbox.size,
      borderRadius: checkbox.radius,
      alignItems: 'center',
      justifyContent: 'center',
      ...checkbox.border
    },
    boxChecked: { backgroundColor: checkbox.checked, borderColor: checkbox.checked }
  }), [theme, radio, checkbox])
  if (kind === 'radio') {
    return (
      <View testID={testID} style={[styles.ring, { borderColor: ink }, style]}>
        {checked && <View testID={testID && `${testID}-dot`} style={[styles.dot, { backgroundColor: ink }]} />}
      </View>
    )
  }
  return (
    <View testID={testID} style={[styles.box, checked && styles.boxChecked, style]}>
      {checked && <Icon name='checkmark' size='md' color={onColor(checkbox.checked) as string} />}
    </View>
  )
}

export default ChoiceMark
