import { classifySearch, searchTerm } from '../searchText'
import { buildFilters, dateFilter, EMPTY_SEARCH, presetRange } from '../useOrdersSearch'
import dayjs from '@/utils/dayjs'

describe('classifySearch', () => {
  it('reads digits up to eight as an order number and longer digit runs as a phone', () => {
    expect(classifySearch('1053', true)).toEqual({ kind: 'id', value: '1053' })
    expect(classifySearch('12345678', false)).toEqual({ kind: 'id', value: '12345678' })
    expect(classifySearch('5551234567', false)).toEqual({ kind: 'phone', value: '5551234567' })
    expect(classifySearch('15551234567', false)).toEqual({ kind: 'phone', value: '5551234567' })
  })

  it('reads a plus or a number written with spaces and dashes as a phone', () => {
    expect(classifySearch('+1 (555) 123-4567', true)).toEqual({ kind: 'phone', value: '5551234567' })
    expect(classifySearch('555-123-4567', true)).toEqual({ kind: 'phone', value: '5551234567' })
  })

  it('reads an @ as an e-mail', () => {
    expect(classifySearch('ana@example.com', true)).toEqual({ kind: 'email', value: 'ana@example.com' })
  })

  it('reads letters as a customer\'s name only when the logic can search names', () => {
    expect(classifySearch('Ana', true)).toEqual({ kind: 'name', value: 'Ana', name: 'Ana' })
    expect(classifySearch('Ana Maria Lopez', true)).toEqual({ kind: 'name', value: 'Ana Maria Lopez', name: 'Ana Maria', lastname: 'Lopez' })
    expect(classifySearch('Ana', false)).toEqual({ kind: 'external_id', value: 'Ana' })
  })

  it('reads letters mixed with digits as an external id', () => {
    expect(classifySearch('EXT-101', true)).toEqual({ kind: 'external_id', value: 'EXT-101' })
  })

  it('reads an empty text as nothing', () => {
    expect(classifySearch('   ', true)).toBeNull()
  })

  it('searchTerm trims and keeps a query string whole', () => {
    expect(searchTerm('  a&b#c+d ')).toBe('a_b_c_d')
    expect(searchTerm(undefined)).toBe('')
  })
})

describe('the search filters', () => {
  const now = dayjs('2026-11-19T10:00:00')

  it('presets cover the days they name; yesterday is yesterday only', () => {
    expect(presetRange('today', now)).toEqual({ from: '11/19/2026', to: '11/19/2026' })
    expect(presetRange('yesterday', now)).toEqual({ from: '11/18/2026', to: '11/18/2026' })
    expect(presetRange('last_7days', now)).toEqual({ from: '11/13/2026', to: '11/19/2026' })
    expect(presetRange('', now)).toBeNull()
  })

  it('a custom range runs from the first day at 00:00:00 to the last at 23:59:59', () => {
    expect(dateFilter({ type: 'custom', from: '11/01/2026', to: '11/05/2026' })).toEqual({ from: '11/01/2026 00:00:00', to: '11/05/2026 23:59:59' })
    expect(dateFilter({ type: 'custom', from: '11/01/2026', to: '' })).toEqual({ from: '11/01/2026 00:00:00', to: '11/01/2026 23:59:59' })
    expect(dateFilter({ type: '', from: '', to: '' })).toEqual({ from: '', to: '' })
  })

  it('an empty form asks for nothing', () => {
    expect(buildFilters(EMPTY_SEARCH, true)).toBeNull()
  })

  it('sends the text as the filter it means and the lists as lists', () => {
    const filters = buildFilters({ ...EMPTY_SEARCH, text: 'Ana Lopez', types: [1, 2], states: ['pending', 'completed'], city: 7 }, true)!
    expect(filters.customer).toEqual({ name: 'Ana', lastname: 'Lopez' })
    expect(filters.delivery_type).toEqual([1, 2])
    expect(filters.state).toEqual([0, 13, 1, 11, 15])
    expect(filters.city).toBe(7)
    expect(filters.id).toBe('')
  })

  it('sends the order number, the phone and the external id each as its own filter', () => {
    expect(buildFilters({ ...EMPTY_SEARCH, text: '1053' }, true)!.id).toBe('1053')
    expect(buildFilters({ ...EMPTY_SEARCH, text: '+15551234567' }, true)!.customer).toEqual({ phone: '5551234567' })
    expect(buildFilters({ ...EMPTY_SEARCH, text: 'EXT-1' }, false)!.external_id).toBe('EXT-1')
    // A name cannot be searched without the capability: it is an external id.
    expect(buildFilters({ ...EMPTY_SEARCH, text: 'Ana' }, false)!.customer).toBeUndefined()
  })

  it('an empty list is the empty text, never a list the controller would read as a filter', () => {
    const filters = buildFilters({ ...EMPTY_SEARCH, text: '1' }, true)!
    expect(filters.delivery_type).toBe('')
    expect(filters.state).toBe('')
  })
})
