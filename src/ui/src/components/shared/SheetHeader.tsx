import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { nativeTextStyle, themeSpace, themeTitleAlign } from '@/theme/helpers'
import OText from './OText'
import IconTile from './IconTile'
import { ModalCloseButton, closeButtonInset } from './styles'

interface Props {
  title?: string
  titleStyle?: any
  /** The close button (`sheet.slots.close`) at the end of the title row. */
  onClose?: () => void
  /** The small handle drawn above the title: decoration of a sheet docked at the bottom. */
  handle?: boolean
  /** A glyph in the sheet's tile slot (`sheet.slots.tile`: an `IconTile`) before the title. */
  tile?: string
  testID?: string
}

/**
 * The top of a sheet, as the mockups draw it: the handle (40 × 4), then the title row: the
 * sheet's padding at the sides, the title in the sheet's title look, an optional tile before it
 * and the close button at the end (its glyph, not its 44 box, sits on the padding). `OBottomPopup`
 * is made of this and its body; a sheet laid out by a screen (the new-order alert) draws it itself.
 */
export const SheetHeader = ({ title, titleStyle, onClose, handle = true, tile, testID }: Props) => {
  const theme: any = useTheme()
  const sheet = theme.native.components.sheet
  const styles = useMemo(() => StyleSheet.create({
    handleRow: { paddingTop: sheet.base.padding_top, alignItems: 'center' },
    handle: {
      backgroundColor: sheet.base.handle_color,
      height: sheet.base.handle_height,
      width: sheet.base.handle_width,
      borderRadius: theme.native.tokens.radius.full
    },
    // The title row: `sheet.padding` at the sides and over it; the body starts `md` under it, as every board draws it.
    row: {
      position: 'relative',
      padding: sheet.base.padding,
      paddingBottom: themeSpace(theme, 'md'),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: themeSpace(theme, 'sm')
    },
    underHandle: { paddingTop: themeSpace(theme, 'md') },
    bare: { paddingBottom: 0 },
    title: { ...nativeTextStyle(sheet.base.title), color: sheet.base.title_color, textAlign: themeTitleAlign(theme), flex: 1 },
    close: { marginRight: -closeButtonInset(theme) }
  }), [theme, sheet])
  const tileSlot = sheet.slots.tile
  return (
    <View testID={testID}>
      {handle && (
        <View style={styles.handleRow} accessibilityElementsHidden importantForAccessibility='no-hide-descendants'>
          <View style={styles.handle} testID='sheet-handle' />
        </View>
      )}
      <View style={[styles.row, handle && styles.underHandle, !title && !onClose && styles.bare]}>
        {!!tile && <IconTile icon={tile} size={tileSlot.size} variant={tileSlot.variant} />}
        {!!title && <OText style={[styles.title, titleStyle]}>{title}</OText>}
        {!!onClose && (
          <View style={styles.close}>
            <ModalCloseButton onPress={onClose} />
          </View>
        )}
      </View>
    </View>
  )
}

export default SheetHeader
