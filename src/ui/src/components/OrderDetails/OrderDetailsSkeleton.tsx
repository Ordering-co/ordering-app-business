import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { themeControlHeight, themePart, themeRadius, themeText } from '@/theme/helpers'
import { OCard, SkeletonBone } from '../shared'

/**
 * The page while the order loads, in the page's own shape: the chips row, the customer's card, a products card and
 * the total, each bone the size of the line it stands for (the text looks and controls of the theme). The bar above
 * it is the page's, with its back arrow, so the way out is there while it loads.
 */
export const OrderDetailsSkeleton = () => {
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const m = useMemo(() => ({
    badge: themePart(theme, 'badge', 'sizes.md.height'),
    badgeWidth: 2 * themeControlHeight(theme, 'lg'),
    avatar: themePart(theme, 'avatar', 'sizes.md.size'),
    meta: themeText(theme, 'body_sm').lineHeight,
    line: themeText(theme, 'body').lineHeight,
    label: themeText(theme, 'label').lineHeight,
    pill: themeRadius(theme, 'md'),
    round: themeRadius(theme, 'full')
  }), [theme])
  return (
    <View style={styles.content} testID='order-skeleton'>
      <View style={styles.chips}>
        <SkeletonBone width={m.badgeWidth} height={m.badge} borderRadius={m.pill} />
        <SkeletonBone width={m.badgeWidth} height={m.badge} borderRadius={m.pill} />
      </View>
      <OCard>
        <View style={styles.skeletonRow}>
          <SkeletonBone width={m.avatar} height={m.avatar} borderRadius={m.round} />
          <View style={styles.skeletonColumn}>
            <SkeletonBone width='50%' height={m.label} />
            <SkeletonBone width='30%' height={m.meta} />
          </View>
        </View>
        <SkeletonBone width='80%' height={m.line} />
      </OCard>
      <OCard>
        <SkeletonBone width='40%' height={m.label} />
        <SkeletonBone width='90%' height={m.line} />
        <SkeletonBone width='70%' height={m.line} />
        <SkeletonBone width='85%' height={m.line} />
      </OCard>
      <OCard>
        <SkeletonBone width='60%' height={m.meta} />
        <SkeletonBone width='100%' height={m.line} />
      </OCard>
    </View>
  )
}
