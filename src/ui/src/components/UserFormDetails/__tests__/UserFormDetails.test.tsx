import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { KeyboardAvoidingView } from 'react-native'
import { act, fireEvent, waitFor, within } from '@testing-library/react-native'

import { useSession, useApi } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { captureDialogs } from '../../../../../../jest/helpers/confirmDialogs'
import { UserFormDetails, differsFromOpened, PASSWORD_MIN_LENGTH } from '..'

jest.mock('@components', () => require('../../../../../../jest/helpers/profileMocks').buildComponentsMock())

const field = (code: string, name: string, required = true) => ({ id: code, code, name, enabled: true, required })

const validationFields = {
  loading: false,
  fields: {
    checkout: {
      name: field('name', 'Name'),
      lastname: field('lastname', 'Last name'),
      email: field('email', 'Email'),
      cellphone: field('cellphone', 'Phone', false)
    }
  }
}

const owner = { id: 7, name: 'Ana', lastname: 'Torres', email: 'ana@luna.test', cellphone: '4155550134', country_phone_code: '1', level: 2, photo: null }

const controller = (overrides: any = {}) => ({
  isEdit: true,
  formState: { loading: false, changes: {}, result: { error: false } },
  validationFields,
  showField: () => true,
  isRequiredField: (code: string) => (validationFields.fields.checkout as any)[code]?.required,
  handleChangeInput: jest.fn(),
  handleButtonUpdateClick: jest.fn(),
  handleRemoveAccount: jest.fn(),
  ...overrides
})

const navigationStub = () => {
  const listeners: Record<string, (event: any) => void> = {}
  return {
    goBack: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn((name: string, listener: any) => { listeners[name] = listener; return jest.fn() }),
    listeners
  }
}

const session = (user: any = owner, actions: any = {}) =>
  (useSession as jest.Mock).mockReturnValue([{ auth: true, user, token: 'tkn' }, { logout: jest.fn(), ...actions }])

const open = async (part: 'information' | 'password', props: any = {}, options: any = {}) => {
  const navigation = props.navigation ?? navigationStub()
  const ui = controller(props.controller)
  const result = renderWithProviders(<UserFormDetails part={part} navigation={navigation} {...ui} {...props.extra} />, options)
  await act(async () => {})
  return { ...result, navigation, ui }
}

describe('UserFormDetails: the personal information', () => {
  let dialogs: ReturnType<typeof captureDialogs>

  beforeEach(async () => {
    await AsyncStorage.clear()
    dialogs = captureDialogs()
    session()
  })
  afterEach(() => dialogs.off())

  it('shows every field the server asks for, with the user\'s values, and the phone', async () => {
    const { getByDisplayValue, getByTestId, getByText } = await open('information')
    expect(getByDisplayValue('Ana')).toBeTruthy()
    expect(getByDisplayValue('Torres')).toBeTruthy()
    expect(getByDisplayValue('ana@luna.test')).toBeTruthy()
    expect(getByTestId('phone-input')).toBeTruthy()
    expect(getByText('Personal information')).toBeTruthy()
  })

  // ANDROID: "Personal information" showed only "Name": the project's checkout validation fields (the customers' form)
  // had the others off. The account's own details are always there.
  it('always draws the name, the last name, the e-mail and the phone, whatever the checkout fields of the project say', async () => {
    const { getByDisplayValue, getByTestId } = await open('information', {
      controller: {
        showField: (code: string) => code === 'name',
        validationFields: { loading: false, fields: { checkout: { name: field('name', 'Name') } } }
      }
    })
    expect(getByDisplayValue('Ana')).toBeTruthy()
    expect(getByDisplayValue('Torres')).toBeTruthy()
    expect(getByDisplayValue('ana@luna.test')).toBeTruthy()
    expect(getByTestId('phone-input')).toBeTruthy()
  })

  it('draws them in that order, then the project\'s other fields as it shows them', async () => {
    const { getAllByLabelText } = await open('information', {
      controller: {
        showField: (code: string) => code !== 'second_lastname',
        validationFields: { loading: false, fields: { checkout: { email: field('email', 'Email'), name: field('name', 'Name'), second_lastname: field('second_lastname', 'Second last name', false), middle_name: field('middle_name', 'Middle name', false) } } }
      }
    })
    const labels = getAllByLabelText(/^(Name|Middle name|Last name|Second last name|Email)$/).map((node: any) => node.props.accessibilityLabel)
    expect(labels).toEqual(['Name', 'Middle name', 'Last name', 'Email'])
  })

  it('keeps the name required when the project does not list it', async () => {
    const { getByLabelText, getByTestId, ui } = await open('information', {
      controller: {
        validationFields: { loading: false, fields: { checkout: {} } },
        isRequiredField: () => false,
        formState: { loading: false, changes: { name: '' }, result: { error: false } }
      }
    })
    fireEvent.changeText(getByLabelText('Name'), '')
    await act(async () => { fireEvent.press(getByTestId('profile-form-update')) })
    await waitFor(() => expect(getByTestId('error-name')).toBeTruthy())
    expect(ui.handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('passes what is typed to the controller, the e-mail cleaned', async () => {
    const { getByDisplayValue, ui } = await open('information')
    fireEvent.changeText(getByDisplayValue('Ana'), 'Anita')
    expect(ui.handleChangeInput).toHaveBeenCalledWith({ target: { name: 'name', value: 'Anita' } })
    fireEvent.changeText(getByDisplayValue('ana@luna.test'), 'Ana @Luna.Test')
    expect(ui.handleChangeInput).toHaveBeenLastCalledWith({ target: { name: 'email', value: 'ana@luna.test' } })
  })

  it('keeps Save changes off until something changed, and typing a letter back is no change', async () => {
    const off = await open('information')
    expect(off.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBe(true)
    off.unmount()
    const same = await open('information', { controller: { formState: { loading: false, changes: { name: 'Ana' }, result: { error: false } } } })
    expect(same.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBe(true)
    same.unmount()
    const changed = await open('information', { controller: { formState: { loading: false, changes: { name: 'Anita' }, result: { error: false } } } })
    expect(changed.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBeFalsy()
    expect(differsFromOpened(null, '')).toBe(false)
    expect(differsFromOpened('x', 'y')).toBe(true)
  })

  it('saves the changes with the controller', async () => {
    const { getByTestId, ui } = await open('information', { controller: { formState: { loading: false, changes: { name: 'Anita' }, result: { error: false } } } })
    await act(async () => { fireEvent.press(getByTestId('profile-form-update')) })
    await waitFor(() => expect(ui.handleButtonUpdateClick).toHaveBeenCalledWith(null))
  })

  it('shows an invalid e-mail under its field and does not save', async () => {
    const { getByLabelText, getByTestId, ui } = await open('information', {
      controller: { formState: { loading: false, changes: { email: 'nope' }, result: { error: false } } }
    })
    fireEvent.changeText(getByLabelText('Email'), 'nope')
    await act(async () => { fireEvent.press(getByTestId('profile-form-update')) })
    await waitFor(() => expect(getByTestId('error-email')).toBeTruthy())
    expect(ui.handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('shows a required field left empty under it and does not save', async () => {
    const { getByLabelText, getByTestId, ui } = await open('information', {
      controller: { formState: { loading: false, changes: { name: '' }, result: { error: false } } }
    })
    fireEvent.changeText(getByLabelText('Name'), '')
    await act(async () => { fireEvent.press(getByTestId('profile-form-update')) })
    await waitFor(() => expect(getByTestId('error-name')).toBeTruthy())
    expect(ui.handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('shows a required phone cleared under the phone and does not save', async () => {
    const { getByTestId, ui } = await open('information', {
      controller: {
        validationFields: { loading: false, fields: { checkout: { ...validationFields.fields.checkout, cellphone: field('cellphone', 'Phone', true) } } },
        formState: { loading: false, changes: { cellphone: null }, result: { error: false } }
      }
    })
    await act(async () => { fireEvent.press(getByTestId('profile-form-update')) })
    await waitFor(() => expect(getByTestId('error-cellphone')).toBeTruthy())
    expect(ui.handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('goes back at once when nothing changed, and asks before throwing typing away', async () => {
    const clean = await open('information')
    fireEvent.press(clean.getByLabelText(/back/i))
    expect(clean.navigation.goBack).toHaveBeenCalledTimes(1)
    expect(dialogs.requests).toHaveLength(0)
    clean.unmount()

    const dirty = await open('information', { controller: { formState: { loading: false, changes: { name: 'Anita' }, result: { error: false } } } })
    fireEvent.press(dirty.getByLabelText(/back/i))
    expect(dirty.navigation.goBack).not.toHaveBeenCalled()
    expect(dialogs.last()).toMatchObject({
      message: 'You have changes that are not saved. Do you want to discard them?',
      acceptText: 'Discard',
      cancelText: 'Keep editing',
      destructive: true
    })
    dialogs.cancel()
    expect(dirty.navigation.goBack).not.toHaveBeenCalled()
    dialogs.accept()
    expect(dirty.navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('asks the same for the system\'s back (the swipe or the hardware button)', async () => {
    const { navigation } = await open('information', { controller: { formState: { loading: false, changes: { name: 'Anita' }, result: { error: false } } } })
    const event = { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } }
    navigation.listeners.beforeRemove(event)
    expect(event.preventDefault).toHaveBeenCalled()
    dialogs.accept()
    expect(navigation.dispatch).toHaveBeenCalledWith({ type: 'GO_BACK' })
  })

  it('lets the system\'s back through when nothing is unsaved', async () => {
    const { navigation } = await open('information')
    const event = { preventDefault: jest.fn(), data: { action: {} } }
    navigation.listeners.beforeRemove(event)
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('goes back by itself when the controller ends the edit (the save went through)', async () => {
    const { navigation } = await open('information', { controller: { isEdit: false } })
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('says the save\'s answer: its error under the form, its success in a toast', async () => {
    const { useToast } = require('@components')
    const { showToast } = (useToast as jest.Mock)()[1]
    const failed = await open('information', { controller: { formState: { loading: false, changes: {}, result: { error: true, result: ['Email already exists'] } } } })
    // A save error is the form's own, under it (H23): not a toast.
    expect(failed.getByTestId('profile-form-error')).toHaveTextContent('Email already exists')
    expect(showToast).not.toHaveBeenCalledWith('error', expect.anything())
    showToast.mockClear()
    await open('information', { controller: { formState: { loading: false, changes: {}, result: { error: false, result: { id: 7 } } } } })
    expect(showToast).toHaveBeenCalledWith('success', 'Update successfully')
  })

  // IOS-B2: the password's action bar floated above the keyboard or sat half behind it. The rule is the app's one
  // (`KeyboardScreen` measures its distance from the window's top; `OBottomBar` keeps no inset with the keyboard up): the
  // form must use them, with the bar inside the avoiding view so the keyboard lifts it.
  it.each(['password', 'information'] as const)('keeps the %s form\'s bar inside the keyboard-avoiding screen', async (part) => {
    const { getByTestId, UNSAFE_getByType } = await open(part)
    const avoiding = UNSAFE_getByType(KeyboardAvoidingView)
    expect(avoiding.props.behavior).toBe('padding')
    expect(avoiding.props.enabled).toBe(true)
    expect(within(avoiding).getByTestId('profile-form-bar')).toBeTruthy()
    expect(within(avoiding).getByTestId('profile-form-update')).toBeTruthy()
    expect(getByTestId('profile-form-bar')).toBeTruthy()
  })

  it('has the page, a tablet included, in a column with the bar at the bottom', async () => {
    const { getByTestId } = await open('information', {}, { platform: 'tablet' })
    expect(getByTestId('profile-form-bar')).toBeTruthy()
  })
})

describe('UserFormDetails: what moved to the Profile', () => {
  beforeEach(() => session())

  it('has no photo, no "Change photo" and no remove account on the information screen (the Profile has them)', async () => {
    const { queryByTestId, queryByText } = await open('information')
    expect(queryByTestId('profile-photo')).toBeNull()
    expect(queryByTestId('profile-photo-edit')).toBeNull()
    expect(queryByText('Change photo')).toBeNull()
    expect(queryByTestId('profile-remove-account')).toBeNull()
    expect(queryByTestId('profile-remove-account-hint')).toBeNull()
    expect(queryByText('Remove account')).toBeNull()
  })
})

describe('UserFormDetails: the password', () => {
  let dialogs: ReturnType<typeof captureDialogs>
  const fetchMock = jest.fn()

  beforeEach(() => {
    dialogs = captureDialogs()
    session()
    ;(useApi as jest.Mock).mockReturnValue([{ root: 'https://api.test/v1/en', appId: 'app', appInternalName: 'business_app' }, {}])
    global.fetch = fetchMock as any
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ error: false, result: 'OK' }) })
  })
  afterEach(() => dialogs.off())

  const fill = (screen: any, current: string, next: string, confirmation: string) => {
    fireEvent.changeText(screen.getByTestId('password-current'), current)
    fireEvent.changeText(screen.getByTestId('password-new'), next)
    fireEvent.changeText(screen.getByTestId('password-confirm'), confirmation)
  }

  it('has the current password, the new one with its hint and the confirmation, and Update password off', async () => {
    const screen = await open('password')
    expect(screen.getByTestId('password-current')).toBeTruthy()
    expect(screen.getByTestId('password-new')).toBeTruthy()
    expect(screen.getByTestId('password-confirm')).toBeTruthy()
    expect(screen.getByText(`At least ${PASSWORD_MIN_LENGTH} characters.`)).toBeTruthy()
    expect(screen.getByText('Update password')).toBeTruthy()
    expect(screen.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBe(true)
  })

  it('does not draw the personal information\'s fields', async () => {
    const { queryByDisplayValue } = await open('password')
    expect(queryByDisplayValue('Ana')).toBeNull()
  })

  it('shows "passwords do not match" under the confirmation and keeps the button off', async () => {
    const screen = await open('password')
    fill(screen, 'oldpassword', 'Luna2024pizza', 'Luna2024pizz')
    expect(screen.getByTestId('error-confirmPassword')).toBeTruthy()
    expect(screen.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBe(true)
  })

  it('turns the hint into an error while the new password is too short', async () => {
    const screen = await open('password')
    fireEvent.changeText(screen.getByTestId('password-new'), 'short')
    expect(screen.getByTestId('error-newPassword')).toBeTruthy()
    expect(screen.queryByTestId('password-hint')).toBeNull()
    expect(screen.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBe(true)
  })

  it('checks the current password with the server before it saves, then saves the new one', async () => {
    const screen = await open('password')
    fill(screen, 'oldpassword', 'Luna2024pizza', 'Luna2024pizza')
    expect(screen.getByTestId('profile-form-update').props.accessibilityState?.disabled).toBeFalsy()
    await act(async () => { fireEvent.press(screen.getByTestId('profile-form-update')) })
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/v1/en/users/check_password', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ password: 'oldpassword' }),
      headers: expect.objectContaining({ Authorization: 'Bearer tkn' })
    }))
    expect(screen.ui.handleButtonUpdateClick).toHaveBeenCalledWith({ password: 'Luna2024pizza' })
  })

  it('shows "The current password is not right." under it and saves nothing when the server says no', async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({ error: true, result: ['Invalid password'] }) })
    const screen = await open('password')
    fill(screen, 'wrong', 'Luna2024pizza', 'Luna2024pizza')
    await act(async () => { fireEvent.press(screen.getByTestId('profile-form-update')) })
    expect(screen.getByTestId('error-currentPassword')).toBeTruthy()
    expect(screen.getByText('The current password is not right.')).toBeTruthy()
    expect(screen.ui.handleButtonUpdateClick).not.toHaveBeenCalled()
    // Typing again clears it.
    fireEvent.changeText(screen.getByTestId('password-current'), 'oldpassword')
    expect(screen.queryByTestId('error-currentPassword')).toBeNull()
  })

  it('saves nothing and says so when the check cannot be made', async () => {
    fetchMock.mockRejectedValue(new Error('Network request failed'))
    const { useToast } = require('@components')
    const { showToast } = (useToast as jest.Mock)()[1]
    const screen = await open('password')
    fill(screen, 'oldpassword', 'Luna2024pizza', 'Luna2024pizza')
    await act(async () => { fireEvent.press(screen.getByTestId('profile-form-update')) })
    // Inline under the form, never a toast.
    expect(screen.getByTestId('profile-form-error')).toHaveTextContent('Network request failed')
    expect(showToast).not.toHaveBeenCalledWith('error', expect.anything())
    expect(screen.ui.handleButtonUpdateClick).not.toHaveBeenCalled()
  })

  it('asks before throwing typed passwords away', async () => {
    const screen = await open('password')
    fireEvent.changeText(screen.getByTestId('password-current'), 'abc')
    fireEvent.press(screen.getByLabelText(/back/i))
    expect(dialogs.last()).toMatchObject({ acceptText: 'Discard', cancelText: 'Keep editing' })
    dialogs.accept()
    expect(screen.navigation.goBack).toHaveBeenCalled()
  })
})
