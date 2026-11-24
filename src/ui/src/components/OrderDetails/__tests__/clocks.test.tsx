import React from 'react'
import { act } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { StatusRow } from '../StatusRow'
import { PrepTimeCard } from '../StageCards'

const components = require('@components')

const NOW = Date.parse('2026-11-19T12:26:00Z')

beforeEach(() => {
  jest.useFakeTimers({ now: NOW })
  components.useUtils.mockReturnValue([{ parseDate: (value: string) => value, timeFormat: 'HH:mm' }, {}])
})
afterEach(() => { jest.useRealTimers() })

describe('the clocks of the details tick on their own', () => {
  it('Waiting counts up every second on a new order', () => {
    const order = { status: 0, delivery_type: 1, created_at: '2026-11-19 12:25:18' }
    const { getByText } = renderWithProviders(<StatusRow order={order} />)
    expect(getByText('Waiting 00:42')).toBeTruthy()
    act(() => { jest.advanceTimersByTime(3000) })
    expect(getByText('Waiting 00:45')).toBeTruthy()
  })

  it('Ready in counts down every second while the order is being made', () => {
    const order = {
      status: 7,
      prepared_in: 20,
      updated_at: '2026-11-19 12:18:30',
      history: [{ type: 2, created_at: '2026-11-19 07:18:00', data: [{ attribute: 'status', old: 0, new: 7 }] }]
    }
    const { getByTestId } = renderWithProviders(<PrepTimeCard order={order} showCountdown canAdjust onAdjust={jest.fn()} />)
    expect(getByTestId('prep-figure').props.children).toBe('12:00')
    act(() => { jest.advanceTimersByTime(2000) })
    expect(getByTestId('prep-figure').props.children).toBe('11:58')
  })

  it('does not tick for a finished order', () => {
    renderWithProviders(<StatusRow order={{ status: 1, delivery_type: 1, created_at: '2026-11-19 12:00:00' }} />)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('without minutes given there is no card, with them but no moment accepted at it says the minutes', () => {
    const none = renderWithProviders(<PrepTimeCard order={{ status: 7 }} showCountdown canAdjust onAdjust={jest.fn()} />)
    expect(none.queryByTestId('prep-card')).toBeNull()
    const given = renderWithProviders(<PrepTimeCard order={{ status: 7, prepared_in: 25 }} showCountdown canAdjust onAdjust={jest.fn()} />)
    expect(given.getByText('25 min')).toBeTruthy()
    expect(given.queryByTestId('prep-progress')).toBeNull()
  })
})
