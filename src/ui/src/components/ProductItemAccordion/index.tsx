import React, { useMemo } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { OCheckbox, OText } from '../shared'
import { detailsStyles } from '../OrderDetails/styles'
import { productDetailLines, productTotal } from '../OrderDetails/orderData'

import { useLanguage, useUtils } from '@components'

interface Props {
  product: any
  /** The preparation checklist: a checkbox before the line (the line is struck through once it is checked). */
  checklist?: { checked: boolean, onToggle: () => void }
  // The retired order summary page still passes the old accordion's props.
  [legacy: string]: any
}

/**
 * One product line of an order: its quantity (`1 ×`), its name, what the kitchen reads under it (its options and
 * the ingredients taken out), the customer's note for it and its price. With `checklist` a 44 pt checkbox goes
 * before it (the preparation checklist of an order that is being made).
 */
export const ProductItemAccordion = ({ product, checklist }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const [{ parsePrice }] = useUtils()
  const styles = useMemo(() => detailsStyles(theme), [theme])

  const details = productDetailLines(product, t)
  const checked = !!checklist?.checked

  return (
    <View style={styles.product} testID={`product-line-${product?.id}`}>
      {!!checklist && (
        <View style={styles.checkTarget}>
          <OCheckbox
            value={checked}
            onValueChange={() => checklist.onToggle()}
            accessibilityLabel={product?.name}
            testID={`product-check-${product?.id}`}
          />
        </View>
      )}
      <OText preset='label' style={styles.productQty}>{`${product?.quantity} ×`}</OText>
      <View style={styles.productTexts}>
        <OText preset='label' style={checked ? styles.done : undefined}>{product?.name}</OText>
        {details.length > 0 && (
          <OText preset='body_sm' color='text_muted' style={checked ? styles.done : undefined}>{details.join(' · ')}</OText>
        )}
        {!!product?.comment && (
          <View style={styles.productNote}>
            <OText preset='body_sm' style={styles.productNoteText}>{t('NOTE_PREFIX', 'Note: _text_').replace('_text_', product.comment)}</OText>
          </View>
        )}
      </View>
      <OText>{parsePrice(productTotal(product))}</OText>
    </View>
  )
}
