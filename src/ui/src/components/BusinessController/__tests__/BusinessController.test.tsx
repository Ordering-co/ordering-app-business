import React, { useState } from 'react'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  return {
    ...mockOrdering,
    useUtils: jest.fn(() => [{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY', parsePrice: (value: number) => '$' + Number(value).toFixed(2) }, {}]),
    BusinessController: renderUiController({})
  }
})

import { useToast } from '@components'
import { BusinessController, BusinessControllerUI, storeStatusText } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'

const NY = 'America/New_York'
const schedule = Array.from({ length: 7 }, () => ({ enabled: true, lapses: [{ open: { hour: 11, minute: 0 }, close: { hour: 22, minute: 0 } }] }))
const NOW = new Date('2026-11-19T18:05:09Z') // 13:05 in New York, a Thursday
const LATE = new Date('2026-11-20T04:00:00Z') // 23:00

const store = (overrides: any = {}) => ({
  id: 1,
  name: 'Luna Pizza',
  slug: 'luna-pizza',
  address: '214 Harbor St',
  zipcode: '10001',
  logo: '',
  enabled: true,
  open: true,
  schedule,
  timezone: NY,
  snooze_until: null,
  ...overrides
})

const showToast = () => (useToast as jest.Mock)()[1].showToast as jest.Mock

/** Stands in for the controller: `updateBusiness` raises `loading`, then hands back the saved business (or the error text). */
const Harness = ({ initial, fail = false, onUpdate = jest.fn(), ...rest }: any) => {
  const [state, setState] = useState<any>({ business: initial, loading: false, error: null })
  const updateBusiness = (id: number, changes: any) => {
    onUpdate(id, changes)
    setState((previous: any) => ({ ...previous, loading: true }))
    setTimeout(() => setState({
      business: fail ? 'Some error' : { ...initial, ...changes },
      loading: false,
      error: fail ? ['Some error'] : null
    }), 5)
  }
  return <BusinessControllerUI businessState={state} updateBusiness={updateBusiness} now={NOW} {...rest} />
}

describe('BusinessController (the store card)', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW })
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  describe('the store\'s clock against the device\'s (ANDROID-B12)', () => {
    const originalZone = process.env.TZ
    afterEach(() => { if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone })

    it('says whose clock the times are when the store is in another zone than the device', () => {
      process.env.TZ = 'America/Bogota'
      const { getByTestId } = renderWithProviders(<Harness initial={store({ timezone: 'America/Chicago' })} />)
      expect(getByTestId('store-zone-1')).toHaveTextContent('Store time: Chicago')
    })

    it('says nothing when the two clocks agree', () => {
      process.env.TZ = 'America/Bogota'
      const { queryByTestId } = renderWithProviders(<Harness initial={store({ timezone: 'America/Bogota' })} />)
      expect(queryByTestId('store-zone-1')).toBeNull()
    })
  })

  describe('what each state says', () => {
    it('open: the green line with the closing time and the switch on', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProviders(<Harness initial={store()} />)
      expect(getByText('Luna Pizza')).toBeTruthy()
      expect(getByText('214 Harbor St 10001')).toBeTruthy()
      expect(getByTestId('store-status-1').props.children).toBe('Open · closes\u00A010:00\u00A0PM')
      expect(getByTestId('store-dot-open')).toBeTruthy()
      expect(getByTestId('store-switch-1').props.accessibilityState.checked).toBe(true)
      expect(queryByTestId('store-resume-1')).toBeNull()
    })

    it('closed by its schedule: when it opens', () => {
      const { getByTestId } = renderWithProviders(<Harness initial={store({ open: false })} now={LATE} />)
      expect(getByTestId('store-status-1').props.children).toBe('Closed · opens tomorrow 11:00\u00A0AM')
      expect(getByTestId('store-switch-1').props.accessibilityState.checked).toBe(true)
    })

    it('paused: a chip with the time and "Resume now" instead of the switch', () => {
      const { getByTestId, getByText, queryByTestId } = renderWithProviders(<Harness initial={store({ snooze_until: '2026-11-19 20:30:00' })} />)
      expect(getByText('Paused · until 3:30 PM')).toBeTruthy()
      expect(getByTestId('store-resume-1')).toBeTruthy()
      expect(queryByTestId('store-switch-1')).toBeNull()
    })

    it('turned off (enabled false): its own label and the switch off', () => {
      const { getByTestId } = renderWithProviders(<Harness initial={store({ enabled: false })} />)
      expect(getByTestId('store-status-1').props.children).toBe('Orders turned off')
      expect(getByTestId('store-switch-1').props.accessibilityState.checked).toBe(false)
    })

    it('follows the clock: a pause that ended is open again', () => {
      const { getByTestId, rerender } = renderWithProviders(<Harness initial={store({ snooze_until: '2026-11-19 18:30:00' })} now={NOW} />)
      expect(getByTestId('store-resume-1')).toBeTruthy()
      rerender(<Harness initial={store({ snooze_until: '2026-11-19 18:30:00' })} now={new Date('2026-11-19T18:31:00Z')} />)
      expect(getByTestId('store-status-1').props.children).toBe('Open · closes\u00A010:00\u00A0PM')
    })

    it('storeStatusText: a 24 hour clock and the hours key off', () => {
      const t = (_key: string, fallback: string) => fallback
      const when = (date: Date) => `at ${date.toISOString()}`
      expect(storeStatusText({ kind: 'open', closesAt: NOW }, NY, t, when)).toContain('Open · closes\u00A0at ')
      expect(storeStatusText({ kind: 'open', closesAt: NOW }, NY, t, when, false)).toBe('Open')
      expect(storeStatusText({ kind: 'closed', opensAt: NOW }, NY, t, when, false)).toBe('Closed')
      expect(storeStatusText({ kind: 'closed', opensAt: null }, NY, t, when)).toBe('Closed')
      expect(storeStatusText({ kind: 'paused', until: NOW }, NY, t, when, false)).toContain('Paused · until at ')
    })

    it('storeStatusText: a narrow card breaks before "closes" or not at all, never inside the time (T3-C4)', () => {
      const t = (_key: string, fallback: string) => fallback
      const when = () => '11:59 PM'
      const open = storeStatusText({ kind: 'open', closesAt: NOW }, NY, t, when)
      // The only space a line can break at is the one after the dot: "Open ·" / "closes 11:59 PM".
      expect(open).toBe('Open · closes\u00A011:59\u00A0PM')
      expect(open.split(' ')).toEqual(['Open', '·', 'closes\u00A011:59\u00A0PM'])
      expect(storeStatusText({ kind: 'closed', opensAt: NOW }, NY, t, () => 'Mon 8:00 AM').split(' ')).toEqual(['Closed', '·', 'opens', 'Mon', '8:00\u00A0AM'])
    })
  })

  describe('what the card shows by theme key', () => {
    it('hides the address, the hours and the logo with their keys; the dot and the switch stay', () => {
      const theme = themeWithValues((values) => {
        values.visibility['stores.address'] = false
        values.visibility['stores.hours'] = false
        values.visibility['business_card.logo'] = false
      })
      const { queryByText, getByTestId } = renderWithProviders(<Harness initial={store({ logo: 'https://example.com/logo.png' })} />, { themeOverrides: theme })
      expect(queryByText('214 Harbor St 10001')).toBeNull()
      expect(getByTestId('store-status-1').props.children).toBe('Open')
      expect(getByTestId('store-dot-open')).toBeTruthy()
      expect(getByTestId('store-switch-1')).toBeTruthy()
    })

    it('hides the zipcode for an empty or -1 value', () => {
      const { getByText, rerender } = renderWithProviders(<Harness initial={store({ zipcode: '-1' })} />)
      expect(getByText('214 Harbor St')).toBeTruthy()
      rerender(<Harness initial={store({ zipcode: '  ' })} />)
      expect(getByText('214 Harbor St')).toBeTruthy()
    })
  })

  describe('opening the menu', () => {
    it('navigates to the menu with the slug and name', () => {
      const navigation = { navigate: jest.fn() }
      const { getByTestId } = renderWithProviders(<Harness initial={store()} navigation={navigation} />)
      fireEvent.press(getByTestId('store-open-1'))
      expect(navigation.navigate).toHaveBeenCalledWith('BusinessProductListing', { slug: 'luna-pizza', name: 'Luna Pizza' })
    })

    it('selects the store instead on two panes', () => {
      const onSelectStore = jest.fn()
      const navigation = { navigate: jest.fn() }
      const { getByTestId } = renderWithProviders(<Harness initial={store()} navigation={navigation} onSelectStore={onSelectStore} />)
      fireEvent.press(getByTestId('store-open-1'))
      expect(onSelectStore).toHaveBeenCalledWith(expect.objectContaining({ id: 1, slug: 'luna-pizza' }))
      expect(navigation.navigate).not.toHaveBeenCalled()
    })
  })

  describe('pausing', () => {
    it('the switch opens the pause sheet; a duration sends snooze_until in UTC', async () => {
      const onUpdate = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(<Harness initial={store()} onUpdate={onUpdate} />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      expect(getByText('Pause orders · Luna Pizza')).toBeTruthy()
      expect(getByText('Until 1:35 PM')).toBeTruthy()
      fireEvent.press(getByTestId('pause-option-hour_1'))
      fireEvent.press(getByTestId('pause-confirm'))
      expect(onUpdate).toHaveBeenCalledWith(1, { snooze_until: '2026-11-19 19:05:09' })
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('success', 'Orders paused until 2:05 PM'))
      // The card shows the pause that was saved, from the change itself.
      expect(getByText('Paused · until 2:05 PM')).toBeTruthy()
    })

    it('"Until I turn it back on" turns orders off (enabled false), no date', async () => {
      const onUpdate = jest.fn()
      const { getByTestId } = renderWithProviders(<Harness initial={store()} onUpdate={onUpdate} />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      fireEvent.press(getByTestId('pause-option-until_resumed'))
      fireEvent.press(getByTestId('pause-confirm'))
      expect(onUpdate).toHaveBeenCalledWith(1, { enabled: false })
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('success', 'Disabled business'))
      expect(getByTestId('store-status-1').props.children).toBe('Orders turned off')
    })

    it('"Rest of today" reopens at tomorrow\'s first opening', () => {
      const onUpdate = jest.fn()
      const { getByTestId, getByText } = renderWithProviders(<Harness initial={store()} onUpdate={onUpdate} />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      expect(getByText('Reopens tomorrow 11:00 AM')).toBeTruthy()
      fireEvent.press(getByTestId('pause-option-rest_of_day'))
      fireEvent.press(getByTestId('pause-confirm'))
      expect(onUpdate).toHaveBeenCalledWith(1, { snooze_until: '2026-11-20 16:00:00' })
    })

    it('"Resume now" sends an empty snooze_until', async () => {
      const onUpdate = jest.fn()
      const { getByTestId } = renderWithProviders(<Harness initial={store({ snooze_until: '2026-11-19 20:30:00' })} onUpdate={onUpdate} />)
      fireEvent.press(getByTestId('store-resume-1'))
      expect(onUpdate).toHaveBeenCalledWith(1, { snooze_until: '' })
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('success', 'Orders resumed'))
      expect(getByTestId('store-status-1').props.children).toBe('Open · closes\u00A010:00\u00A0PM')
    })

    it('the switch of a store that is turned off turns it on at once, without the sheet', async () => {
      const onUpdate = jest.fn()
      const { getByTestId, queryByTestId } = renderWithProviders(<Harness initial={store({ enabled: false })} onUpdate={onUpdate} />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      expect(queryByTestId('pause-confirm')).toBeNull()
      expect(onUpdate).toHaveBeenCalledWith(1, { enabled: true })
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('success', 'Orders resumed'))
    })

    it('a failed save says so in an error toast and leaves the card as it was', async () => {
      const { getByTestId } = renderWithProviders(<Harness initial={store()} fail />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      fireEvent.press(getByTestId('pause-confirm'))
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('error', 'Error updating business'))
      expect(getByTestId('store-status-1').props.children).toBe('Open · closes\u00A010:00\u00A0PM')
    })

    it('a request that threw (the controller keeps the same business) is a failure too', async () => {
      const Throwing = () => {
        const [state, setState] = useState<any>({ business: store(), loading: false, error: null })
        const updateBusiness = () => {
          setState((previous: any) => ({ ...previous, loading: true }))
          setTimeout(() => setState((previous: any) => ({ ...previous, loading: false, error: 'Network request failed' })), 5)
        }
        return <BusinessControllerUI businessState={state} updateBusiness={updateBusiness} now={NOW} />
      }
      const { getByTestId } = renderWithProviders(<Throwing />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      fireEvent.press(getByTestId('pause-confirm'))
      await act(async () => { jest.advanceTimersByTime(10) })
      await waitFor(() => expect(showToast()).toHaveBeenCalledWith('error', 'Error updating business'))
    })

    it('does not send a second request while one is going', () => {
      const onUpdate = jest.fn()
      const { getByTestId } = renderWithProviders(<Harness initial={store({ enabled: false })} onUpdate={onUpdate} />)
      fireEvent(getByTestId('store-switch-1'), 'press')
      fireEvent(getByTestId('store-switch-1'), 'press')
      expect(onUpdate).toHaveBeenCalledTimes(1)
    })
  })

  describe('offline', () => {
    it('disables the switch and "Resume now"', () => {
      const onUpdate = jest.fn()
      const first = renderWithProviders(<Harness initial={store()} isOffline onUpdate={onUpdate} />)
      fireEvent(first.getByTestId('store-switch-1'), 'press')
      expect(onUpdate).not.toHaveBeenCalled()
      expect(first.getByTestId('store-switch-1').props.accessibilityState.disabled).toBe(true)
      first.unmount()
      const second = renderWithProviders(<Harness initial={store({ snooze_until: '2026-11-19 20:30:00' })} isOffline onUpdate={onUpdate} />)
      expect(second.getByTestId('store-resume-1').props.accessibilityState.disabled).toBe(true)
    })
  })

  describe('the controller wrapper', () => {
    it('renders the card through the controller with its interval disabled', () => {
      const { getByText } = renderWithProviders(<BusinessController businessState={{ business: store(), loading: false, error: null }} now={NOW} />)
      expect(getByText('Luna Pizza')).toBeTruthy()
    })

    it('renders nothing without a business', () => {
      const { queryByText } = renderWithProviders(<BusinessController businessState={{ business: null, loading: false, error: null }} />)
      expect(queryByText('Luna Pizza')).toBeNull()
    })
  })

  describe('selected on two panes', () => {
    it('paints the tint card', () => {
      const { getByTestId } = renderWithProviders(<Harness initial={store()} selected />)
      expect(getByTestId('store-card-1')).toBeTruthy()
    })
  })
})
