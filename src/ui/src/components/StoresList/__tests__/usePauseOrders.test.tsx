import React from 'react'
import { Pressable, Text } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import { useNetInfo } from '@react-native-community/netinfo'

const mockGet = jest.fn()
const mockSave = jest.fn()

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY' }, {}]),
  useApi: jest.fn(() => [{
    businesses: (id?: number) => (id
      ? { save: (changes: any) => mockSave(id, changes) }
      : { select: (fields: string[]) => ({ parameters: (params: any) => ({ asDashboard: () => ({ get: () => mockGet(fields, params) }) }) }) })
  }, {}])
}))

import { useToast } from '@components'
import { usePauseOrders } from '../usePauseOrders'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 0, minute: 0 }, close: { hour: 23, minute: 59 } }] }))
const NOW = new Date('2026-11-19T18:05:09Z')

const stores = [
  { id: 1, name: 'Luna Pizza', slug: 'luna', enabled: true, open: true, schedule, timezone: NY, snooze_until: null },
  { id: 2, name: 'Green Bowl', slug: 'green', enabled: true, open: true, schedule, timezone: NY, snooze_until: '2026-11-19 20:00:00' },
  { id: 3, name: 'Old Mill', slug: 'mill', enabled: false, open: true, schedule, timezone: NY, snooze_until: null }
]

let latest: any
const Harness = () => {
  latest = usePauseOrders()
  return (
    <>
      <Text testID='counts'>{`${latest.openCount}/${latest.pausedCount}/${latest.offCount}/${String(latest.allPaused)}`}</Text>
      <Pressable testID='open-all' onPress={() => latest.openPauseSheet()} />
      <Pressable testID='open-2' onPress={() => latest.openPauseSheet(2)} />
      <Pressable testID='resume-2' onPress={() => latest.resume(2)} />
      {latest.sheet}
    </>
  )
}

const showToast = () => (useToast as jest.Mock)()[1].showToast as jest.Mock

describe('usePauseOrders', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] })
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: true })
    mockGet.mockResolvedValue({ content: { error: false, result: stores } })
    mockSave.mockResolvedValue({ content: { error: false, result: {} } })
  })
  afterEach(() => { jest.useRealTimers(); mockGet.mockReset(); mockSave.mockReset() })

  it('asks for the stores with the fields their state needs and counts the states', async () => {
    const { getByTestId } = renderWithProviders(<Harness />)
    await waitFor(() => expect(getByTestId('counts').props.children).toBe('1/1/1/false'))
    expect(mockGet).toHaveBeenCalledWith(expect.arrayContaining(['id', 'name', 'enabled', 'open', 'schedule', 'timezone', 'snooze_until']), expect.objectContaining({ page_size: 50 }))
    expect(latest.stores.map((store: any) => store.status.kind)).toEqual(['open', 'paused', 'off'])
  })

  it('opens the sheet for a store that is accepting orders and saves the pause', async () => {
    const { getByTestId, getByText } = renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.loading).toBe(false))
    fireEvent.press(getByTestId('open-all'))
    // Only the open store is offered, so the sheet is for it alone.
    expect(getByText('Pause orders · Luna Pizza')).toBeTruthy()
    fireEvent.press(getByTestId('pause-option-hour_1'))
    await act(async () => { fireEvent.press(getByTestId('pause-confirm')) })
    expect(mockSave).toHaveBeenCalledWith(1, { snooze_until: '2026-11-19 19:05:09' })
    expect(showToast()).toHaveBeenCalledWith('success', 'Orders paused until 2:05 PM')
    await waitFor(() => expect(getByTestId('counts').props.children).toBe('0/2/1/true'))
  })

  it('does not open for a store that is already paused or off', async () => {
    const { getByTestId, queryByText } = renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.loading).toBe(false))
    fireEvent.press(getByTestId('open-2'))
    expect(queryByText(/Pause orders/)).toBeNull()
    expect(latest.sheet).toBeNull()
  })

  it('resumes a store with an empty snooze_until and enabled true', async () => {
    const { getByTestId } = renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.loading).toBe(false))
    await act(async () => { fireEvent.press(getByTestId('resume-2')) })
    expect(mockSave).toHaveBeenCalledWith(2, { snooze_until: '', enabled: true })
    expect(showToast()).toHaveBeenCalledWith('success', 'Orders resumed')
    await waitFor(() => expect(getByTestId('counts').props.children).toBe('2/0/1/false'))
  })

  it('says so and keeps the state when the save fails', async () => {
    mockSave.mockResolvedValue({ content: { error: true, result: ['no'] } })
    const { getByTestId } = renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.loading).toBe(false))
    await act(async () => { fireEvent.press(getByTestId('resume-2')) })
    expect(showToast()).toHaveBeenCalledWith('error', 'Error updating business')
    expect(getByTestId('counts').props.children).toBe('1/1/1/false')
  })

  it('offline: the sheet does not open and resume does nothing', async () => {
    ;(useNetInfo as jest.Mock).mockReturnValue({ isConnected: false })
    const { getByTestId } = renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.loading).toBe(false))
    expect(latest.isOffline).toBe(true)
    fireEvent.press(getByTestId('open-all'))
    expect(latest.sheet).toBeNull()
    await act(async () => { fireEvent.press(getByTestId('resume-2')) })
    expect(mockSave).not.toHaveBeenCalled()
  })

  it('reports a failed request', async () => {
    mockGet.mockRejectedValue(new Error('down'))
    renderWithProviders(<Harness />)
    await waitFor(() => expect(latest.error).toBe(true))
    expect(latest.stores).toEqual([])
  })
})
