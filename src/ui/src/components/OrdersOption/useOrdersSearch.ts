import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '@components'
import { useFormats } from '@/hooks/useFormats'
import dayjs, { parseSearchDay, SEARCH_DAY_FORMAT } from '@/utils/dayjs'
import { classifySearch, searchTerm } from './searchText'
import { emptyKeptSearch, KeptSearchContext } from './keptSearch'
import { CANCELLED_STATUSES, COMPLETED_STATUSES, NEW_STATUSES, ACTIVE_STATUSES } from './orderStatusGroups'
import { searchPart, storeKey, useStoreFilter } from './ordersView'

/** What the search form holds. The text is the one field; the rest are the filters under it. */
export interface SearchValues {
  text: string
  date: { type: '' | 'today' | 'yesterday' | 'last_7days' | 'custom', from: string, to: string }
  /** `delivery_type` numbers. */
  types: number[]
  /** `pending`, `progress`, `completed`, `cancelled`. */
  states: string[]
  business: string | number
  businessName: string
  /** The store's logo, kept with its choice so the store view can draw it. */
  businessLogo?: string
  driver: string | number
  driverName: string
  paymethod: string | number
  paymethodName: string
  city: string | number
  cityName: string
  timeStatus: '' | 'in_time' | 'at_risk' | 'delayed'
}

export const EMPTY_SEARCH: SearchValues = {
  text: '',
  date: { type: '', from: '', to: '' },
  types: [],
  states: [],
  business: '',
  businessName: '',
  driver: '',
  driverName: '',
  paymethod: '',
  paymethodName: '',
  city: '',
  cityName: '',
  timeStatus: ''
}

/** The statuses each state chip of the search stands for. */
export const STATE_STATUSES: Record<string, number[]> = {
  pending: NEW_STATUSES,
  progress: ACTIVE_STATUSES.filter((status) => !NEW_STATUSES.includes(status)),
  completed: COMPLETED_STATUSES,
  cancelled: CANCELLED_STATUSES
}

/** The days a preset covers, as the search writes them (`MM/DD/YYYY`). Yesterday is yesterday only. */
export const presetRange = (type: SearchValues['date']['type'], now = dayjs()): { from: string, to: string } | null => {
  const day = (value: ReturnType<typeof dayjs>) => value.format(SEARCH_DAY_FORMAT)
  switch (type) {
    case 'today': return { from: day(now), to: day(now) }
    case 'yesterday': return { from: day(now.subtract(1, 'day')), to: day(now.subtract(1, 'day')) }
    case 'last_7days': return { from: day(now.subtract(6, 'day')), to: day(now) }
    default: return null
  }
}

/** The controller's `date` filter for the form's: the first day from 00:00:00 to the last day at 23:59:59. */
export const dateFilter = (date: SearchValues['date']): { from: string, to: string } => {
  const range = date.type === 'custom' ? { from: date.from, to: date.to || date.from } : presetRange(date.type)
  return range && range.from ? { from: `${range.from} 00:00:00`, to: `${range.to || range.from} 23:59:59` } : { from: '', to: '' }
}

/**
 * The filters of the controller (`onFiltered`) for the form: the text is classified (number, phone, e-mail, name or
 * external id), the empty ones are left out and a list of nothing is `''` (the controller reads a list as a filter).
 * Null when the form asks for nothing.
 */
export const buildFilters = (search: SearchValues, supportsName: boolean): Record<string, any> | null => {
  const field = classifySearch(search.text, supportsName)
  const customer: Record<string, string> = {}
  if (field?.kind === 'email') customer.email = searchTerm(field.value)
  if (field?.kind === 'phone') customer.phone = searchTerm(field.value)
  if (field?.kind === 'name') {
    if (field.name) customer.name = searchTerm(field.name)
    if (field.lastname) customer.lastname = searchTerm(field.lastname)
  }
  const statuses = Array.from(new Set(search.states.flatMap((state) => STATE_STATUSES[state] ?? [])))
  const date = dateFilter(search.date)
  const filters: Record<string, any> = {
    id: field?.kind === 'id' ? searchTerm(field.value) : '',
    external_id: field?.kind === 'external_id' ? searchTerm(field.value) : '',
    ...(Object.keys(customer).length && { customer }),
    state: statuses.length ? statuses : '',
    date,
    delivery_type: search.types.length ? search.types : '',
    business: search.business,
    driver: search.driver,
    paymethod: search.paymethod,
    city: search.city,
    timeStatus: search.timeStatus
  }
  const empty = !filters.id && !filters.external_id && !filters.customer && !filters.state && !date.from && !filters.delivery_type &&
    !filters.business && !filters.driver && !filters.paymethod && !filters.city && !filters.timeStatus
  return empty ? null : filters
}

export interface OrdersSearchState {
  search: SearchValues
  setSearch: (search: SearchValues) => void
  open: boolean
  setOpen: (open: boolean) => void
  /** Sends the form's filters (or clears them when it asks for nothing) and closes the form. */
  apply: () => void
  /** Resets the form and the controller's filter. */
  clear: () => void
  /**
   * A filter is on: the controller's own `filtered`, never the form's edits. Without the header's store chip a store on counts
   * too (the search button and the notice are what say it).
   */
  hasFilters: boolean
  /** The store view is the only filter and no chip names it: the notice says "Showing _store_ only". */
  storeOnly: boolean
  /** The name of the store on, when a store is on. */
  storeName: string
  /** What is filtered, written ("Delivery", "Today", "Ana"): the notice's text. */
  summary: string[]
  supportsName: boolean
}

/**
 * The orders search: the form's values, what was applied and the open state. `props` are the controller's UI props
 * (`filtered`, `onFiltered`, `supportsCustomerNameFilter`). The form keeps its values when it is closed without
 * applying (the filter and the form stay as they were); `clear` resets both.
 */
export const useOrdersSearch = (props: { filtered?: any, onFiltered?: (filters: any) => void, supportsCustomerNameFilter?: boolean }): OrdersSearchState => {
  const { filtered, onFiltered } = props
  const supportsName = props.supportsCustomerNameFilter === true
  const [, t] = useLanguage()
  const { date: dateOf } = useFormats()
  // The search a rotation kept (see `keptSearch.ts`): the form and what was applied start where the other layout left them.
  const box = useContext(KeptSearchContext)
  // The form's Store is the store that is on: a form that starts or resets holds it (the choice inside the sheet is a draft until Apply).
  const { chip, store, setStore } = useStoreFilter()
  const storeId = store?.id ?? ''
  const blank = useMemo<SearchValues>(
    () => (storeId ? { ...EMPTY_SEARCH, business: storeId, businessName: store?.name ?? '', businessLogo: store?.logo } : EMPTY_SEARCH),
    [storeId, store?.name, store?.logo]
  )
  const [search, setSearch] = useState<SearchValues>(() => box?.current?.search ?? blank)
  const [applied, setApplied] = useState<SearchValues | null>(() => box?.current?.applied ?? null)
  const [open, setOpen] = useState(false)
  // With the chip drawn the chip says the store is on; without it the search button and the notice do.
  const storeOnly = !chip && !!store && !filtered
  const hasFilters = !!filtered || (!chip && !!store)
  // A kept filter is still on its way into the controller on the first pass: that is not a reset.
  const restoring = useRef(!!box?.current?.filters && !filtered)

  // The controller dropped its filter (a reset elsewhere): the form follows.
  useEffect(() => {
    if (restoring.current) { restoring.current = false; return }
    if (!filtered) { setApplied(null); setSearch(blank) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // The store on changed (Apply, the header's chip, a clear): the form's Store follows.
  useEffect(() => {
    setSearch((previous) => (storeKey(previous.business) === storeId ? previous : { ...previous, business: storeId, businessName: store?.name ?? '', businessLogo: store?.logo }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // What the other layout will start from.
  useEffect(() => {
    if (!box) return
    if (applied) box.current = { ...(box.current ?? emptyKeptSearch()), search, applied }
    else if (box.current) box.current = { ...box.current, search: null, applied: null }
  }, [box, search, applied])

  const apply = useCallback(() => {
    // A form that asks only for the store is not a search: the store view holds it. With anything else the store is one of the
    // search's filters (and the store view as well, so the lists and the end of the search agree).
    const found = buildFilters(search, supportsName)
    const filters = found && !searchPart(found) ? null : found
    const chosen = storeKey(search.business)
    setStore(chosen ? { id: chosen, name: search.businessName, logo: search.businessLogo } : null)
    onFiltered?.(filters)
    setApplied(filters ? search : null)
    setOpen(false)
  }, [search, supportsName, onFiltered, setStore])

  const clear = useCallback(() => {
    // The chip, when drawn, keeps the store (its own sheet clears it); without it the store is part of what Clear removes.
    if (!chip) setStore(null)
    setSearch(chip ? blank : EMPTY_SEARCH)
    setApplied(null)
    onFiltered?.(null)
    setOpen(false)
  }, [onFiltered, blank, chip, setStore])

  const summary = useMemo(() => {
    if (!applied) return []
    const items: string[] = []
    const typeNames: Record<number, string> = {
      1: t('DELIVERY', 'Delivery'),
      2: t('PICKUP', 'Pickup'),
      3: t('EAT_IN', 'Eat in'),
      4: t('CURBSIDE', 'Curbside'),
      5: t('DRIVE_THRU', 'Drive thru')
    }
    applied.types.forEach((type) => typeNames[type] && items.push(typeNames[type]))
    const dateNames: Record<string, string> = { today: t('TODAY', 'Today'), yesterday: t('YESTERDAY', 'Yesterday'), last_7days: t('LAST_7_DAYS', 'Last 7 days') }
    if (applied.date.type === 'custom') {
      const show = (value: string) => value ? dateOf(parseSearchDay(value)) : ''
      items.push([show(applied.date.from), show(applied.date.to)].filter(Boolean).join(' – '))
    } else if (applied.date.type) items.push(dateNames[applied.date.type])
    const stateNames: Record<string, string> = {
      pending: t('PENDING', 'Pending'), progress: t('ORDERS_TAB_IN_PROGRESS', 'In progress'), completed: t('COMPLETED', 'Completed'), cancelled: t('CANCELLED', 'Cancelled')
    }
    applied.states.forEach((state) => items.push(stateNames[state]))
    // The store on is named here unless its own chip names it.
    ;[chip ? '' : (store?.name ?? ''), applied.driverName, applied.paymethodName, applied.cityName, applied.text.trim()].filter(Boolean).forEach((text) => items.push(text))
    return items.filter(Boolean)
  }, [applied, t, dateOf, chip, store?.name])

  return { search, setSearch, open, setOpen, apply, clear, hasFilters, storeOnly, storeName: store?.name ?? '', summary, supportsName }
}
