import React, { useCallback, useRef } from 'react'

import { useLanguage } from '@components'
import { SearchSelectRow } from '../OrdersOption/SearchSelectRow'
import { StoreSource, type StoreSourceState } from '../OrdersOption/StoreSource'
import { choiceOf, useStoreOptions, useStoreSheet } from '../OrdersOption/StoreFilter'

/**
 * The store filter of the orders search: a row that opens the stores in a sheet (paged through the whole list, searched by name
 * on the server). Hidden when the account has one store or none, whatever the theme says. It is where a store is chosen: the choice
 * is a draft of the form's like every other field, and takes effect with Apply (a store alone is the store view; with anything
 * else it is one of the search's filters).
 */
const BusinessRow = ({ source, search, onSearch }: { source: StoreSourceState } & Record<string, any>) => {
  const [, t] = useLanguage()
  const anyLabel = t('ALL_STORES', 'All stores')
  const options = useStoreOptions(source, anyLabel)
  const paging = useStoreSheet(source)
  // The account's number of stores (a search in the sheet makes the list's own total the matches').
  const known = useRef<number | null>(null)
  if (source.total !== null) known.current = source.total
  const value = String(search?.business ?? '')
  const onSelect = useCallback((next: any, _label: string, option?: any) => {
    const choice = choiceOf(next, option ?? { value: next, label: '' })
    onSearch({ ...search, business: choice?.id ?? '', businessName: choice?.name ?? '', businessLogo: choice?.logo })
  }, [onSearch, search])
  if ((known.current ?? 0) < 2 && !value) return null
  return (
    <SearchSelectRow
      title={t('STORE', 'Store')}
      anyLabel={anyLabel}
      sheetTitle={t('SELECT_BUSINESS', 'Select Business')}
      options={options as any}
      includesAny
      value={value}
      valueLabel={search?.businessName}
      searchable
      paging={paging}
      onSelect={onSelect}
      testID='orders-search-business'
    />
  )
}

export const OrdersOptionBusiness = (props: any) => {
  const { search, onSearch } = props
  const render = useCallback((source: StoreSourceState) => <BusinessRow source={source} search={search} onSearch={onSearch} />, [search, onSearch])
  return <StoreSource render={render} />
}
