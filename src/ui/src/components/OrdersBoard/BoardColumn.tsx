import React from 'react'
import { View } from 'react-native'

import { OText, SectionTitle } from '../shared'
import { OrderRowsList, type OrderListItem } from '../PreviousOrders'

interface Props {
  title: string
  /** The end of the column was reached. */
  onEndReached?: () => void
  /** The column has no order to show (and is not loading). */
  empty?: boolean
  emptyText?: string
  testID: string
  styles: any
  /** The column's cards, in order. */
  items: OrderListItem[]
  /** What the cards call and the selected card: `rowsProps` of the board. */
  rowsProps: Record<string, any>
  onOpenOrder: (order: any) => void
}

/**
 * One column of the board: its title (no number of orders) over a virtualized list that scrolls
 * on its own. The column holds the cards of its stage; an empty one says so.
 */
export const BoardColumn = ({ title, onEndReached, empty, emptyText, testID, styles, items, rowsProps, onOpenOrder }: Props) => {
  return (
    <View style={styles.column} testID={testID} accessibilityLabel={title}>
      <View style={styles.columnHead}>
        <SectionTitle style={styles.columnTitle}>{title}</SectionTitle>
      </View>
      {empty
        ? <View style={styles.columnEmpty} testID={`${testID}-empty`}><OText preset='body_sm' color='text_muted' align='center'>{emptyText}</OText></View>
        : (
          <OrderRowsList
            items={items}
            {...rowsProps}
            handleClickEvent={onOpenOrder}
            style={styles.columnScroll}
            contentContainerStyle={styles.columnContent}
            nestedScrollEnabled
            onEndReached={onEndReached}
            onEndReachedThreshold={0.5}
            testID={`${testID}-list`}
          />
          )}
    </View>
  )
}
