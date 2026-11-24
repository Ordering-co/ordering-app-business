import { makeFormats } from '../../../../../hooks/useFormats'
import { availabilityOf, backText, categoryIds, findCategory, flattenCategories, groupProducts, isUnavailable, reasonText, switchChanges } from '../productState'

const t = (_key: string, fallback: string) => fallback
const NY = 'America/New_York'
const NOW = new Date('2026-11-19T18:05:09Z') // 13:05 in New York

const tree = [
  { id: 10, name: 'Pizzas', subcategories: [{ id: 11, name: 'Classic', subcategories: [] }, { id: 12, name: 'Gourmet', subcategories: [] }] },
  { id: 20, name: 'Sides', subcategories: [] }
]

describe('availability', () => {
  it('an enabled product is available', () => {
    expect(availabilityOf({ enabled: true, snooze_until: null }, NOW)).toEqual({ kind: 'available' })
    expect(isUnavailable({ enabled: 1 }, NOW)).toBe(false)
  })

  it('enabled false is off, whatever else it says', () => {
    expect(availabilityOf({ enabled: false }, NOW)).toEqual({ kind: 'off' })
    expect(availabilityOf({ enabled: 0, snooze_until: '2026-11-20 10:00:00' }, NOW)).toEqual({ kind: 'off' })
    expect(isUnavailable({ enabled: '0' }, NOW)).toBe(true)
  })

  it('a pause still ahead is unavailable until its date; a pause that passed is available', () => {
    expect(availabilityOf({ enabled: true, snooze_until: '2026-11-19 19:00:00' }, NOW)).toEqual({ kind: 'snoozed', until: new Date('2026-11-19T19:00:00.000Z') })
    expect(availabilityOf({ enabled: true, snooze_until: '2026-11-19 18:00:00' }, NOW)).toEqual({ kind: 'available' })
  })

  it('a switch turns a product off without a date, or on clearing its pause', () => {
    expect(switchChanges(false)).toEqual({ enabled: false })
    expect(switchChanges(true)).toEqual({ enabled: true, snooze_until: '' })
  })
})

describe('when a product is back', () => {
  const clock = makeFormats({ timeFormat: 'h:mm A' }).time
  const at = (iso: string) => backText(new Date(iso), NY, NOW, t, clock)

  it('in minutes under two hours, then at a time today, tomorrow, or a weekday', () => {
    expect(at('2026-11-19T18:45:09Z')).toBe('back in 40 minutes')
    expect(at('2026-11-19T18:06:00Z')).toBe('back in 1 minutes')
    expect(at('2026-11-19T22:00:00Z')).toBe('back at 5:00 PM')
    expect(backText(new Date('2026-11-19T22:00:00Z'), NY, NOW, t, makeFormats({ timeFormat: 'HH:mm' }).time)).toBe('back at 17:00')
    expect(at('2026-11-20T16:00:00Z')).toBe('back tomorrow')
    expect(at('2026-11-23T16:00:00Z')).toMatch(/^back \w+$/)
  })

  it('names a product that is off until it is turned on', () => {
    expect(reasonText({ kind: 'off' }, NY, NOW, t, clock)).toBe('until you turn it on')
    expect(reasonText({ kind: 'snoozed', until: new Date('2026-11-20T16:00:00Z') }, NY, NOW, t, clock)).toBe('back tomorrow')
  })
})

describe('categories', () => {
  it('lists a category and everything under it', () => {
    expect(categoryIds(tree[0])).toEqual([10, 11, 12])
    expect(categoryIds(null)).toEqual([])
    expect(flattenCategories(tree).map((category) => category.id)).toEqual([10, 11, 12, 20])
    expect(findCategory(tree, 12)?.name).toBe('Gourmet')
    expect(findCategory(tree, 99)).toBeNull()
    expect(findCategory(tree, null)).toBeNull()
  })
})

describe('groupProducts', () => {
  const products = [
    { id: 1, category_id: 20, name: 'Fries' },
    { id: 2, category_id: 11, name: 'Margherita' },
    { id: 3, category_id: 10, name: 'Plain' },
    { id: 4, category_id: 11, name: 'Pepperoni' },
    { id: 5, category_id: 99, category: { name: 'Gone' }, name: 'Orphan' }
  ]

  it('the whole menu: a header per category in the tree\'s order, with its count, then the unknown ones', () => {
    const rows = groupProducts(products, tree as any, null)
    expect(rows.map((row) => (row.type === 'header' ? `${row.category?.name}:${row.count}` : row.product.name))).toEqual([
      'Pizzas:1', 'Plain', 'Classic:2', 'Margherita', 'Pepperoni', 'Sides:1', 'Fries', 'Gone:1', 'Orphan'
    ])
  })

  it('a parent: its own and its children\'s products, grouped', () => {
    const rows = groupProducts(products, tree as any, tree[0] as any)
    expect(rows.filter((row) => row.type === 'product').map((row) => row.product.name)).toEqual(['Plain', 'Margherita', 'Pepperoni'])
    expect(rows.some((row) => row.type === 'header' && row.category?.name === 'Sides')).toBe(false)
  })

  it('a single category is a flat list', () => {
    const rows = groupProducts(products, tree as any, tree[1] as any)
    expect(rows).toEqual([{ type: 'product', key: 'p-1', product: products[0] }])
  })
})
