import React, { useMemo, useState } from 'react'
import { Image, StyleSheet, View, ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeBoxStyle, nativeTextStyle, themeColor, themeRadius, themeText, type TextPreset } from '@/theme/helpers'
import { imageUrl } from '@/utils/imageUrl'
import Icon from './Icon'
import OText from './OText'

/**
 * A person's picture or a store's logo: `components.avatar` (its sizes, its
 * shape, its fill). A person is the avatar's own shape (round); a store's logo
 * is a rounded square (the `sm` radius) on every screen. Without a picture it
 * draws the name's initials, or a glyph on the avatar's fill (the schema has no
 * placeholder image: decision of docs/theme/pages-and-visibility.md). `tone='neutral'` makes that placeholder a quiet disc (the
 * border's grey under a muted outline glyph, no theme picture), for a person who
 * simply has no photo, as the customer in the review. A picture that does not
 * load (a URL that answers an error, a photo that was deleted) gives way to
 * that same placeholder, never to an empty box.
 */
/** The text preset of the initials by the avatar's size: a disc of 24 holds a caption, one of 88 a title. */
const INITIALS_PRESET: Record<string, TextPreset> = { xs: 'caption', sm: 'body_sm', md: 'label', lg: 'h4', xl: 'h2' }

/** The initials of a name: the first letter of its first two words, upper-cased (`Ana Torres` is `AT`). */
export const initialsOf = (name?: string | null): string => {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((word) => Array.from(word)[0]?.toUpperCase() ?? '').join('')
}

/** How many times its box a served picture is asked at (a size of the request, not of the design). */
const REQUEST_SCALE = 2

/**
 * A served picture is taken from the cache whatever its age, and from the network only when it is
 * not there: a logo's URL names its picture (what the removed FastImage did with its immutable
 * cache). iOS reads it; Android's image cache already works by URL.
 */
const IMAGE_CACHE = 'force-cache' as const

interface Props {
  /** The picture's URL (the avatar asks the image server for the size it paints), or a bundled image. */
  source?: string | number | { uri: string } | null
  kind?: 'person' | 'business'
  /**
   * What the placeholder (no picture, or one that failed) looks like: `brand` is the avatar's own fill
   * and the theme's placeholder picture, `neutral` a quiet disc with a muted glyph and no picture.
   * A served picture is drawn the same in both.
   */
  tone?: 'brand' | 'neutral'
  /** A size of the avatar, or (for a component with its own picture size) a size in pt. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  /** The person's or store's name: without a picture the avatar draws its initials (`AT`), not a glyph. */
  name?: string | null
  /** The quiet pair of the theme (`avatar.muted_*`): a conversation that ended. */
  muted?: boolean
  /** The glyph's size when `size` is in pt. */
  iconSize?: number
  /** A radius in place of the kind's own: the profile's photo has its own (`components.profile_photo`). */
  radius?: number
  style?: ViewStyle
  testID?: string
}

export const OAvatar = ({ source, kind = 'person', tone = 'brand', size = 'md', name, muted = false, iconSize, radius, style, testID }: Props) => {
  const theme: any = useTheme()
  const avatar = theme.native.components.avatar
  const sized = useMemo(() => typeof size === 'number'
    ? { size, icon_size: iconSize ?? avatar.sizes.sm.icon_size }
    : avatar.sizes[size], [avatar, size, iconSize])
  // A store's logo frame is the rounded square everywhere; a person keeps the avatar's shape.
  const shape = radius ?? (kind === 'business' ? themeRadius(theme, 'sm') : avatar.base.radius)
  const neutral = tone === 'neutral'
  const styles = useMemo(() => StyleSheet.create({
    box: {
      width: sized.size,
      height: sized.size,
      borderRadius: shape,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...nativeBoxStyle({ background: muted ? avatar.base.muted_background : avatar.base.background, border: avatar.base.border }),
    },
    initials: { ...nativeTextStyle(themeText(theme, INITIALS_PRESET[typeof size === 'number' ? 'md' : size], { weight: 600 })), color: muted ? avatar.base.muted_color : avatar.base.color },
    // The neutral placeholder's disc: the border's grey in place of the avatar's fill.
    quiet: { backgroundColor: themeColor(theme, 'border') },
    image: { width: sized.size, height: sized.size },
  }), [avatar, sized, shape, theme, muted, size])
  // A served picture is asked near the size it paints (`imageUrl`): a logo uploaded at 2000 px is not
  // downloaded and decoded for a box of 60 pt. Twice the box's height and no width, so a wide or a
  // tall picture still covers the square. The SDK's `optimizeImage` returns its URL unchanged.
  const remote = useMemo(
    () => (typeof source === 'string' ? { uri: imageUrl(source, { height: sized.size * REQUEST_SCALE }) ?? source, cache: IMAGE_CACHE } : null),
    [source, sized]
  )
  const given = source ? (remote ?? source) : null
  // The picture that failed, by its address: a new source is tried again, and a picture that loads is
  // drawn at once (the placeholder is not shown first).
  const [failed, setFailed] = useState<string | number | null>(null)
  const initials = initialsOf(name)
  const pictureKey = typeof given === 'object' && given ? given.uri : given
  const picture = given && failed !== pictureKey ? given : null
  return (
    <View style={[styles.box, !picture && neutral && styles.quiet, style]} testID={testID}>
      {picture
        ? <Image source={picture as any} style={styles.image} resizeMode='cover' onError={picture === given ? () => setFailed(pictureKey) : undefined} />
        : initials && !neutral
          ? <OText style={styles.initials} numberOfLines={1}>{initials}</OText>
          : neutral
          ? <Icon name={kind === 'business' ? 'storefront-outline' : 'person-outline'} size={sized.icon_size} color='text_muted' />
          : <Icon name={kind === 'business' ? 'storefront' : 'person'} size={sized.icon_size} color={muted ? avatar.base.muted_color : avatar.base.color} />}
    </View>
  )
}

export default OAvatar
