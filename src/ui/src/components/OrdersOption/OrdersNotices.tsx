import React, { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { themeSpace } from '@/theme/helpers'
import { ONotice } from '../shared'
import { useOfflineActions } from '../../context/OfflineActions'
import type { OrdersSplit } from './useOrdersSplit'
import type { OrdersSearchState } from './useOrdersSearch'

/**
 * The two notices over the lists (OrdersOffline mockup): "You're offline" (what time the lists are from and how many
 * changes wait to sync) while the device has no network, and "Filters on: ..." with a Clear button while a search is
 * on. A store alone (the store view, with no chip to say it) has its own text, "Showing _store_ only": the store view hears the
 * socket's events of its store, so it does not say that new orders may be missed. Neither is a theme section: they are the screen's state.
 */
export const OrdersNotices = ({ split, searchState }: { split: Pick<OrdersSplit, 'isNetConnected' | 'lastUpdate'>, searchState: Pick<OrdersSearchState, 'hasFilters' | 'storeOnly' | 'storeName' | 'summary' | 'clear'> }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const [{ actions }] = useOfflineActions() as any
  const styles = useMemo(() => StyleSheet.create({ notices: { gap: themeSpace(theme, 'sm') } }), [theme])

  const offline = split.isNetConnected === false
  const pending = Object.keys(actions ?? {}).length
  if (!offline && !searchState.hasFilters) return null

  const offlineText = [
    split.lastUpdate ? t('OFFLINE_SHOWING_FROM', 'Showing orders from _time_.').replace('_time_', split.lastUpdate) : '',
    pending > 0
      ? (pending === 1 ? t('OFFLINE_CHANGES_PENDING_ONE', '_count_ change will sync when you\'re back online.') : t('OFFLINE_CHANGES_PENDING', '_count_ changes will sync when you\'re back online.')).replace('_count_', String(pending))
      : ''
  ].filter(Boolean).join(' ')

  return (
    <View style={styles.notices}>
      {offline && (
        <ONotice variant='danger' title={t('OFFLINE_NOTICE_TITLE', 'You\'re offline')} testID='orders-offline'>
          {offlineText || t('OFFLINE_NOTICE_NO_COPY', 'Orders will update when you\'re back online.')}
        </ONotice>
      )}
      {searchState.hasFilters && (
        <ONotice
          // A store alone misses nothing (the info look); a search may.
          variant={searchState.storeOnly ? 'info' : 'warning'}
          testID='orders-filter-notice'
          action={{ text: t('CLEAR', 'Clear'), onPress: searchState.clear, testID: 'orders-filter-clear' }}
        >
          {searchState.storeOnly
            ? t('STORE_FILTER_NOTICE', 'Showing _store_ only.').replace('_store_', searchState.storeName)
            : searchState.summary.length
            ? t('FILTERS_ON_NOTICE', 'Filters on: _filters_. You may miss new orders.').replace('_filters_', searchState.summary.join(' · '))
            : t('WARNING_FILTER_APPLIED', 'Filters applied. You may miss new orders.')}
        </ONotice>
      )}
    </View>
  )
}
