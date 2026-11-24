import React, { useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { themeSpace } from '@/theme/helpers'
import { Icon, OCard, ODivider } from '../shared'

interface Props {
  open: boolean
  onToggle: () => void
  /** What the row is called for the screen reader. */
  label: string
  /** The header's texts. */
  header: React.ReactNode
  /** What the row opens. */
  body?: React.ReactNode
  testID?: string
}

/**
 * A row that folds (the total, the products of a delivery on its way, the order's timeline, "More details"): its
 * header is a touch target at least `order_details.folded_min_height` tall with the app's accordion glyph at the
 * end, and what it opens goes under a line, in the same card.
 */
export const FoldedRow = ({ open, onToggle, label, header, body, testID }: Props) => {
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  // The card without its own padding: the header and the body carry theirs (the header is the whole touch target).
  const flat = useMemo(() => ({ padding: themeSpace(theme, 'none') }), [theme])
  return (
    <OCard look={flat} style={styles.foldCard} testID={testID && `${testID}-card`}>
      <Pressable
        testID={testID}
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={({ pressed }) => [styles.fold, pressed && styles.pressed]}
      >
        <View style={styles.grow}>{header}</View>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} color='text_muted' />
      </Pressable>
      {open && !!body && (
        <>
          <ODivider />
          <View style={styles.foldBody} testID={testID && `${testID}-body`}>{body}</View>
        </>
      )}
    </OCard>
  )
}
