import { StyleSheet } from 'react-native'

import { nativeTextStyle, themeSpace } from '@/theme/helpers'
import { prepLineHeight } from './PrepTimeValue'

/**
 * The look of the sheets, from the theme: the mockups' spacing (`md` between the blocks of a sheet, `sm` between the
 * pieces of a block, `xs` between a label and its field) and the pieces `components.stepper`, `components.icon_tile`
 * and `components.list_row` give. Built inside the component on the theme, never at module level.
 */
export const sheetStyles = (theme: any) => {
  const stepper = theme.native.components.stepper
  const tile = theme.native.components.icon_tile
  return StyleSheet.create({
    body: { gap: themeSpace(theme, 'md') },
    label: { gap: 0 },
    // A row of equal chips (the presets and the adjustments): each in a cell that gives it the same width.
    chips: { flexDirection: 'row', gap: themeSpace(theme, 'xs') },
    chipCell: { flex: 1 },
    // The reasons wrap over several lines, `sm` apart both ways (the mockup's group).
    reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: themeSpace(theme, 'sm') },
    // The stepper's box: the minus, the figure over its line, the plus.
    // The minus, the value and the plus start at the same line: each button is centred in a box as tall as the value's first
    // line (the figure at rest, the field while typing), so they are level with the number, with the caption under it.
    stepper: { flexDirection: 'row', alignItems: 'flex-start', gap: themeSpace(theme, 'sm') },
    stepperSide: { minHeight: prepLineHeight(theme), justifyContent: 'center' },
    stepperValue: { flex: 1, alignItems: 'center' },
    figure: { ...nativeTextStyle(stepper.sizes.lg.value), color: stepper.base.value_color, textAlign: 'center' },
    centered: { alignItems: 'center' },
    // A line with a glyph before it (the printer that prints, "customer and driver will be notified").
    note: { flexDirection: 'row', alignItems: 'center', gap: themeSpace(theme, 'sm') },
    noteText: { flex: 1 },
    footer: { gap: themeSpace(theme, 'sm') },
    // The initials of a driver in a disc (`icon_tile` md, round).
    initials: { width: tile.sizes.md.size, height: tile.sizes.md.size, borderRadius: tile.shapes.round.radius, alignItems: 'center', justifyContent: 'center' },
    initialsBrand: { backgroundColor: tile.variants.brand.background },
    initialsNeutral: { backgroundColor: tile.variants.neutral.background },
    rowText: { flex: 1 },
    list: { },
    loading: { alignItems: 'center', paddingVertical: themeSpace(theme, 'md') }
  })
}
