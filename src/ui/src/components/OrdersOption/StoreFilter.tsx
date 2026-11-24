import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage, useSession } from '@components'
import { themePart, themeVisible } from '@/theme/helpers'
import { FilterChip, Icon, OAvatar, OSelect } from '../shared'
import type { SelectOption } from '../shared/OSelect'
import { noteStoreTotal } from '../PreviousOrders/storesSeen'
import { StoreSource, type StoreSourceState } from './StoreSource'
import { useDebouncedCallback } from '../StoresList/useDebouncedCallback'
import { useStoreFilter, type StoreChoice } from './ordersView'

/** How long the typing in the sheet waits before the stores are searched (ms). */
const SEARCH_DELAY = 400

/** Past this many stores the sheet has a search field (the board's rule, kept). */
export const STORE_SEARCH_FROM = 10

/**
 * The options of the stores' sheet: "All stores" first, then the stores as the source has loaded them, each with its logo. The
 * value is the store's id as text (an order's `business_id` is a number, a filter's value either).
 */
export const useStoreOptions = (source: StoreSourceState, anyLabel: string): SelectOption[] =>
  useMemo(() => [
    { value: '', label: anyLabel, leading: <OAvatar kind='business' tone='neutral' size='xs' name={anyLabel} /> },
    ...source.stores.map((store) => ({
      value: String(store.id),
      label: store.name,
      data: store,
      leading: <OAvatar kind='business' tone='neutral' size='xs' source={store.logo} name={store.name} />
    }))
  ], [source.stores, anyLabel])

/** The choice of an option of the sheet, as the filter keeps it (`null`: all stores). */
export const choiceOf = (value: any, option: SelectOption): StoreChoice | null =>
  value === '' || value === undefined || value === null
    ? null
    : { id: String(value), name: option.label ?? '', logo: option.data?.logo }

/**
 * The store sheet's paging and search: the next page when the end of the list is reached, and the typing sent to the server
 * once it stops (the stores are searched by name there, not only the ones loaded).
 */
export const useStoreSheet = (source: StoreSourceState) => {
  const debounced = useDebouncedCallback((text: string) => source.search(text), SEARCH_DELAY)
  return {
    onSearchChange: debounced.call as (text: string) => void,
    onEndReached: source.hasMore ? source.loadMore : undefined,
    loadingMore: source.loadingMore
  }
}

/** The account's number of stores, for the cards' store line (more than one: named from the first card), noted once the list says it. */
const NotesStoreTotal = ({ source }: { source: StoreSourceState }) => {
  const [session] = useSession() as any
  const user = session?.user?.id ?? null
  useEffect(() => {
    if (source.fetched && !source.error && source.total !== null) noteStoreTotal(user, source.total)
  }, [source.fetched, source.error, source.total, user])
  return null
}

/** The filter's chip and sheet, with the stores already read. */
const StoreChip = ({ source, testID, style }: { source: StoreSourceState, testID: string, style?: ViewStyle }) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const { store, setStore } = useStoreFilter()
  const anyLabel = t('ALL_STORES', 'All stores')
  const options = useStoreOptions(source, anyLabel)
  const sheet = useStoreSheet(source)
  // The account's number of stores: the last one the list gave (while a search is on the list's own total is the matches').
  const known = useRef<number | null>(null)
  if (source.total !== null) known.current = source.total
  const total = known.current
  const styles = useMemo(() => StyleSheet.create({ box: { alignSelf: 'flex-start', flexShrink: 1, maxWidth: '100%' } }), [])
  const chipColor = themePart(theme, 'chip', 'base.color')

  // The chip's own sheet applies at once: that is its job (the search sheet's Store row waits for Apply).
  const choose = useCallback((value: any, option: SelectOption) => setStore(choiceOf(value, option)), [setStore])

  const several = (total ?? 0) > 1
  if (!several && !store) return null
  const name = store?.name ?? anyLabel
  return (
    <View style={[styles.box, style]}>
      <OSelect
        title={t('SELECT_A_STORE', 'Select a store')}
        options={options}
        value={store?.id ?? ''}
        onSelect={choose}
        searchable={(total ?? 0) > STORE_SEARCH_FROM}
        searchPlaceholder={t('SEARCH_STORES', 'Search stores')}
        {...sheet}
        testID={`${testID}-select`}
        renderTrigger={({ open }) => (
          <FilterChip
            text={name}
            size='sm'
            leading={<OAvatar kind='business' tone='neutral' size='xs' source={store?.logo} name={name} />}
            trailing={<Icon name='chevron-down' size='sm' color={chipColor} />}
            selected={!!store}
            onPress={open}
            accessibilityLabel={`${t('STORE', 'Store')}: ${name}`}
            testID={testID}
          />
        )}
      />
    </View>
  )
}

/**
 * The orders headers' store source (the phone's under the title, the board's beside it). It always learns the account's number of
 * stores when the cards' store line (`orders.store`) or the chip is wanted, and draws nothing for that. The chip itself (which
 * store's orders the lists and History show, applied at once) is drawn only with more than one store and the theme's
 * `orders.store_filter` on: with it off the header has nothing of it, no room either, and the store is chosen in the search sheet.
 */
export const StoreFilter = ({ testID = 'orders-store-filter', style }: { testID?: string, style?: ViewStyle }) => {
  const theme: any = useTheme()
  const chipOn = themeVisible(theme, 'orders.store_filter')
  const wanted = chipOn || themeVisible(theme, 'orders.store')
  const render = useCallback((source: StoreSourceState) => (
    <>
      <NotesStoreTotal source={source} />
      {chipOn && <StoreChip source={source} testID={testID} style={style} />}
    </>
  ), [chipOn, testID, style])
  if (!wanted) return null
  return <StoreSource render={render} />
}
