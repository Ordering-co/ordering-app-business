import React from 'react'
import { Linking, StyleSheet } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useApi, useSession, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'
import settings from '@/config.json'
import { resetAlertSettings, updateAlertSettings } from '../../AlertSettings'
import { forgetOrdersDisplayForTests, setOrdersDisplay } from '@/context/ordersDisplay'

const mockSettings = settings as { help_url?: string }

// The app config is a plain object the test fills (`help_url`).
jest.mock('@/config.json', () => ({ __esModule: true, default: {} }))

jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }))

// What the user form's controller hands the profile (the test changes its members).
const mockController: any = {}

jest.mock('@components', () => {
  const mocks = require('../../../../../../jest/helpers/profileMocks')
  return mocks.buildComponentsMock({ UserFormDetails: (props: any) => mocks.renderUiController(mockController)(props) })
})

import { UserProfileForm } from '..'

const field = (code: string, name: string, enabled = true) => ({ id: code, code, name, enabled, required: false })

const owner = {
  id: 7,
  name: 'Ana',
  lastname: 'Torres',
  email: 'ana@luna.test',
  cellphone: '4155550134',
  country_phone_code: '1',
  level: 2,
  photo: null,
  session_strategy: 'jwt_session'
}

const signedIn = (user: any = owner, sessionLoading = false, actions: any = {}) => {
  ;(useSession as jest.Mock).mockReturnValue([{ auth: true, user, sessionLoading, token: 'tkn' }, { logout: jest.fn(), ...actions }])
}

const resetController = (extra: any = {}) => {
  Object.keys(mockController).forEach((key) => delete mockController[key])
  Object.assign(mockController, {
    formState: { loading: false, changes: {}, result: { error: false } },
    validationFields: { loading: false, fields: { checkout: { name: field('name', 'Name'), lastname: field('lastname', 'Last name'), email: field('email', 'Email'), cellphone: field('cellphone', 'Phone') } } },
    showField: () => true,
    handleButtonUpdateClick: jest.fn(),
    handleRemoveAccount: jest.fn(() => Promise.resolve('OK'))
  }, extra)
}

const renderProfile = async (props: any = {}, options: any = {}) => {
  const navigation = { navigate: jest.fn() }
  const result = renderWithProviders(<UserProfileForm navigation={navigation} {...props} />, options)
  // The device's reads (printers, alert settings, the sessions' count) land after the first frame.
  await act(async () => {})
  return { ...result, navigation }
}

// The Orders display tests say the theme's defaults themselves (quick actions on, clock time off).
const standardDisplay = { themeOverrides: themeWithValues((values) => { values.visibility['orders.quick_actions'] = true; values.visibility['orders.absolute_time'] = false }) }

const hiding = (...keys: string[]) => ({
  themeOverrides: themeWithValues((values) => { keys.forEach((key) => { values.visibility[key] = false }) })
})

const sessionsOf = (sessions: any[], extra: any = {}) => {
  const { sessionsDefaults } = require('../../../../../../jest/helpers/profileMocks')
  sessionsDefaults.sessionsList = { loading: false, error: null, sessions, ...extra }
}

describe('UserProfileForm (the Profile tab, the driver\'s structure)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    resetAlertSettings()
    forgetOrdersDisplayForTests()
    delete mockSettings.help_url
    sessionsOf([])
    resetController()
    signedIn()
  })

  describe('who the user is', () => {
    it('shows the photo, the name, the role of their level, the e-mail and the phone', async () => {
      const { getByTestId } = await renderProfile()
      expect(getByTestId('profile-photo-box')).toBeTruthy()
      expect(getByTestId('profile-name').props.children).toBe('Ana Torres')
      expect(getByTestId('profile-role').props.children).toBe('Business owner')
      expect(getByTestId('profile-email').props.children).toBe('ana@luna.test')
      expect(getByTestId('profile-phone').props.children).toBe('(+1) 4155550134')
    })

    it.each([[0, 'Administrator'], [5, 'Driver manager']])('names the role of level %i', async (level, role) => {
      signedIn({ ...owner, level })
      const { getByTestId } = await renderProfile()
      expect(getByTestId('profile-role').props.children).toBe(role)
    })

    it('draws the initials when there is no photo', async () => {
      const { getByText } = await renderProfile()
      expect(getByText('AT')).toBeTruthy()
    })
  })

  describe('the information', () => {
    it('has the name, last name, e-mail and phone as read-only rows, each with its value', async () => {
      const { getByTestId } = await renderProfile()
      expect(within(getByTestId('profile-info-name')).getByText('Name')).toBeTruthy()
      expect(within(getByTestId('profile-info-name')).getByText('Ana')).toBeTruthy()
      expect(within(getByTestId('profile-info-lastname')).getByText('Torres')).toBeTruthy()
      expect(within(getByTestId('profile-info-email')).getByText('ana@luna.test')).toBeTruthy()
      expect(within(getByTestId('profile-info-cellphone')).getByText('(+1) 4155550134')).toBeTruthy()
    })

    it('always shows the four, whatever the project\'s checkout fields say, and says when there is no phone', async () => {
      resetController({ validationFields: { loading: false, fields: { checkout: {} } }, showField: () => false })
      signedIn({ ...owner, cellphone: null })
      const { getByTestId } = await renderProfile()
      ;['name', 'lastname', 'email', 'cellphone'].forEach((code) => expect(getByTestId(`profile-info-${code}`)).toBeTruthy())
      expect(within(getByTestId('profile-info-cellphone')).getByText('Not Phone')).toBeTruthy()
    })

    it('adds a project field the server shows and leaves out one it hides', async () => {
      resetController({
        validationFields: { loading: false, fields: { checkout: { middle_name: field('middle_name', 'Middle name'), second_lastname: field('second_lastname', 'Second last name') } } },
        showField: (code: string) => code !== 'second_lastname'
      })
      signedIn({ ...owner, middle_name: 'Luz' })
      const { getByTestId, queryByTestId } = await renderProfile()
      expect(within(getByTestId('profile-info-middle_name')).getByText('Luz')).toBeTruthy()
      expect(queryByTestId('profile-info-second_lastname')).toBeNull()
    })

    it('opens the edit screen with the Edit link', async () => {
      const { getByTestId, navigation } = await renderProfile()
      fireEvent.press(getByTestId('profile-edit'))
      expect(navigation.navigate).toHaveBeenCalledWith('ProfileEdit')
    })

    it('has the Password row with a mask, opening its screen, and hides it with profile.password', async () => {
      const { getByTestId, navigation } = await renderProfile()
      expect(within(getByTestId('profile-row-password')).getByText('••••••••')).toBeTruthy()
      fireEvent.press(getByTestId('profile-row-password'))
      expect(navigation.navigate).toHaveBeenCalledWith('ProfilePassword')
      const hidden = await renderProfile({}, hiding('profile.password'))
      expect(hidden.queryByTestId('profile-row-password')).toBeNull()
      expect(hidden.getByTestId('profile-info-name')).toBeTruthy()
    })

    it('has no row of the old layout (the personal information row, the user card, This device)', async () => {
      const { queryByTestId, queryByText } = await renderProfile()
      expect(queryByTestId('profile-row-information')).toBeNull()
      expect(queryByTestId('profile-user-card')).toBeNull()
      expect(queryByTestId('profile-device')).toBeNull()
      expect(queryByText('This device')).toBeNull()
    })
  })

  describe('the account rows', () => {
    it('opens each one\'s own screen: sessions, printers (the printing area\'s list), alerts and sound, orders display', async () => {
      const { getByTestId, navigation } = await renderProfile()
      fireEvent.press(getByTestId('profile-row-sessions'))
      fireEvent.press(getByTestId('profile-row-printers'))
      fireEvent.press(getByTestId('profile-row-notifications'))
      fireEvent.press(getByTestId('profile-row-orders-display'))
      expect(navigation.navigate.mock.calls.map((call: any[]) => call[0])).toEqual(['Sessions', 'Printers', 'Notifications', 'OrdersDisplay'])
    })

    it('carries each row\'s value at its end: the printers, the alert setting and the version', async () => {
      await AsyncStorage.setItem('printers', JSON.stringify([{ nickname: 'Kitchen' }, { nickname: 'Bar' }]))
      const { getByTestId, getByText, queryByText } = await renderProfile()
      await waitFor(() => expect(getByText('Kitchen and 1 more')).toBeTruthy())
      expect(within(getByTestId('profile-row-printers')).getByText('Kitchen and 1 more')).toBeTruthy()
      expect(within(getByTestId('profile-row-notifications')).getByText('Ring until opened')).toBeTruthy()
      expect(within(getByTestId('profile-row-about')).getByText('Version 1.0.0')).toBeTruthy()
      // The three sounds are bundled: once the ring is off the row names the chosen one.
      await act(async () => { await updateAlertSettings({ ringUntilOpened: false, sound: 'chime' }) })
      expect(getByText('Chime')).toBeTruthy()
      expect(queryByText('Ring until opened')).toBeNull()
    })

    it('names a single printer as it is', async () => {
      await AsyncStorage.setItem('printers', JSON.stringify([{ nickname: 'Kitchen' }]))
      const { getByText } = await renderProfile()
      await waitFor(() => expect(getByText('Kitchen')).toBeTruthy())
    })

    it('keeps a long value to one line, so the row\'s title is never the one that is cut', async () => {
      await AsyncStorage.setItem('printers', JSON.stringify([{ nickname: 'The kitchen printer by the back door of the second floor' }]))
      const { getByTestId } = await renderProfile()
      await waitFor(() => expect(within(getByTestId('profile-row-printers')).getByText(/The kitchen printer/)).toBeTruthy())
      expect(within(getByTestId('profile-row-printers')).getByText(/The kitchen printer/).props.numberOfLines).toBe(1)
      expect(within(getByTestId('profile-row-printers')).getByText('Printers').props.numberOfLines).toBe(1)
    })

    it('has no chevron on a row that only informs (About) and one on the rows that open something', async () => {
      const { getByTestId } = await renderProfile()
      expect(within(getByTestId('profile-row-about')).UNSAFE_queryAllByProps({ name: 'chevron-forward' })).toHaveLength(0)
      expect(within(getByTestId('profile-row-printers')).UNSAFE_queryAllByProps({ name: 'chevron-forward' }).length).toBeGreaterThan(0)
    })

    it('counts the signed-in devices when the account uses jwt sessions', async () => {
      sessionsOf([{ id: 1 }, { id: 2 }, { id: 3 }])
      const { getByTestId } = await renderProfile()
      expect(within(getByTestId('profile-row-sessions')).getByText('3 devices signed in')).toBeTruthy()
    })

    it('words one session as "1 device" and says nothing of an absurd count (sessions are not devices)', async () => {
      sessionsOf([{ id: 1 }])
      const first = await renderProfile()
      expect(first.getByText('1 device signed in')).toBeTruthy()
      first.unmount()
      sessionsOf(Array.from({ length: 822 }, (_, id) => ({ id })))
      const second = await renderProfile()
      expect(second.queryByText(/devices signed in/)).toBeNull()
      expect(second.getByTestId('profile-row-sessions')).toBeTruthy()
    })

    it('says nothing of the devices while the list loads or when it failed', async () => {
      sessionsOf([], { loading: true })
      const loading = await renderProfile()
      expect(loading.queryByText(/devices signed in/)).toBeNull()
      sessionsOf([], { error: ['x'] })
      const failed = await renderProfile()
      expect(failed.queryByText(/devices signed in/)).toBeNull()
    })

    it('does not count the devices for another session strategy', async () => {
      signedIn({ ...owner, session_strategy: 'jwt' })
      const { queryByText } = await renderProfile()
      expect(queryByText(/devices signed in/)).toBeNull()
    })

    it('has the language row last in the account card, with the language as its value, only for a project with more than one language', async () => {
      const { getByTestId } = await renderProfile()
      expect(within(getByTestId('profile-account')).getByTestId('language-selector')).toBeTruthy()
      expect(within(getByTestId('language-selector')).getByText('English')).toBeTruthy()
      const { languageDefaults } = require('../../../../../../jest/helpers/profileMocks')
      const original = languageDefaults.languagesState
      languageDefaults.languagesState = { loading: false, languages: [{ code: 'en', name: 'English' }] }
      const single = await renderProfile()
      expect(single.queryByTestId('language-selector')).toBeNull()
      languageDefaults.languagesState = original
    })

    it.each([
      ['menu.sessions', 'profile-row-sessions'],
      ['menu.printers', 'profile-row-printers'],
      ['menu.notifications', 'profile-row-notifications'],
      ['menu.orders_display', 'profile-row-orders-display'],
      ['menu.language', 'language-selector'],
      ['menu.about', 'profile-row-about']
    ])('hides the row of the visibility key %s', async (key, testID) => {
      const { queryByTestId, getByTestId } = await renderProfile({}, hiding(key))
      expect(queryByTestId(testID)).toBeNull()
      expect(getByTestId('profile-info-name')).toBeTruthy()
    })

    it('draws no Account block when the theme hides every row of it', async () => {
      const { queryByTestId } = await renderProfile({}, hiding('menu.sessions', 'menu.printers', 'menu.notifications', 'menu.orders_display', 'menu.language'))
      expect(queryByTestId('profile-account')).toBeNull()
    })

    it('keeps the Account block when the Orders display row is the only one left', async () => {
      const { getByTestId } = await renderProfile({}, hiding('menu.sessions', 'menu.printers', 'menu.notifications', 'menu.language'))
      expect(getByTestId('profile-account')).toBeTruthy()
      expect(getByTestId('profile-row-orders-display')).toBeTruthy()
    })

    it('writes a row\'s title in the account page\'s row title (the body weight, as the driver\'s), not the list row\'s semibold', async () => {
      const compiled = require('@/theme.compiled.json')
      const { getByTestId } = await renderProfile({}, standardDisplay)
      const title = within(getByTestId('profile-row-orders-display')).getByText('Orders display')
      const style = StyleSheet.flatten(title.props.style)
      expect(compiled.values.components.account_page.base.row_title.$value.weight).toBe(400)
      expect(compiled.values.components.list_row.base.title.$value.weight).toBe(600)
      // The regular file of the family, never the semibold one.
      expect(String(style.fontFamily)).not.toMatch(/SemiBold|600/i)
      expect(style.fontSize).toBe(compiled.values.components.account_page.base.row_title.$value.size)
    })

    it('writes no value in the Orders display row: its two settings are said by its screen', async () => {
      const { getByTestId, queryByText } = await renderProfile({}, standardDisplay)
      expect(within(getByTestId('profile-row-orders-display')).getByText('Orders display')).toBeTruthy()
      expect(queryByText(/Quick actions/)).toBeNull()
    })
  })

  describe('support', () => {
    it('draws the Help center only when the app config has a help_url, and opens it', async () => {
      const { queryByTestId } = await renderProfile()
      expect(queryByTestId('profile-row-help')).toBeNull()

      mockSettings.help_url = 'https://help.example.com/business'
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
      const { getByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-row-help'))
      expect(open).toHaveBeenCalledWith('https://help.example.com/business')
    })

    it('hides the Help center with menu.help even when the config has the page', async () => {
      mockSettings.help_url = 'https://help.example.com'
      const { queryByTestId } = await renderProfile({}, hiding('menu.help'))
      expect(queryByTestId('profile-row-help')).toBeNull()
    })

    it('draws no Support block when it has neither row', async () => {
      const { queryByTestId } = await renderProfile({}, hiding('menu.about'))
      expect(queryByTestId('profile-support')).toBeNull()
    })
  })

  describe('log out', () => {
    it('is a danger row of its own with no chevron, and asks as the driver\'s does', async () => {
      const dialogs = captureDialogs()
      const { getByTestId } = await renderProfile()
      expect(within(getByTestId('logout')).UNSAFE_queryAllByProps({ name: 'chevron-forward' })).toHaveLength(0)
      fireEvent.press(getByTestId('logout'))
      expect(dialogs.last()).toMatchObject({ message: 'Are you sure that you want to log out?', acceptText: 'Logout', destructive: true })
      dialogs.off()
    })
  })

  describe('the photo', () => {
    const { launchCamera, launchImageLibrary } = require('react-native-image-picker')

    it('opens the photo sheet from the photo and from the camera button, and saves the picture at once', async () => {
      launchImageLibrary.mockImplementation((_options: any, callback: any) => callback({ assets: [{ uri: 'file://p.jpg', type: 'image/jpeg', base64: 'AAA' }] }))
      const { getByTestId, queryByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-photo'))
      expect(getByTestId('photo-take')).toBeTruthy()
      expect(queryByTestId('photo-remove')).toBeNull()
      fireEvent.press(getByTestId('photo-gallery'))
      expect(mockController.handleButtonUpdateClick).toHaveBeenCalledWith(null, true, 'data:image/jpeg;base64,AAA')
      await waitFor(() => expect(queryByTestId('photo-take')).toBeNull())
      fireEvent.press(getByTestId('profile-photo-edit'))
      expect(getByTestId('photo-take')).toBeTruthy()
    })

    it('takes a photo with the camera', async () => {
      launchCamera.mockImplementation((_options: any, callback: any) => callback({ assets: [{ uri: 'file://c.jpg', type: 'image/png', base64: 'BBB' }] }))
      const { getByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-photo-edit'))
      fireEvent.press(getByTestId('photo-take'))
      expect(mockController.handleButtonUpdateClick).toHaveBeenCalledWith(null, true, 'data:image/png;base64,BBB')
    })

    it('has "Remove photo" only with a photo and a controller that can remove it, and asks first', async () => {
      const dialogs = captureDialogs()
      signedIn({ ...owner, photo: 'https://img.test/a.jpg' })
      const handleRemovePhoto = jest.fn()
      resetController({ handleRemovePhoto })
      const withBoth = await renderProfile()
      fireEvent.press(withBoth.getByTestId('profile-photo-edit'))
      fireEvent.press(withBoth.getByTestId('photo-remove'))
      expect(dialogs.last()).toMatchObject({ message: 'Are you sure that you want to remove your photo?', acceptText: 'Remove', destructive: true })
      dialogs.cancel()
      expect(handleRemovePhoto).not.toHaveBeenCalled()
      act(() => { dialogs.accept() })
      expect(handleRemovePhoto).toHaveBeenCalledTimes(1)
      withBoth.unmount()

      resetController()
      const without = await renderProfile()
      fireEvent.press(without.getByTestId('profile-photo-edit'))
      expect(without.queryByTestId('photo-remove')).toBeNull()
      dialogs.off()
    })

    it('shows a spinner over the photo and disables it while the picture is saved', async () => {
      resetController({ formState: { loading: true, changes: {}, result: { error: false } } })
      const { getByTestId } = await renderProfile()
      expect(getByTestId('profile-photo-loading')).toBeTruthy()
      expect(getByTestId('profile-photo-edit').props.accessibilityState?.disabled).toBe(true)
    })

    it('says the save\'s answer in a toast', async () => {
      const { showToast } = (useToast as jest.Mock)()[1]
      showToast.mockClear()
      resetController({ formState: { loading: false, changes: {}, result: { error: false, result: { id: 7 } } } })
      await renderProfile()
      expect(showToast).toHaveBeenCalledWith('success', 'Update successfully')
      showToast.mockClear()
      resetController({ formState: { loading: false, changes: {}, result: { error: true, result: ['Image too big'] } } })
      await renderProfile()
      expect(showToast).toHaveBeenCalledWith('error', 'Image too big')
    })
  })

  describe('remove account', () => {
    const fetchMock = jest.fn()
    let dialogs: ReturnType<typeof captureDialogs>

    beforeEach(async () => {
      dialogs = captureDialogs()
      ;(useApi as jest.Mock).mockReturnValue([{ root: 'https://api.test/v1/en', appId: 'app', appInternalName: 'business_app' }, {}])
      global.fetch = fetchMock as any
      fetchMock.mockReset()
      fetchMock.mockResolvedValue({ json: () => Promise.resolve({ error: false, result: 'OK' }) })
      await AsyncStorage.setItem('printers', JSON.stringify([{ nickname: 'Kitchen' }]))
      await AsyncStorage.setItem('language', JSON.stringify('es'))
      await AsyncStorage.setItem('isTutorial', 'true')
      await AsyncStorage.setItem('project_name', JSON.stringify('luna'))
    })
    afterEach(() => dialogs.off())

    it('is a quiet link at the end, with no hint for anyone who can remove', async () => {
      const { getByTestId, queryByTestId } = await renderProfile()
      expect(getByTestId('profile-remove-account')).toBeTruthy()
      expect(queryByTestId('profile-remove-account-hint')).toBeNull()
    })

    it('asks, then asks for the password and checks it, then removes the user, ends the session and wipes all but the language and the tutorial flag', async () => {
      const logout = jest.fn()
      signedIn(owner, false, { logout })
      const { getByTestId, getByText, queryByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-remove-account'))
      expect(getByText('Are you sure that you want to remove your account?')).toBeTruthy()
      expect(queryByTestId('remove-account-password')).toBeNull()
      fireEvent.press(getByTestId('remove-account-accept'))
      expect(getByTestId('remove-account-password')).toBeTruthy()
      expect(mockController.handleRemoveAccount).not.toHaveBeenCalled()
      fireEvent.changeText(getByTestId('remove-account-password'), 'secret-pass')
      await act(async () => { fireEvent.press(getByTestId('remove-account-accept')) })
      expect(fetchMock).toHaveBeenCalledWith('https://api.test/v1/en/users/check_password', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ password: 'secret-pass' }),
        headers: expect.objectContaining({ Authorization: 'Bearer tkn' })
      }))
      expect(mockController.handleRemoveAccount).toHaveBeenCalledWith(7)
      expect(logout).toHaveBeenCalled()
      await waitFor(async () => expect((await AsyncStorage.getAllKeys()).sort()).toEqual(['isTutorial', 'language']))
    })

    it('asks for the password before it does anything, and a wrong one stops it with the server\'s answer under the field', async () => {
      fetchMock.mockResolvedValue({ json: () => Promise.resolve({ error: true, result: ['Invalid password'] }) })
      const { getByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-remove-account'))
      fireEvent.press(getByTestId('remove-account-accept'))
      await act(async () => { fireEvent.press(getByTestId('remove-account-accept')) })
      expect(getByTestId('remove-account-error')).toBeTruthy()
      expect(fetchMock).not.toHaveBeenCalled()
      fireEvent.changeText(getByTestId('remove-account-password'), 'wrong')
      await act(async () => { fireEvent.press(getByTestId('remove-account-accept')) })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(mockController.handleRemoveAccount).not.toHaveBeenCalled()
      expect(getByTestId('remove-account-error')).toBeTruthy()
    })

    it('keeps the session and tells so when the server refuses the removal', async () => {
      const logout = jest.fn()
      signedIn(owner, false, { logout })
      resetController({ handleRemoveAccount: jest.fn(() => Promise.resolve(undefined)) })
      const { getByTestId, getByText } = await renderProfile()
      fireEvent.press(getByTestId('profile-remove-account'))
      fireEvent.press(getByTestId('remove-account-accept'))
      fireEvent.changeText(getByTestId('remove-account-password'), 'secret-pass')
      await act(async () => { fireEvent.press(getByTestId('remove-account-accept')) })
      expect(logout).not.toHaveBeenCalled()
      expect(getByText('The account could not be removed. Try again.')).toBeTruthy()
      expect((await AsyncStorage.getAllKeys()).length).toBe(4)
    })

    it('cancelling at any step leaves everything', async () => {
      const { getByTestId, queryByTestId } = await renderProfile()
      fireEvent.press(getByTestId('profile-remove-account'))
      fireEvent.press(getByTestId('remove-account-cancel'))
      await waitFor(() => expect(queryByTestId('remove-account-accept')).toBeNull())
      expect(mockController.handleRemoveAccount).not.toHaveBeenCalled()
    })

    it('is disabled for an administrator, and says why', async () => {
      signedIn({ ...owner, level: 0 })
      const { getByTestId, getByText, queryByTestId } = await renderProfile()
      expect(getByText('Administrator accounts can\'t be removed here.')).toBeTruthy()
      fireEvent.press(getByTestId('profile-remove-account'))
      expect(queryByTestId('remove-account-accept')).toBeNull()
    })
  })

  describe('the theme\'s page', () => {
    it('follows its sections: a hidden photo is not drawn and the logout stays', async () => {
      const themeOverrides = themeWithValues((values) => {
        values.pages.profile.sections.find((section: any) => section.key === 'profile_photo').visible = false
      })
      const { queryByTestId, getByTestId } = await renderProfile({}, { themeOverrides })
      expect(queryByTestId('profile-photo')).toBeNull()
      expect(getByTestId('logout')).toBeTruthy()
    })

    it('follows the theme\'s order of the movable sections', async () => {
      const themeOverrides = themeWithValues((values) => {
        const sections = values.pages.profile.sections
        const support = sections.find((section: any) => section.key === 'support')
        sections.splice(sections.indexOf(support), 1)
        sections.splice(sections.findIndex((section: any) => section.key === 'account'), 0, support)
      })
      const { toJSON } = await renderProfile({}, { themeOverrides })
      const text = JSON.stringify(toJSON())
      expect(text.indexOf('profile-support')).toBeGreaterThan(-1)
      expect(text.indexOf('profile-support')).toBeLessThan(text.indexOf('profile-account'))
    })

    it('draws a skeleton while the session loads', async () => {
      signedIn(owner, true)
      const { getByTestId, queryByTestId } = await renderProfile()
      expect(getByTestId('profile-skeleton')).toBeTruthy()
      expect(queryByTestId('profile-information')).toBeNull()
    })

    it('is the same screen on a tablet (a column, no panes)', async () => {
      const { getByTestId } = await renderProfile({}, { platform: 'tablet' })
      expect(getByTestId('profile-photo')).toBeTruthy()
      expect(getByTestId('logout')).toBeTruthy()
    })
  })
})
