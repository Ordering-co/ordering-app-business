import React, { useMemo } from 'react'
import { View } from 'react-native'

import { useLanguage } from '@components'
import { FilterChip, OButton, OModal, ScreenContainer } from '../shared'
import { OrderRowsList, OrdersSkeleton, sectionItems } from '../PreviousOrders'
import { NotFoundSource } from '../NotFoundSource'
import { useOrdersEmpty } from '../OrdersOption/emptyContent'
import type { HistoryFilter, OrdersSplit } from '../OrdersOption/useOrdersSplit'

interface Props {
  open: boolean
  onClose: () => void
  split: OrdersSplit
  rowsProps: Record<string, any>
  /** An order was tapped: the board opens it in its panel. */
  onOpenOrder: (order: any) => void
  styles: any
}

/**
 * History on the tablet (OQ-07): the board's History button opens it as a screen over the board: the closed orders by
 * day, with the chips All / Completed / Cancelled and "Load more", in the content column of a stack screen. It reads the
 * board's own list (`useOrdersSplit`, the tab `history`), so it is not a second controller; a tap on an order closes
 * it and shows the order in the board's panel.
 */
export const BoardHistory = ({ open, onClose, split, rowsProps, onOpenOrder, styles }: Props) => {
  const [, t] = useLanguage()
  const emptyOf = useOrdersEmpty()
  const chips: Array<[HistoryFilter, string]> = [
    ['all', t('ALL', 'All')],
    ['completed', t('COMPLETED', 'Completed')],
    ['cancelled', t('CANCELLED', 'Cancelled')]
  ]
  // With a filter on, History holds the closed orders that match (by day, narrowed by the chips as without one).
  const days = split.searching ? split.resultLists.history : split.history
  const items = useMemo(() => (split.loading ? [] : sectionItems(days.map((day) => ({
    key: day.day, title: day.label, titleTestID: `board-history-day-${day.day}`, section: 'history' as const, compact: true, rows: day.orders
  })))), [split.loading, days])
  return (
    <OModal entireModal hideIcons open={open} onClose={onClose} title={t('HISTORY', 'History')}>
      <ScreenContainer testID='board-history'>
        <OrderRowsList
          items={items}
          {...rowsProps}
          handleClickEvent={onOpenOrder}
          contentContainerStyle={styles.results}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <View style={styles.chips} testID='board-history-chips'>
                {chips.map(([key, text]) => (
                  <FilterChip key={key} size='sm' text={text} selected={split.historyFilter === key} onPress={() => split.setHistoryFilter(key)} testID={`board-history-${key}`} />
                ))}
              </View>
            </View>
          )}
          ListEmptyComponent={split.loading ? <OrdersSkeleton actions={false} /> : <NotFoundSource fill {...emptyOf(split.error ? 'error' : split.searching ? 'results' : split.historyFilter === 'all' ? 'history' : split.historyFilter, split.error)} />}
          ListFooterComponent={split.canLoadMore
            ? (
              <View style={styles.footer}>
                <OButton appearance='outline' color='neutral' text={t('LOAD_MORE', 'Load more')} onClick={split.loadMore} testID='board-history-more' />
              </View>
              )
            : undefined}
        />
      </ScreenContainer>
    </OModal>
  )
}
