import { StyleSheet } from 'react-native'
import { nativeTextStyle, themeColor, themeControlHeight, themeOpacity, themeSpace } from '@/theme/helpers'
import type { OrderBandVariant } from '../shared/orderStates'

const BAND_VARIANTS: OrderBandVariant[] = ['primary_soft', 'success_soft', 'warning_soft', 'danger_soft']

/**
 * The order card (`components.order_card`), as the approved drawing has it (the status band, the owner's choice of
 * 2026-11-23): a band across the top with the status and the time, on the soft colour of the status or of a late time; under
 * it the header (the store's tile, its name over "#number · customer", the total at the end), the facts (type, Paid / Unpaid,
 * the items), and the quick actions across the width. The card grows with its content.
 *
 * The band is the status's label stretched over the card: its colours are the badge's soft variants, its content is as tall as
 * a badge, its text is the card's `time_text`. The card itself has no padding (the band reaches its edges): `main` and `rest`
 * carry the card's.
 */
export const orderCardStyles = (theme: any) => {
  const card = theme.native.components.order_card.base
  const padding = card.padding ?? theme.native.components.card.base.padding
  const badge = theme.native.components.badge
  const soft = badge.variants.warning_soft
  // The band's top corners follow the card's, inside its border.
  const inner = Math.max(0, (card.radius ?? 0) - (card.border?.borderWidth ?? 0))
  const bandText = nativeTextStyle(card.time_text)
  // The band is as tall as a badge with the smallest space above and below it.
  const bandPad = themeSpace(theme, 'xs')
  const paints: Record<string, any> = {}
  BAND_VARIANTS.forEach((variant) => {
    const look = badge.variants[variant]
    paints[`band_${variant}`] = { backgroundColor: look.background }
    paints[`bandInk_${variant}`] = { color: look.color }
  })
  return StyleSheet.create({
    ...paints,
    // The card's box: no padding of its own but the bottom's; the tap area (band and main) and what follows it, `sm` apart.
    flush: { paddingBottom: padding, gap: themeSpace(theme, 'sm') },
    band: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm'),
      minHeight: badge.sizes.md.height + bandPad + bandPad,
      paddingVertical: bandPad,
      paddingHorizontal: padding,
      borderTopLeftRadius: inner,
      borderTopRightRadius: inner
    },
    // The status takes the room the time leaves and as many lines as its words need.
    bandStart: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: badge.base.dot_gap },
    bandStatus: { ...bandText, flexShrink: 1 },
    // The time ends at the card's edge; a long one (the clock time in a long language) takes a second line, never the status's room.
    bandTime: { ...bandText, flexShrink: 0, maxWidth: '60%', textAlign: 'right', fontVariant: ['tabular-nums'] },
    bandTimeAlone: { ...bandText, flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
    // The card's blocks under the band (header, facts, reason), `sm` apart.
    main: { paddingTop: padding, paddingHorizontal: padding, gap: themeSpace(theme, 'sm') },
    // What follows the tap area (pending sync, review, the buttons; a group's orders), `sm` apart.
    rest: { paddingHorizontal: padding, gap: themeSpace(theme, 'sm') },
    // The header: the store's tile, the two lines of text, the total at the end.
    header: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    titles: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'xs') },
    // The store's name over the title: the card's small muted text, one line ending in an ellipsis.
    storeName: { ...nativeTextStyle(card.meta), color: card.meta_color },
    title: { ...nativeTextStyle(card.number_text), color: card.name_color, flexShrink: 1 },
    unreadDot: { width: badge.base.dot_size, height: badge.base.dot_size, borderRadius: theme.native.tokens.radius.full, backgroundColor: themeColor(theme, 'primary') },
    total: { color: card.name_color, flexShrink: 0 },
    // The facts: chips and a small text, one row that wraps if it must, `xs` apart.
    facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: themeSpace(theme, 'xs'), rowGap: themeSpace(theme, 'xs') },
    chip: { alignSelf: 'center' },
    factsEnd: { marginLeft: 'auto' },
    items: { ...nativeTextStyle(card.meta), color: card.meta_color, marginLeft: themeSpace(theme, 'xs') },
    meta: { ...nativeTextStyle(card.meta), color: card.meta_color },
    spacer: { flex: 1 },
    // The buttons: Reject / Accept share the row 1 : 2, a lone one takes it all.
    actions: { flexDirection: 'row', gap: themeSpace(theme, 'sm') },
    decline: { flex: 1 },
    // The pickup pair ("Not picked up" / "Picked up") is written, not shared 1 : 2: each cell is as wide as its label and the
    // room that is left goes 1 : 2, so the shorter label is never the narrower share of a narrow column (T3-C2: "Picked / up"
    // in the board's Ready column); a column too narrow for both shrinks the labels (`fitText`).
    declineLong: { flexGrow: 1, flexShrink: 1 },
    advance: { flex: 2 },
    advanceLong: { flexGrow: 2, flexShrink: 1 },
    advanceAlone: { flex: 1 },
    // "Pending sync": the soft warning badge with its glyph.
    pending: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: badge.base.dot_gap,
      minHeight: badge.sizes.md.height,
      paddingHorizontal: badge.sizes.md.padding_x,
      borderRadius: badge.base.radius,
      backgroundColor: soft.background
    },
    pendingText: { ...nativeTextStyle(badge.base.text), color: soft.color },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    hidden: { display: 'none' },
    // An order inside a group: a row of the group's card.
    child: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm'), minHeight: themeControlHeight(theme, 'md') },
    childBody: { flex: 1, gap: themeSpace(theme, 'xs') },
    childTitle: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') }
  })
}

/** The card's look for `OCard`, without its padding (the band reaches the card's edges; the card's blocks carry it). */
export const flushLook = (look: Record<string, any>) => ({ ...look, padding: 0 })

/** The list of rows of a section, and a group's open body. */
export const ordersListStyles = (theme: any) => StyleSheet.create({
  list: { gap: themeSpace(theme, 'md') },
  // The rows of a virtualized list: the space before an item depends on what is above it.
  beforeRow: { paddingTop: themeSpace(theme, 'md') },
  beforeTitle: { paddingTop: themeSpace(theme, 'lg') },
  afterTitle: { paddingTop: themeSpace(theme, 'sm') },
  groupBody: { gap: themeSpace(theme, 'sm') },
  hidden: { display: 'none' }
})
