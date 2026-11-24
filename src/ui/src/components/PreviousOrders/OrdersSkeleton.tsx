import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { themePart, themeRadius, themeSpace } from '@/theme/helpers'
import { OCard, SkeletonBone } from '../shared'
import { flushLook, orderCardStyles } from './styles'

/**
 * The orders list while it loads: `count` placeholder cards shaped as the real ones (the band with the status and the time,
 * the header with the total, the facts, the buttons), `md` apart as the list's. Every size is the real piece's own (text lines, badge, button).
 */
export const OrdersSkeleton = ({ count = 4, actions = true }: { count?: number, actions?: boolean }) => {
  const theme: any = useTheme()
  const look = themePart(theme, 'order_card', 'base')
  const flush = useMemo(() => flushLook(look), [look])
  const card = useMemo(() => orderCardStyles(theme), [theme])
  const button = theme.native.components.button.sizes.md
  const badge = theme.native.components.badge.sizes.md
  const styles = useMemo(() => StyleSheet.create({
    list: { gap: themeSpace(theme, 'md') },
    head: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    titles: { flex: 1, gap: themeSpace(theme, 'xs') },
    band: { justifyContent: 'space-between' },
    facts: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') }
  }), [theme])
  const tile = theme.native.components.avatar.sizes.md.size
  const h4 = theme.native.tokens.typography.h4
  const radius = theme.native.components.badge.base.radius
  return (
    <View style={styles.list} testID='orders-skeleton'>
      {Array.from({ length: count }, (_, index) => (
        <OCard key={index} look={flush} style={card.flush}>
          <View>
            <View style={[card.band, styles.band]}>
              <SkeletonBone width='35%' height={look.time_text.lineHeight} delay={index * 100} />
              <SkeletonBone width='22%' height={look.time_text.lineHeight} delay={index * 100} />
            </View>
            <View style={card.main}>
              <View style={styles.head}>
                <SkeletonBone width={tile} height={tile} borderRadius={themeRadius(theme, 'sm')} delay={index * 100} />
                <View style={styles.titles}>
                  <SkeletonBone width='30%' height={look.meta.lineHeight} delay={index * 100} />
                  <SkeletonBone width='60%' height={look.number_text.lineHeight} delay={index * 100} />
                </View>
                <SkeletonBone width='22%' height={h4.lineHeight} delay={index * 100} />
              </View>
              <View style={styles.facts}>
                <SkeletonBone width='22%' height={badge.height} borderRadius={radius} delay={index * 100} />
                <SkeletonBone width='18%' height={badge.height} borderRadius={radius} delay={index * 100} />
                <SkeletonBone width='15%' height={look.meta.lineHeight} delay={index * 100} />
              </View>
            </View>
          </View>
          {actions && (
            <View style={card.rest}>
              <View style={styles.actions}>
                <SkeletonBone flex={1} height={button.height} borderRadius={theme.native.components.button.base.radius} delay={index * 100} />
                <SkeletonBone flex={2} height={button.height} borderRadius={theme.native.components.button.base.radius} delay={index * 100} />
              </View>
            </View>
          )}
        </OCard>
      ))}
    </View>
  )
}

export default OrdersSkeleton
