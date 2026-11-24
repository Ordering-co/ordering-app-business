import React from 'react'
import { Platform } from 'react-native'

import { BusinessList as BusinessListController } from '@components'

/** The stores as a screen of the orders reads them: a page at a time, searched by name, and the account's own number of them. */
export interface StoreSourceState {
  stores: Array<{ id: number | string, name: string, logo?: string }>
  /** The first page is not in yet. */
  loading: boolean
  /** A page after the first is on its way. */
  loadingMore: boolean
  fetched: boolean
  error: boolean
  /** The account's number of stores; `null` while it is not known. With a search on it is the matches' number, so it is `null` then. */
  total: number | null
  hasMore: boolean
  /** The search text now (the stores listed are the ones matching). */
  searching: boolean
  loadMore: () => void
  search: (text: string) => void
}

const PAGINATION = { controlType: 'infinity', initialPage: 1, pageSize: 20 }
const PROPS = ['id', 'name', 'logo']

const Render = ({ render, businessesList, paginationProps, getBusinesses, handleChangeSearch, searchValue }: any) => {
  const stores = businessesList?.businesses ?? []
  const searching = !!searchValue
  const loading = !!businessesList?.loading
  const totalPages = paginationProps?.totalPages
  return render({
    stores,
    loading: loading && stores.length === 0,
    loadingMore: loading && stores.length > 0,
    fetched: !!businessesList?.fetched,
    error: !!businessesList?.error,
    total: !searching && typeof paginationProps?.totalItems === 'number' ? paginationProps.totalItems : null,
    hasMore: !!totalPages && (paginationProps?.currentPage ?? 0) < totalPages,
    searching,
    loadMore: () => { if (!loading && totalPages && (paginationProps?.currentPage ?? 0) < totalPages) getBusinesses?.() },
    search: (text: string) => handleChangeSearch?.(text)
  } as StoreSourceState)
}

/**
 * The stores of the account (the business list controller, as the dashboard asks for it: `asDashboard`, twenty a page, by name),
 * handed to `render`. The store filter of the headers and the search form's Store row both read the stores from here, so a long
 * list is paged and searched the same way in both.
 */
export const StoreSource = ({ render }: { render: (source: StoreSourceState) => React.ReactNode }) => (
  <BusinessListController
    asDashboard
    isSearchByName
    isForceSearch={Platform.OS === 'ios'}
    propsToFetch={PROPS}
    paginationSettings={PAGINATION}
    render={render}
    UIComponent={Render}
  />
)
