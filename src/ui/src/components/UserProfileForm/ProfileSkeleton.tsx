import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { profileStyles } from './styles'
import { CardRow, RowsCard } from './RowsCard'
import { SkeletonBone } from '../shared'
import { nativeTextStyle, themeControlHeight, themePart, themeSpace } from '@/theme/helpers'
import { usePageSections } from '@/theme/sections'

/** The rows each card of the skeleton stands for: the personal data and its password, the account's list, support, log out. */
const INFORMATION_ROWS = 5
const ACCOUNT_ROWS = 4
const SUPPORT_ROWS = 2
const LOGOUT_ROWS = 1

/**
 * The size of each piece of the loaded profile, from the same places the loaded pieces are drawn
 * with (`profileStyles`, the list row, the section's title), so the two cannot drift.
 */
export const profileSkeletonMetrics = (theme: any) => {
  const photo = themePart(theme, 'profile_photo', 'base')
  const row = themePart(theme, 'list_row', 'base')
  const section = themePart(theme, 'section_header', 'base')
  const page = themePart(theme, 'account_page', 'base')
  return {
    photo: photo.size,
    photoRadius: photo.radius,
    /** The name's line and the lines of e-mail and phone under it. */
    name: nativeTextStyle(photo.text).lineHeight,
    meta: nativeTextStyle(row.subtitle).lineHeight,
    /** A section's title (the profile's own look of it) and the space under it. */
    title: nativeTextStyle(page.title).lineHeight,
    titleGap: section.margin_bottom,
    /** A list row's title line, in the row's own padding. */
    rowTitle: nativeTextStyle(row.title).lineHeight,
    rowPadding: row.padding_y,
    /** A row that opens something is as high as the control `lg`; the row's own padding is the least it keeps. */
    rowHeight: themeControlHeight(theme, 'lg'),
  }
}

/**
 * The profile while it loads: its photo and who the user is, then one card of rows for the information, the account,
 * support and log out, as the page draws them. A section the theme hides draws no bone.
 */
export const ProfileSkeleton = () => {
  const theme: any = useTheme()
  const { isVisible } = usePageSections('profile')
  const styles = useMemo(() => profileStyles(theme), [theme])
  const m = useMemo(() => profileSkeletonMetrics(theme), [theme])
  const own = useMemo(() => StyleSheet.create({
    row: { minHeight: m.rowHeight, justifyContent: 'center', paddingVertical: m.rowPadding },
    who: { gap: themeSpace(theme, 'xs') },
    title: { marginBottom: m.titleGap },
  }), [theme, m.rowHeight, m.rowPadding, m.titleGap])

  const rows = (count: number, first = 0) => (
    <RowsCard>
      {Array.from({ length: count }, (_, index) => (
        <CardRow key={index}>
          <View style={own.row}>
            <SkeletonBone width='50%' height={m.rowTitle} delay={(first + index) * 100} />
          </View>
        </CardRow>
      ))}
    </RowsCard>
  )

  const titled = (count: number, delay: number) => (
    <View>
      <View style={own.title}>
        <SkeletonBone width='30%' height={m.title} delay={delay} />
      </View>
      {rows(count)}
    </View>
  )

  return (
    <View style={styles.content} testID='profile-skeleton'>
      {isVisible('profile_photo') && (
        <View style={styles.identity}>
          <SkeletonBone width={m.photo} height={m.photo} borderRadius={m.photoRadius} />
          <View style={[styles.who, own.who]}>
            <SkeletonBone width='50%' height={m.name} delay={100} />
            <SkeletonBone width='40%' height={m.meta} delay={200} />
            <SkeletonBone width='70%' height={m.meta} delay={300} />
          </View>
        </View>
      )}
      {isVisible('information') && titled(INFORMATION_ROWS, 400)}
      {isVisible('account') && titled(ACCOUNT_ROWS, 500)}
      {isVisible('support') && titled(SUPPORT_ROWS, 600)}
      {isVisible('logout') && rows(LOGOUT_ROWS, 7)}
    </View>
  )
}
