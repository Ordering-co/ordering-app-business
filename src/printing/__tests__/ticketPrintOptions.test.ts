import AsyncStorage from '@react-native-async-storage/async-storage'

import {
  DEFAULT_TICKET_PRINT_OPTIONS,
  TICKET_PRINT_OPTIONS_STORAGE_KEY,
  getTicketPrintOptionGroups,
  loadTicketPrintOptions,
  normalizeTicketPrintOptions,
  saveTicketPrintOptions
} from '../ticketPrintOptions'

const t = (_key: string, fallback: string) => fallback

describe('ticketPrintOptions', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('prints everything by default', () => {
    expect(Object.values(DEFAULT_TICKET_PRINT_OPTIONS).every((value) => value === true)).toBe(true)
  })

  it('keeps only known boolean options and fills the rest with defaults', () => {
    const options = normalizeTicketPrintOptions({
      customerEmail: false,
      payments: 'no',
      unknownOption: false
    })

    expect(options.customerEmail).toBe(false)
    expect(options.payments).toBe(true)
    expect(options).not.toHaveProperty('unknownOption')
    expect(Object.keys(options).sort()).toEqual(Object.keys(DEFAULT_TICKET_PRINT_OPTIONS).sort())
  })

  it('returns the defaults when nothing was saved on this phone', async () => {
    expect(await loadTicketPrintOptions()).toEqual(DEFAULT_TICKET_PRINT_OPTIONS)
  })

  it('saves the options on this phone and loads them back', async () => {
    await saveTicketPrintOptions({ ...DEFAULT_TICKET_PRINT_OPTIONS, businessSection: false })

    expect(await loadTicketPrintOptions()).toEqual({ ...DEFAULT_TICKET_PRINT_OPTIONS, businessSection: false })
    expect(await AsyncStorage.getItem(TICKET_PRINT_OPTIONS_STORAGE_KEY)).not.toBeNull()
  })

  it('describes every option exactly once, grouped for the settings screen', () => {
    const groups = getTicketPrintOptionGroups(t)
    const listed = groups.flatMap((group) => [
      ...(group.sectionOption ? [group.sectionOption] : []),
      ...group.options.map((option) => option.key)
    ])

    expect(groups.map((group) => group.key)).toEqual(['header', 'customer', 'business', 'products', 'totals'])
    expect(listed.sort()).toEqual(Object.keys(DEFAULT_TICKET_PRINT_OPTIONS).sort())
    expect(groups.every((group) => group.title && group.options.every((option) => option.label))).toBe(true)
  })
})
