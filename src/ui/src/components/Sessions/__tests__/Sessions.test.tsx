import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { fireEvent, within } from '@testing-library/react-native'

import { useSession, useUtils } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { defaultAppTheme } from '../../../../../theme/engine'
import { makeFormats } from '../../../../../hooks/useFormats'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'

jest.mock('@components', () => require('../../../../../../jest/helpers/profileMocks').buildComponentsMock())

import { Sessions } from '..'

const sessions = [
  { id: 1, created_at: '2026-11-01 09:00:00', valid_thru: '2026-12-01 09:00:00', current: false },
  { id: 2, created_at: '2026-11-19 09:02:00', valid_thru: '2026-12-19 09:02:00', current: true },
  { id: 3, created_at: '2026-11-12 18:00:00', valid_thru: '2026-12-12 18:00:00', current: false }
]

const profileMocks = require('../../../../../../jest/helpers/profileMocks')

// The date and the time the app writes (the project's formats; the API's UTC text, in the device's clock).
const stamp = (value: string) => makeFormats({ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY' }).dateTime(value)

const load = (list: any[], strategy = 'jwt_session') => {
  ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user: { id: 1, session_strategy: strategy } }, { logout: jest.fn() }])
  profileMocks.sessionsDefaults.sessionsList = { loading: false, error: null, sessions: list }
}

describe('Sessions', () => {
  let dialogs: ReturnType<typeof captureDialogs>

  beforeEach(() => {
    dialogs = captureDialogs()
    ;(useUtils as jest.Mock).mockReturnValue([{ timeFormat: 'h:mm A', dateFormat: 'DD/MM/YYYY' }])
    profileMocks.sessionsDefaults.handleDeleteSession = jest.fn()
    profileMocks.sessionsDefaults.handleDeleteAllSessions = jest.fn()
    profileMocks.sessionsDefaults.actionState = { loading: false, error: null }
    load(sessions)
  })

  afterEach(() => dialogs.off())

  it('shows This device with its label, the Started and Valid until dates and the Current badge', () => {
    const { getByTestId, getByText } = renderWithProviders(<Sessions navigation={{}} />)
    const card = within(getByTestId('session-current'))
    expect(card.getByText('This device')).toBeTruthy()
    expect(card.getByText(Platform.OS === 'ios' ? 'iPhone · this phone' : 'Android · this phone')).toBeTruthy()
    expect(card.getByText(`Started ${stamp('2026-11-19 09:02:00')}`)).toBeTruthy()
    expect(card.getByText(`Valid until ${stamp('2026-12-19 09:02:00')}`)).toBeTruthy()
    expect(getByText('Current')).toBeTruthy()
  })

  // H9: a word with a state colour is the 24 px soft pill, as the mockup's "Current" (not the counter-sized solid one).
  it('writes Current as a soft success pill of the badge\'s own size', () => {
    const { getByText } = renderWithProviders(<Sessions navigation={{}} />)
    const badge = (defaultAppTheme() as any).native.components.badge
    const text = StyleSheet.flatten(getByText('Current').props.style)
    expect(text.color).toBe(badge.variants.success_soft.color)
    expect(text.fontSize).toBe(badge.base.text.fontSize)
    let box: any = getByText('Current').parent
    while (box && !StyleSheet.flatten(box.props.style)?.backgroundColor) box = box.parent
    expect(StyleSheet.flatten(box.props.style)).toEqual(expect.objectContaining({ backgroundColor: badge.variants.success_soft.background, minHeight: badge.sizes.md.height }))
  })

  it('has no sign-out on the current session (Log out is the way out of this device)', () => {
    const { queryByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(queryByTestId('session-delete-2')).toBeNull()
    expect(queryByTestId('session-card-2')).toBeNull()
  })

  it('lists the other devices newest first, with no device name, and does not reorder the controller\'s list', () => {
    const { getByTestId, getAllByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(within(getByTestId('session-others')).getByText('Other devices')).toBeTruthy()
    // The list the controller holds is old to new: 1, 2 (current), 3; the screen shows 3 then 1.
    const rows = getAllByTestId(/session-card-/)
    expect(rows.map((row) => row.props.testID)).toEqual(['session-card-3', 'session-card-1'])
    expect(sessions.map((session) => session.id)).toEqual([1, 2, 3])
    expect(within(rows[0]).getByText(`Started ${stamp('2026-11-12 18:00:00')}`)).toBeTruthy()
    expect(within(rows[0]).getByText(`Valid until ${stamp('2026-12-12 18:00:00')}`)).toBeTruthy()
  })

  it('draws a device row as the mockup does: at least the button\'s height plus 10 over and under it (64), with its line', () => {
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    const row = StyleSheet.flatten(getByTestId('session-card-3').props.style)
    expect(row.minHeight).toBe(64)
    expect(row.paddingVertical).toBe(10)
    expect(row.gap).toBe(15)
    expect(row.borderBottomWidth).toBeGreaterThan(0)
  })

  // An account with a hundred sessions made this screen the heaviest to open: every row was mounted at once.
  it('mounts only the rows near the top for a list of 150 sessions', () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      id: i + 1,
      created_at: '2026-11-01 09:00:00',
      valid_thru: '2026-12-01 09:00:00',
      current: i === 74
    }))
    load(many)
    const { getAllByTestId, getByTestId, queryByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    const mounted = getAllByTestId(/^session-card-/)
    expect(mounted.length).toBeLessThanOrEqual(15)
    // The newest first, as with a short list; the current session is never a row.
    expect(mounted[0].props.testID).toBe('session-card-150')
    expect(queryByTestId('session-card-1')).toBeNull()
    expect(queryByTestId('session-card-75')).toBeNull()
    // The header (this device) and the bar are there whatever the number of rows.
    expect(getByTestId('session-current')).toBeTruthy()
    expect(getByTestId('sessions-sign-out-others')).toBeTruthy()
    // The list is a virtualized one that knows its 149 rows.
    expect(getByTestId('sessions-list').props.data).toHaveLength(149)
  })

  it('signs a device out only after the themed dialog is accepted', () => {
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    fireEvent.press(getByTestId('session-delete-3'))
    expect(dialogs.last()).toMatchObject({
      message: 'Are you sure to delete this session?',
      acceptText: 'Sign out',
      cancelText: 'Cancel',
      destructive: true
    })
    expect(profileMocks.sessionsDefaults.handleDeleteSession).not.toHaveBeenCalled()
    dialogs.cancel()
    expect(profileMocks.sessionsDefaults.handleDeleteSession).not.toHaveBeenCalled()
    dialogs.accept()
    expect(profileMocks.sessionsDefaults.handleDeleteSession).toHaveBeenCalledWith(sessions[2])
  })

  it('signs out of every other device from the bar, keeping this one, after a confirmation', () => {
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    fireEvent.press(getByTestId('sessions-sign-out-others'))
    expect(dialogs.last()).toMatchObject({
      message: 'Are you sure that you want to delete all sessions except current?',
      acceptText: 'Sign out',
      destructive: true
    })
    expect(profileMocks.sessionsDefaults.handleDeleteAllSessions).not.toHaveBeenCalled()
    dialogs.accept()
    expect(profileMocks.sessionsDefaults.handleDeleteAllSessions).toHaveBeenCalledWith(false)
  })

  it('has no bar and says so when this is the only device', () => {
    load([sessions[1]])
    const { queryByTestId, getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(queryByTestId('sessions-bar')).toBeNull()
    expect(getByTestId('sessions-no-others')).toBeTruthy()
  })

  it('has no This device card when the API flags no current session', () => {
    load([sessions[0]])
    const { queryByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(queryByTestId('session-current')).toBeNull()
    expect(queryByTestId('session-card-1')).toBeTruthy()
  })

  it('draws a skeleton while the sessions load, and no bar', () => {
    profileMocks.sessionsDefaults.sessionsList = { loading: true, error: null, sessions: [] }
    const { getAllByTestId, queryByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(getAllByTestId('session-skeleton')).toHaveLength(3)
    expect(queryByTestId('sessions-bar')).toBeNull()
  })

  it('says there are no sessions', () => {
    load([])
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(getByTestId('sessions-none')).toBeTruthy()
  })

  it('offers to turn the sessions on for an account that does not use jwt_session, after a confirmation', () => {
    load([], 'jwt')
    const { getByTestId, queryByTestId, getAllByText } = renderWithProviders(<Sessions navigation={{}} />)
    expect(queryByTestId('sessions-bar')).toBeNull()
    expect(queryByTestId('session-current')).toBeNull()
    expect(getAllByText('Active sessions').length).toBeGreaterThan(0)
    fireEvent.press(getByTestId('sessions-enable'))
    expect(dialogs.last()).toMatchObject({ message: 'Are you sure to enable all sessions?', acceptText: 'Active sessions' })
    expect(dialogs.last().destructive).toBeFalsy()
    dialogs.accept()
    expect(profileMocks.sessionsDefaults.handleDeleteAllSessions).toHaveBeenCalledWith(false)
  })

  it('disables the sign-outs while an action runs', () => {
    profileMocks.sessionsDefaults.actionState = { loading: true, error: null }
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />)
    expect(getByTestId('session-delete-1').props.accessibilityState?.disabled).toBe(true)
    expect(getByTestId('sessions-sign-out-others').props.accessibilityState?.disabled).toBe(true)
  })

  it('goes back from the bar\'s arrow', () => {
    const navigation = { canGoBack: jest.fn(() => true), goBack: jest.fn() }
    const { getByLabelText } = renderWithProviders(<Sessions navigation={navigation} />)
    fireEvent.press(getByLabelText(/back/i))
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('labels this device as a tablet on a tablet', () => {
    const { getByTestId } = renderWithProviders(<Sessions navigation={{}} />, { platform: 'tablet' })
    expect(within(getByTestId('session-current')).getByText(Platform.OS === 'ios' ? 'iPad · this tablet' : 'Android · this tablet')).toBeTruthy()
  })
})
