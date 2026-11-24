import React, { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { detailsStyles } from './styles'
import { FoldedRow } from './FoldedRow'
import { productCountText } from './orderData'
import { ProductItemAccordion } from '../ProductItemAccordion'
import { ODivider, OCard, OText } from '../shared'

import { useLanguage } from '@components'

interface Props {
  order: any
  /** The preparation checklist (a checkbox before each line): the order is being made and the theme shows it. */
  checklist?: { done: Array<string | number>, toggle: (id: string | number) => void }
  /** The card folds (a delivery on its way): a line of what is in it, opened on a tap. */
  folded?: boolean
}

/** The id of a product line for the checklist: the order product's own id, else its position. */
const lineId = (product: any, index: number) => product?.id ?? `line-${index}`

/**
 * The products of the order: how many (and how many items), then one line each (quantity, name, options, the
 * customer's note for it, price). While the order is being made the lines have a checkbox and the card says how
 * many are done. A delivery on its way folds it to a row.
 */
export const ProductsCard = ({ order, checklist, folded = false }: Props) => {
  const [, t] = useLanguage()
  const theme: any = useTheme()
  const styles = useMemo(() => detailsStyles(theme), [theme])
  const [open, setOpen] = useState(false)
  const products: any[] = Array.isArray(order?.products) ? order.products : []
  if (products.length === 0) return null

  const title = productCountText(order, t)
  const doneCount = checklist ? products.filter((product, index) => checklist.done.includes(lineId(product, index))).length : 0
  const lines = (
    <View style={styles.lineGap}>
      {products.map((product, index) => {
        const id = lineId(product, index)
        return (
          <React.Fragment key={id}>
            {index > 0 && <ODivider />}
            <ProductItemAccordion
              product={product}
              checklist={checklist ? { checked: checklist.done.includes(id), onToggle: () => checklist.toggle(id) } : undefined}
            />
          </React.Fragment>
        )
      })}
    </View>
  )

  if (folded) {
    const summary = products.map((product) => `${product?.quantity} ${product?.name}`).join(', ')
    return (
      <FoldedRow
        open={open}
        onToggle={() => setOpen(!open)}
        label={title}
        header={(
          <>
            <OText preset='label'>{title}</OText>
            {!open && !!summary && <OText preset='body_sm' color='text_muted' numberOfLines={1}>{summary}</OText>}
          </>
        )}
        body={lines}
        testID='products-folded'
      />
    )
  }

  return (
    <OCard testID='products-card'>
      <View style={styles.productsHead}>
        <OText preset='label' testID='products-title'>{title}</OText>
        {!!checklist && (
          <OText preset='body_sm' color='text_muted' testID='products-done'>
            {t('DONE_OF', '_done_ of _total_ done').replace('_done_', String(doneCount)).replace('_total_', String(products.length))}
          </OText>
        )}
      </View>
      {lines}
    </OCard>
  )
}
