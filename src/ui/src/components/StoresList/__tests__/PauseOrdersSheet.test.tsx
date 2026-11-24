import React from 'react'
import { fireEvent } from '@testing-library/react-native'

jest.mock('@components', () => ({
  ...require('../../../../../../jest/helpers/mockOrdering'),
  useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY' }, {}])
}))

import { PauseOrdersSheet } from '../PauseOrdersSheet'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 11, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
const NOW = new Date('2026-11-19T18:05:09Z')

const stores = [
  { id: 1, name: 'Luna Pizza', timezone: NY, schedule },
  { id: 2, name: 'Green Bowl', timezone: 'America/Los_Angeles', schedule }
]

describe('PauseOrdersSheet', () => {
  beforeEach(() => { jest.useFakeTimers({ now: NOW }) })
  afterEach(() => { jest.useRealTimers() })

  it('draws the title with the store, the hint and the five durations with the 30 minutes chosen', () => {
    const { getByText, getByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[stores[0]]} name='Luna Pizza' onConfirm={jest.fn()} />)
    expect(getByText('Pause orders · Luna Pizza')).toBeTruthy()
    expect(getByText('Customers see the store as temporarily closed. Orders you already accepted are not affected.')).toBeTruthy()
    ;['minutes_15', 'minutes_30', 'hour_1', 'rest_of_day', 'until_resumed'].forEach((key) => expect(getByTestId(`pause-option-${key}`)).toBeTruthy())
    expect(getByTestId('pause-option-minutes_30').props.accessibilityState.checked).toBe(true)
    expect(getByText('Until 1:35 PM')).toBeTruthy()
    expect(getByText('Reopens tomorrow 11:00 AM')).toBeTruthy()
    expect(getByText('Until I turn it back on')).toBeTruthy()
  })

  // ANDROID-B12: the times are the store's own clock; when it is not the device's, the sheet says whose it is.
  describe('when the store\'s clock is not the device\'s', () => {
    const originalZone = process.env.TZ
    afterEach(() => { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone })

    it('names the store\'s time zone under the hint', () => {
      process.env.TZ = 'America/Bogota'
      const { getByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[{ id: 3, name: 'Crops', timezone: 'America/Chicago', schedule }]} name='Crops' onConfirm={jest.fn()} />)
      expect(getByTestId('pause-zone-note')).toHaveTextContent('Times are in the store\'s time zone (Chicago).')
    })

    it('says nothing when the store\'s clock reads the device\'s', () => {
      process.env.TZ = 'America/Bogota'
      const { queryByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[{ id: 3, name: 'Crops', timezone: 'America/Bogota', schedule }]} name='Crops' onConfirm={jest.fn()} />)
      expect(queryByTestId('pause-zone-note')).toBeNull()
    })
  })

  it('confirms the chosen duration with its changes', () => {
    const onConfirm = jest.fn()
    const { getByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[stores[0]]} name='Luna Pizza' onConfirm={onConfirm} />)
    fireEvent.press(getByTestId('pause-option-minutes_15'))
    fireEvent.press(getByTestId('pause-confirm'))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ key: 'minutes_15', changes: { snooze_until: '2026-11-19 18:20:09' } }), stores[0])
  })

  it('asks which store first when there are several, and times each in its own clock', () => {
    const onConfirm = jest.fn()
    const { getByTestId, getAllByText } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={stores} onConfirm={onConfirm} />)
    expect(getByTestId('pause-store-1').props.accessibilityState.checked).toBe(true)
    fireEvent.press(getByTestId('pause-store-2'))
    expect(getByTestId('pause-store-2').props.accessibilityState.checked).toBe(true)
    // The 30 minutes end at 10:35 AM in Los Angeles.
    expect(getAllByText('Until 10:35 AM')).toHaveLength(1)
    fireEvent.press(getByTestId('pause-confirm'))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ key: 'minutes_30' }), stores[1])
  })

  it('has no "rest of today" when the schedule has no next opening', () => {
    const { queryByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[{ id: 1, name: 'No schedule' }]} onConfirm={jest.fn()} />)
    expect(queryByTestId('pause-option-rest_of_day')).toBeNull()
  })

  it('pauses a product: its own title, two hours, and enabled true with the date', () => {
    const onConfirm = jest.fn()
    const { getByText, getByTestId } = renderWithProviders(<PauseOrdersSheet open kind='product' name='Four cheese pizza' onClose={jest.fn()} targets={[stores[0]]} onConfirm={onConfirm} />)
    expect(getByText('Unavailable · Four cheese pizza')).toBeTruthy()
    fireEvent.press(getByTestId('pause-option-hours_2'))
    fireEvent.press(getByTestId('pause-confirm'))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ changes: { enabled: true, snooze_until: '2026-11-19 20:05:09' } }), stores[0])
  })

  it('disables the button while it saves', () => {
    const onConfirm = jest.fn()
    const { getByTestId } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[stores[0]]} onConfirm={onConfirm} loading />)
    fireEvent.press(getByTestId('pause-confirm'))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('draws nothing when closed', () => {
    const { queryByText } = renderWithProviders(<PauseOrdersSheet open={false} onClose={jest.fn()} targets={[stores[0]]} name='Luna Pizza' onConfirm={jest.fn()} />)
    expect(queryByText('Pause orders · Luna Pizza')).toBeNull()
  })

  it('is a centered card on a tablet', () => {
    const { getByText } = renderWithProviders(<PauseOrdersSheet open onClose={jest.fn()} targets={[stores[0]]} name='Luna Pizza' onConfirm={jest.fn()} />, { platform: 'tablet' })
    expect(getByText('Pause orders · Luna Pizza')).toBeTruthy()
  })
})
