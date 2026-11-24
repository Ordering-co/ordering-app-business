import React, { memo, useMemo } from 'react'
import { Pressable, View } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useLanguage } from '@components'
import { nativeTextStyle, themeVisible } from '@/theme/helpers'
import OText from '../shared/OText'
import OSwitch from '../shared/OSwitch'
import OAvatar from '../shared/OAvatar'
import IconTile from '../shared/IconTile'
import { menuStyles } from './styles'

interface Props {
  product: any
  /** Off or paused: its name is muted and its switch is off. A boolean, so a clock tick that changes nothing for the row does not redraw it. */
  unavailable: boolean
  /** The price text (already formatted), or undefined. */
  price?: string
  /** The line under the name: the category and the reason, in the unavailable view. */
  detail?: string
  /** The reason line in the danger color ("Unavailable · back tomorrow"); tapping it sets how long. */
  reason?: string
  busy?: boolean
  disabled?: boolean
  /** The row's three actions take the product: the same function serves every row (the row is memoized). */
  onOpen: (product: any) => void
  onToggle: (product: any, turnOn: boolean) => void
  onReason?: (product: any) => void
}

/**
 * A product of the menu (`components.menu_row`): its picture (or a glyph tile), its name and price, and the switch
 * "available". The left part opens the product's options; the switch has its own 52 x 44 touch box. A product that
 * is off or paused has its name muted, its switch off and, in the menu, the red line "Unavailable · …" that opens
 * the duration sheet. It is memoized on primitives (the product, whether it is unavailable, its texts) and on three
 * functions that do not change, so a minute's tick or a change of another row redraws none of the others.
 */
export const MenuRow = memo(({ product, unavailable, price, detail, reason, busy, disabled, onOpen, onToggle, onReason }: Props) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const styles = useMemo(() => menuStyles(theme), [theme])
  const look = theme.native.components.menu_row
  const tile = look.slots.tile
  const nameStyle = useMemo(() => ({ ...nativeTextStyle(look.base.name), color: unavailable ? look.base.unavailable_name_color : look.base.name_color }), [look, unavailable])
  const priceStyle = useMemo(() => ({ ...nativeTextStyle(look.base.price), color: look.base.price_color }), [look])
  const reasonStyle = useMemo(() => ({ ...nativeTextStyle(look.base.price), color: look.base.unavailable_color }), [look])
  const showImage = themeVisible(theme, 'product.image') && !!product.images
  const showPrice = !!price
  const showReason = themeVisible(theme, 'products.unavailable_reason')
  return (
    <View style={styles.row} testID={`menu-row-${product.id}`}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={product.name}
        onPress={() => onOpen(product)}
        style={({ pressed }) => [styles.rowOpen, pressed && styles.pressed]}
        testID={`menu-open-${product.id}`}
      >
        {showImage
          ? <OAvatar source={product.images} kind='business' size='md' tone='neutral' name={product.name} />
          : <IconTile icon='image-outline' size={tile.size} variant={tile.variant} />}
        <View style={styles.rowTexts}>
          <OText style={nameStyle} numberOfLines={2}>{product.name}</OText>
          {!!detail && <OText style={priceStyle} numberOfLines={1} testID={`menu-detail-${product.id}`}>{detail}</OText>}
          {!detail && showPrice && <OText style={priceStyle} numberOfLines={1}>{price}</OText>}
          {!!reason && showReason && (
            <Pressable
              accessibilityRole='button'
              accessibilityLabel={reason}
              onPress={() => onReason?.(product)}
              disabled={!onReason || disabled}
              hitSlop={styles.slop}
              testID={`menu-reason-${product.id}`}
            >
              <OText style={reasonStyle} numberOfLines={1}>{reason}</OText>
            </Pressable>
          )}
        </View>
      </Pressable>
      <OSwitch
        value={!unavailable}
        disabled={disabled || busy}
        onChange={(turnOn: boolean) => onToggle(product, turnOn)}
        accessibilityLabel={t('AVAILABLE_NAME', '_name_ available').replace('_name_', product.name)}
        testID={`menu-switch-${product.id}`}
      />
    </View>
  )
})

export default MenuRow
