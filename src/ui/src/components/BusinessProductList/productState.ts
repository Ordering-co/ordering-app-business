import { dayDifference, parseApiDateTime, resolveTimeZone } from '../StoresList/zonedTime'

/**
 * A product is available, turned off (`enabled` false: until it is turned on), or paused (`snooze_until` still ahead:
 * back by itself at that time). Unavailable = off or paused, as the API's own filter says
 * (`enabled = false` OR `snooze_until > now`); the list's switch shows `enabled && !paused`.
 */
export type Availability =
  | { kind: 'available' }
  | { kind: 'off' }
  | { kind: 'snoozed', until: Date }

export interface ProductLike {
  enabled?: boolean | number | string | null
  snooze_until?: string | null
}

const isFalse = (value: unknown) => value === false || value === 0 || value === '0'

export const availabilityOf = (product: ProductLike | null | undefined, now: Date = new Date()): Availability => {
  if (!product) return { kind: 'available' }
  if (isFalse(product.enabled)) return { kind: 'off' }
  const until = parseApiDateTime(product.snooze_until)
  if (until && until.getTime() > now.getTime()) return { kind: 'snoozed', until }
  return { kind: 'available' }
}

export const isUnavailable = (product: ProductLike | null | undefined, now: Date = new Date()): boolean =>
  availabilityOf(product, now).kind !== 'available'

/** What a switch turns the product into: off with no date; or on, clearing any pause. */
export const switchChanges = (turnOn: boolean): Record<string, any> =>
  turnOn ? { enabled: true, snooze_until: '' } : { enabled: false }

export interface CategoryNode {
  id: number
  name: string
  enabled?: boolean
  parent_category_id?: number | null
  subcategories?: CategoryNode[]
}

/** A category and every category under it, ids only. */
export const categoryIds = (category: CategoryNode | null | undefined): number[] => {
  if (!category) return []
  return [category.id, ...(category.subcategories ?? []).flatMap(categoryIds)]
}

/** Every category of a tree in reading order (a parent before its children). */
export const flattenCategories = (categories: CategoryNode[] | null | undefined): CategoryNode[] =>
  (categories ?? []).flatMap((category) => [category, ...flattenCategories(category.subcategories)])

export const findCategory = (categories: CategoryNode[] | null | undefined, id: number | null | undefined): CategoryNode | null => {
  if (id === null || id === undefined) return null
  return flattenCategories(categories).find((category) => category.id === id) ?? null
}

export interface MenuRowItem {
  type: 'header' | 'product'
  key: string
  category?: CategoryNode | { id: number | null, name: string }
  count?: number
  product?: any
}

/**
 * The menu's rows from the products loaded across categories: for a selection of several categories (the whole
 * menu, or a parent with children) each category's name comes first with its count, in the tree's order; a single
 * category is a flat list. Products of a category the tree does not know close the list.
 */
export const groupProducts = (products: any[], categories: CategoryNode[], selected: CategoryNode | null): MenuRowItem[] => {
  const scope = selected ? categoryIds(selected) : null
  const inScope = scope ? products.filter((product) => scope.includes(product.category_id)) : products
  if (selected && scope && scope.length === 1) {
    return inScope.map((product) => ({ type: 'product' as const, key: `p-${product.id}`, product }))
  }
  const rows: MenuRowItem[] = []
  const known = new Set<number>()
  const order = selected ? flattenCategories([selected]) : flattenCategories(categories)
  order.forEach((category) => {
    known.add(category.id)
    const own = inScope.filter((product) => product.category_id === category.id)
    if (!own.length) return
    rows.push({ type: 'header', key: `h-${category.id}`, category, count: own.length })
    own.forEach((product) => rows.push({ type: 'product', key: `p-${product.id}`, product }))
  })
  const rest = inScope.filter((product) => !known.has(product.category_id))
  if (rest.length) {
    rows.push({ type: 'header', key: 'h-other', category: { id: null, name: rest[0]?.category?.name ?? '' }, count: rest.length })
    rest.forEach((product) => rows.push({ type: 'product', key: `p-${product.id}`, product }))
  }
  return rows
}

type Translate = (key: string, fallback: string) => string

/** The app's time of day in a store's zone (`useFormats().time` with `{ zone }`). */
export type ClockOf = (date: Date, options?: { zone?: string | null }) => string

/**
 * When a paused product is back, in words: "back in 40 minutes" (under two hours), "back at 3:30 PM" (today),
 * "back tomorrow", "back Mon" (further on). The clock is the store's.
 */
export const backText = (until: Date, timeZone: string | null | undefined, now: Date, t: Translate, clock: ClockOf): string => {
  const minutes = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 60000))
  if (minutes < 120) return t('PRODUCT_BACK_IN', 'back in _time_').replace('_time_', t('RELATIVE_TIME_MINUTES', '%d minutes').replace('%d', String(minutes)))
  const days = dayDifference(until, now, timeZone)
  if (days <= 0) return t('PRODUCT_BACK_AT', 'back at _time_').replace('_time_', clock(until, { zone: timeZone }))
  if (days === 1) return t('PRODUCT_BACK_TOMORROW', 'back tomorrow')
  let day = ''
  try {
    day = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: resolveTimeZone(timeZone) }).format(until)
  } catch (_) {
    day = ''
  }
  return t('PRODUCT_BACK_DAY', 'back _day_').replace('_day_', day)
}

/** The short reason of an unavailable product: when it is back, or that it stays off until it is turned on. */
export const reasonText = (availability: Availability, timeZone: string | null | undefined, now: Date, t: Translate, clock: ClockOf): string =>
  availability.kind === 'snoozed'
    ? backText(availability.until, timeZone, now, t, clock)
    : t('PRODUCT_OFF_UNTIL_TURNED_ON', 'until you turn it on')
