import React from 'react'
import { Image, Keyboard, ScrollView, StyleSheet } from 'react-native'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

import { useApi, useConfig, useToast } from '@components'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { defaultAppTheme } from '../../../../../../src/theme/engine'

jest.mock('react-native-recaptcha-that-works', () => {
  const React = require('react')
  return React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }))
    return null
  })
})

jest.mock('react-native-webview', () => {
  const { View } = require('react-native')
  return { WebView: (props: any) => <View testID='webview' {...props} /> }
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController, languageSelectorDefaults } = require('../../../../../../jest/helpers/b1ShellDefaults')
  const { loginFormDefaults } = require('../../../../../../jest/helpers/b2AuthDefaults')
  return {
    ...mockOrdering,
    LanguageSelector: renderUiController(languageSelectorDefaults),
    LoginForm: renderUiController(loginFormDefaults)
  }
})

import { LoginForm } from '..'

const failed = (result: any) => ({ loading: false, result: { error: true, result } })
const insideScroll = (node: any) => {
  for (let up = node.parent; up; up = up.parent) if (up.type === ScrollView) return true
  return false
}
const type = (screen: any, email: string, password: string) => {
  fireEvent.changeText(screen.getByLabelText('Email'), email)
  fireEvent.changeText(screen.getByLabelText('Password'), password)
}
const noMethods = { useLoginByEmail: false, useLoginByCellphone: false, useLoginOtp: false, useLoginOtpEmail: false, useLoginOtpCellphone: false }

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useApi as jest.Mock).mockReturnValue([{ project: 'demo' }, { setOrdering: jest.fn() }])
    ;(useConfig as jest.Mock).mockReturnValue([{ configs: {} }])
  })

  describe('the screen as the mockup draws it', () => {
    it('has the title and its line, the labelled fields with an example, the main button and the version', () => {
      const screen = renderWithProviders(<LoginForm />)
      expect(screen.getByText('Manage your business')).toBeTruthy()
      expect(screen.getByText('Log in to receive and manage your orders.')).toBeTruthy()
      // The labels are over the box, the example is inside it.
      expect(screen.getByLabelText('Email')).toBeTruthy()
      expect(screen.getByLabelText('Password')).toBeTruthy()
      expect(screen.getByText('Email')).toBeTruthy()
      expect(screen.getByPlaceholderText('name@store.com')).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy()
      expect(screen.getByTestId('login-version').props.children).toBe('Version 1.0.0')
    })

    it('has no back arrow, no title in the bar and no tabs: the login is the first screen', () => {
      const screen = renderWithProviders(<LoginForm useLoginByEmail useLoginOtpEmail useLoginOtp />)
      expect(screen.queryByLabelText('Go back')).toBeNull()
      expect(screen.queryAllByRole('tab')).toHaveLength(0)
    })

    it('puts the buttons in the scroll, not pinned: the login is inline', () => {
      const { getByRole } = renderWithProviders(<LoginForm />)
      expect(insideScroll(getByRole('button', { name: 'Log in' }))).toBe(true)
    })

    it('draws the logo of the theme (the logotype), and the store glyph when the theme has none', () => {
      const withLogo = renderWithProviders(<LoginForm />, {
        themeOverrides: themeWithValues((values) => { values.images.logotype = 'https://cdn.test/logo.png' })
      })
      const image = withLogo.UNSAFE_getByType(Image)
      expect(image.props.source).toEqual({ uri: 'https://cdn.test/logo.png' })
      // 4:1, the control height of the theme.
      const style = StyleSheet.flatten(image.props.style)
      expect(style.width).toBe(style.height * 4)
      withLogo.unmount()
      const withoutLogo = renderWithProviders(<LoginForm />)
      expect(withoutLogo.UNSAFE_queryAllByType(Image)).toHaveLength(0)
      expect(withoutLogo.getByTestId('login-logo', { includeHiddenElements: true })).toBeTruthy()
    })

    it('draws the sections of the page `login` that the theme shows: the logo and the title can be hidden, the form cannot', () => {
      const hidden = themeWithValues((values) => {
        values.pages.login.sections = values.pages.login.sections.map((section: any) => ({ ...section, visible: section.key === 'form' }))
      })
      const screen = renderWithProviders(<LoginForm />, { themeOverrides: hidden })
      expect(screen.queryByTestId('login-logo', { includeHiddenElements: true })).toBeNull()
      expect(screen.queryByText('Manage your business')).toBeNull()
      expect(screen.getByLabelText('Email')).toBeTruthy()
    })

    it('hides the version line with auth.version', () => {
      const screen = renderWithProviders(<LoginForm />, {
        themeOverrides: themeWithValues((values) => { values.visibility['auth.version'] = false })
      })
      expect(screen.queryByTestId('login-version')).toBeNull()
    })

    it('draws no action and no fields when the project has no login method', () => {
      const { queryByLabelText, queryByRole, getByText } = renderWithProviders(<LoginForm {...noMethods} />)
      expect(queryByLabelText('Email')).toBeNull()
      expect(queryByRole('button', { name: 'Log in' })).toBeNull()
      expect(getByText('Manage your business')).toBeTruthy()
    })

    it('draws no stray "0" when only phone login is enabled', () => {
      const screen = renderWithProviders(<LoginForm {...noMethods} useLoginByCellphone loginTab='cellphone' />)
      expect(screen.queryByText('0')).toBeNull()
      expect(JSON.stringify(screen.toJSON())).not.toMatch(/"children":\["0"\]/)
      expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
    })

    it('keeps the column of a tablet to the screen\'s maximum width, and the phone\'s to its full width', () => {
      const phone = renderWithProviders(<LoginForm />)
      expect(StyleSheet.flatten(phone.getByTestId('auth-column').children[0].props.style).maxWidth).toBeUndefined()
      phone.unmount()
      const tablet = renderWithProviders(<LoginForm />, { platform: 'tablet' })
      const maxWidth = defaultAppTheme({ platform: 'tablet' }).native.components.screen.base.max_width
      expect(maxWidth).toBeGreaterThan(0)
      const column = tablet.getByTestId('auth-column').children[0] as any
      expect(StyleSheet.flatten(column.props.style).maxWidth).toBe(maxWidth)
    })
  })

  describe('the language button', () => {
    it('shows the current language at the end of the bar and opens the sheet of languages', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<LoginForm />)
      expect(getByText('English')).toBeTruthy()
      expect(queryByText('Español')).toBeNull()
      fireEvent.press(getByTestId('language-selector'))
      // The server names it "Spanish": the sheet shows each language in its own name.
      expect(getByText('Español')).toBeTruthy()
      expect(queryByText('Spanish')).toBeNull()
    })

    it('changes the language with the row that is chosen', async () => {
      const { languageSelectorDefaults } = require('../../../../../../jest/helpers/b1ShellDefaults')
      const { getByTestId, getByText } = renderWithProviders(<LoginForm />)
      fireEvent.press(getByTestId('language-selector'))
      fireEvent.press(getByText('Español'))
      await waitFor(() => expect(languageSelectorDefaults.handleChangeLanguage).toHaveBeenCalledWith('es'))
    })
  })

  describe('the way in with e-mail and password', () => {
    it('sends the e-mail in lower case, without spaces, and the password as typed', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      type(screen, 'Ana @Store.com', 'S3cret pass')
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalledTimes(1))
      expect(handleButtonLoginClick).toHaveBeenCalledWith({ email: 'ana@store.com', password: 'S3cret pass', cellphone: null, country_phone_code: null })
    })

    it('writes what lacks under each field, with no toast, and sends nothing', async () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      expect((await screen.findByTestId('error-email')).props.children).toBe('The field Email is required')
      expect((await screen.findByTestId('error-password')).props.children).toBe('The field Password is required')
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
      expect(showToast).not.toHaveBeenCalled()
    })

    it('writes a malformed e-mail under its field and takes the message away when it is corrected', async () => {
      const screen = renderWithProviders(<LoginForm />)
      type(screen, 'not-an-email', 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      expect((await screen.findByTestId('error-email')).props.children).toBe('Invalid email address')
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      await waitFor(() => expect(screen.queryByTestId('error-email')).toBeNull())
    })

    it('dismisses the keyboard before the request goes, and keeps it when a field is missing', async () => {
      const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {})
      const handleButtonLoginClick = jest.fn()
      const screen = renderWithProviders(<LoginForm handleButtonLoginClick={handleButtonLoginClick} />)
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      await screen.findByTestId('error-email')
      expect(dismiss).not.toHaveBeenCalled()
      type(screen, 'ana@store.com', 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalled())
      expect(dismiss).toHaveBeenCalled()
      dismiss.mockRestore()
    })

    it('toggles the password\'s visibility with a labelled button of 44 pt', () => {
      const screen = renderWithProviders(<LoginForm />)
      const field = () => screen.getByLabelText('Password')
      expect(field().props.secureTextEntry).toBe(true)
      fireEvent.press(screen.getByLabelText('Show password'))
      expect(field().props.secureTextEntry).toBe(false)
      expect(screen.getByLabelText('Hide password')).toBeTruthy()
    })
  })

  describe('"Forgot your password?"', () => {
    it('is aligned to the end of the line and goes to the Forgot screen', () => {
      const onNavigationRedirect = jest.fn()
      const { getByRole } = renderWithProviders(<LoginForm onNavigationRedirect={onNavigationRedirect} />)
      const link = getByRole('link', { name: 'Forgot your password?' })
      let host: any = link.parent
      while (host && StyleSheet.flatten(host.props.style || {}).alignSelf === undefined) host = host.parent
      expect(StyleSheet.flatten(host.props.style).alignSelf).toBe('flex-end')
      fireEvent.press(link)
      expect(onNavigationRedirect).toHaveBeenCalledWith('Forgot')
    })

    it('is hidden by auth.forgot_password_link, and nothing else goes with it', () => {
      const { queryByText, getByLabelText, getByRole } = renderWithProviders(
        <LoginForm onNavigationRedirect={jest.fn()} />,
        { themeOverrides: themeWithValues((values) => { values.visibility['auth.forgot_password_link'] = false }) }
      )
      expect(queryByText('Forgot your password?')).toBeNull()
      expect(getByLabelText('Password')).toBeTruthy()
      expect(getByRole('button', { name: 'Log in' })).toBeTruthy()
    })

    it('is not drawn on the code\'s way, where there is no password', () => {
      const { queryByText, queryByLabelText } = renderWithProviders(
        <LoginForm {...noMethods} useLoginOtp useLoginOtpEmail loginTab='otp' otpType='email' onNavigationRedirect={jest.fn()} />
      )
      expect(queryByText('Forgot your password?')).toBeNull()
      expect(queryByLabelText('Password')).toBeNull()
    })
  })

  describe('"Email me a login code"', () => {
    const withCode = (props: Record<string, unknown> = {}) => renderWithProviders(
      <LoginForm useLoginByEmail useLoginOtp useLoginOtpEmail {...props} />
    )

    it('is the outline button under an "or" line when the project has the e-mail code', () => {
      const { getByText, getByRole } = withCode()
      expect(getByRole('button', { name: 'Email me a login code' })).toBeTruthy()
      expect(getByText('or')).toBeTruthy()
      const slot = defaultAppTheme().native.components.auth_form.slots.secondary
      expect(slot.appearance).toBe('outline')
    })

    it('is not shown when the e-mail code is off (the "OTP Email" tab was shown anyway)', () => {
      const screen = renderWithProviders(<LoginForm useLoginByEmail useLoginOtp={false} useLoginOtpEmail={false} />)
      expect(screen.queryByRole('button', { name: 'Email me a login code' })).toBeNull()
      expect(screen.queryByText('or')).toBeNull()
      expect(screen.queryByText('OTP Email')).toBeNull()
    })

    it('starts the e-mail code with only the e-mail field: no password asked', async () => {
      const handleChangeTab = jest.fn()
      const setOtpType = jest.fn()
      const generateOtpCode = jest.fn()
      const screen = withCode({ handleChangeTab, setOtpType, generateOtpCode })
      fireEvent.changeText(screen.getByLabelText('Email'), 'Ana@Store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      await waitFor(() => expect(generateOtpCode).toHaveBeenCalledTimes(1))
      expect(generateOtpCode).toHaveBeenCalledWith({ email: 'ana@store.com' })
      expect(handleChangeTab).toHaveBeenCalledWith('otp')
      expect(setOtpType).toHaveBeenCalledWith('email')
      expect(screen.queryByTestId('error-password')).toBeNull()
    })

    it('opens the code screen with the address, and its back arrow returns to the e-mail way', async () => {
      const handleChangeTab = jest.fn()
      const screen = withCode({ handleChangeTab })
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      expect(await screen.findByText('Enter the code')).toBeTruthy()
      expect(screen.getByText('ana@store.com')).toBeTruthy()
      handleChangeTab.mockClear()
      fireEvent.press(screen.getByLabelText('Go back'))
      expect(handleChangeTab).toHaveBeenCalledWith('email')
      expect(screen.queryByText('Enter the code')).toBeNull()
    })

    it('asks for a valid e-mail under its field, asks for no code and opens nothing', async () => {
      const generateOtpCode = jest.fn()
      const screen = withCode({ generateOtpCode })
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      expect((await screen.findByTestId('error-email')).props.children).toBe('The field Email is required')
      expect(screen.queryByTestId('error-password')).toBeNull()
      expect(generateOtpCode).not.toHaveBeenCalled()
      expect(screen.queryByText('Enter the code')).toBeNull()
    })

    it('submits the code on the sixth digit, and the pinned "Verify" submits it too', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = withCode({ handleButtonLoginClick, loginTab: 'otp', otpType: 'email', handleChangeTab: jest.fn() })
      // On the code's way the main button is the one that asks for the code.
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      await screen.findByText('Enter the code')
      const verify = screen.getByRole('button', { name: 'Verify' })
      expect(verify.props.accessibilityState.disabled).toBe(true)
      fireEvent.changeText(screen.getByTestId('otp-code-field'), '48271')
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
      fireEvent.changeText(screen.getByTestId('otp-code-field'), '482719')
      expect(handleButtonLoginClick).toHaveBeenCalledWith({ code: '482719' })
      handleButtonLoginClick.mockClear()
      fireEvent.press(screen.getByRole('button', { name: 'Verify' }))
      expect(handleButtonLoginClick).toHaveBeenCalledWith({ code: '482719' })
    })

    it('is the main button, with no password and no "or", when the project has the e-mail code only', async () => {
      const generateOtpCode = jest.fn()
      const screen = renderWithProviders(
        <LoginForm {...noMethods} useLoginOtp useLoginOtpEmail loginTab='otp' otpType='email' generateOtpCode={generateOtpCode} />
      )
      expect(screen.getAllByRole('button', { name: 'Email me a login code' })).toHaveLength(1)
      expect(screen.queryByLabelText('Password')).toBeNull()
      expect(screen.queryByText('or')).toBeNull()
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      await waitFor(() => expect(generateOtpCode).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@store.com' }), 2))
      expect(await screen.findByText('Enter the code')).toBeTruthy()
    })

    it('asks again with the same address from the code screen\'s resend', async () => {
      jest.useFakeTimers()
      const generateOtpCode = jest.fn()
      const screen = withCode({ generateOtpCode, handleChangeTab: jest.fn() })
      fireEvent.changeText(screen.getByLabelText('Email'), 'ana@store.com')
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      await screen.findByText('Enter the code')
      expect(screen.getByText('Resend code in 1:20')).toBeTruthy()
      act(() => { jest.advanceTimersByTime(80 * 1000) })
      generateOtpCode.mockClear()
      fireEvent.press(screen.getByText('Resend code'))
      expect(generateOtpCode).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@store.com' }), 2)
      jest.useRealTimers()
    })
  })

  describe('the phone and password way (only when the e-mail login is off)', () => {
    const phoneLogin = (props: Record<string, unknown> = {}) => renderWithProviders(
      <LoginForm {...noMethods} useLoginByCellphone loginTab='cellphone' {...props} />
    )

    it('draws the phone field and the password, and no e-mail', () => {
      const screen = phoneLogin()
      expect(screen.getByTestId('phone-country-trigger')).toBeTruthy()
      expect(screen.getByText('Phone number')).toBeTruthy()
      expect(screen.getByLabelText('Password')).toBeTruthy()
      expect(screen.queryByLabelText('Email')).toBeNull()
    })

    it('sends the country code and the national number with the password', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
      fireEvent.changeText(screen.getByLabelText('Password'), 'secret')
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      await waitFor(() => expect(handleButtonLoginClick).toHaveBeenCalledTimes(1))
      expect(handleButtonLoginClick).toHaveBeenCalledWith(expect.objectContaining({ password: 'secret', cellphone: '4155552671', country_phone_code: '1' }))
    })

    it('writes the missing phone under its field, with the password\'s, and sends nothing', async () => {
      const handleButtonLoginClick = jest.fn()
      const screen = phoneLogin({ handleButtonLoginClick })
      fireEvent.press(screen.getByRole('button', { name: 'Log in' }))
      expect(await screen.findByText('The field Mobile phone is required.')).toBeTruthy()
      expect(await screen.findByTestId('error-password')).toBeTruthy()
      expect(handleButtonLoginClick).not.toHaveBeenCalled()
    })

    it('offers the e-mail code, which then asks for the e-mail, with a way back to the password', async () => {
      const handleChangeTab = jest.fn()
      const setOtpType = jest.fn()
      const screen = phoneLogin({ useLoginOtp: true, useLoginOtpEmail: true, handleChangeTab, setOtpType })
      fireEvent.press(screen.getByRole('button', { name: 'Email me a login code' }))
      expect(handleChangeTab).toHaveBeenCalledWith('otp')
      expect(setOtpType).toHaveBeenCalledWith('email')
      screen.rerender(
        <LoginForm {...noMethods} useLoginByCellphone useLoginOtp useLoginOtpEmail loginTab='otp' otpType='email' handleChangeTab={handleChangeTab} setOtpType={setOtpType} />
      )
      expect(screen.getByLabelText('Email')).toBeTruthy()
      fireEvent.press(screen.getByText('Log in with your password'))
      expect(handleChangeTab).toHaveBeenLastCalledWith('cellphone')
    })

    describe('the SMS code (Twilio)', () => {
      const twilio = (value: string) => ({ configs: { twilio_service_enabled: { value } } })

      it('draws the "or" line and the outline "Get verification code" button when Twilio is on', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const screen = phoneLogin()
        expect(screen.getByText('or')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'Get verification code' })).toBeTruthy()
      })

      it('takes "true" or "1" for Twilio on, and nothing else', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('true')])
        const on = phoneLogin()
        expect(on.queryByText('or')).toBeTruthy()
        on.unmount()
        ;(useConfig as jest.Mock).mockReturnValue([twilio('0')])
        expect(phoneLogin().queryByText('or')).toBeNull()
      })

      it('asks for the phone under its field when it is empty, and sends no code', () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const handleSendVerifyCode = jest.fn()
        const screen = phoneLogin({ handleSendVerifyCode })
        fireEvent.press(screen.getByRole('button', { name: 'Get verification code' }))
        expect(screen.getByText('The field Mobile phone is required.')).toBeTruthy()
        expect(handleSendVerifyCode).not.toHaveBeenCalled()
      })

      it('sends the code to the phone typed, and the phone verification opens when it went, with its Cancel', async () => {
        ;(useConfig as jest.Mock).mockReturnValue([twilio('1')])
        const handleSendVerifyCode = jest.fn()
        const screen = phoneLogin({ handleSendVerifyCode })
        fireEvent.changeText(screen.getByTestId('phone-input'), '4155552671')
        fireEvent.press(screen.getByRole('button', { name: 'Get verification code' }))
        expect(handleSendVerifyCode).toHaveBeenCalledWith({ country_phone_code: '1', cellphone: '4155552671' })
        screen.rerender(
          <LoginForm
            {...noMethods}
            useLoginByCellphone
            loginTab='cellphone'
            handleSendVerifyCode={handleSendVerifyCode}
            verifyPhoneState={{ loading: false, result: { error: false, result: 'OK' } }}
          />
        )
        expect(screen.getByText('Verify phone')).toBeTruthy()
        expect(screen.getByText(/ending with \*\*71/)).toBeTruthy()
        fireEvent.press(screen.getByRole('button', { name: 'Cancel' }))
        expect(screen.queryByText('Verify phone')).toBeNull()
      })
    })
  })

  describe('what belongs to no field: a notice that stays until the user edits', () => {
    it('shows the server\'s answer whole, in a danger notice and not a toast', () => {
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const message = 'The user or the password is wrong, so the login was refused for this account and this device'
      const { getByTestId, getByText } = renderWithProviders(<LoginForm formState={failed([message, 'second'])} />)
      expect(getByText(message)).toBeTruthy()
      expect(StyleSheet.flatten(getByTestId('login-notice').props.style).backgroundColor)
        .toBe(defaultAppTheme().native.components.alert.variants.danger.background)
      expect(insideScroll(getByTestId('login-notice'))).toBe(true)
      expect(showToast).not.toHaveBeenCalled()
    })

    it('words an error code instead of showing it raw, and shows a text answer as it is', () => {
      const code = renderWithProviders(<LoginForm formState={failed(['ERROR_AUTH_SOMETHING_NEW'])} />)
      expect(code.getByText('Error auth something new')).toBeTruthy()
      code.unmount()
      const text = renderWithProviders(<LoginForm formState={failed('Network request failed')} />)
      expect(text.getByText('Network request failed')).toBeTruthy()
    })

    it('shows nothing while the login runs or when it went through', () => {
      const running = renderWithProviders(<LoginForm formState={{ loading: true, result: { error: true, result: ['old'] } }} />)
      expect(running.queryByTestId('login-notice')).toBeNull()
      running.unmount()
      const fine = renderWithProviders(<LoginForm formState={{ loading: false, result: { error: false } }} />)
      expect(fine.queryByTestId('login-notice')).toBeNull()
    })

    it('stays until a field is edited, and shows the next answer again', () => {
      const props = { handleChangeTab: jest.fn() }
      const { getByLabelText, queryByTestId, rerender } = renderWithProviders(<LoginForm {...props} formState={failed(['Wrong'])} />)
      expect(queryByTestId('login-notice')).toBeTruthy()
      fireEvent.changeText(getByLabelText('Email'), 'ana@store.com')
      expect(queryByTestId('login-notice')).toBeNull()
      rerender(<LoginForm {...props} formState={failed(['Wrong again'])} />)
      expect(queryByTestId('login-notice')).toBeTruthy()
    })

    it('shows the answer to the SMS code request as a notice too', () => {
      const { getByText } = renderWithProviders(
        <LoginForm {...noMethods} useLoginByCellphone loginTab='cellphone' verifyPhoneState={failed(['Twilio is down'])} />
      )
      expect(getByText('Twilio is down')).toBeTruthy()
    })
  })

  describe('reCAPTCHA', () => {
    const v2 = (extra: Record<string, unknown> = {}) => ({
      configs: { security_recaptcha_type: { value: 'v2' }, security_recaptcha_site_key: { value: 'v2-key' }, ...extra }
    })

    it('runs the invisible v3 on the project\'s base url and hands its token to the form', () => {
      ;(useConfig as jest.Mock).mockReturnValue([{
        configs: {
          security_recaptcha_type: { value: 'v3' },
          security_recaptcha_score_v3: { value: 0.5 },
          security_recaptcha_site_key_v3: { value: 'v3-site-key' },
          security_recaptcha_base_url: { value: 'https://project.test' }
        }
      }])
      const handleReCaptcha = jest.fn()
      const { getByTestId } = renderWithProviders(<LoginForm enableReCaptcha handleReCaptcha={handleReCaptcha} />)
      const webview = getByTestId('webview')
      expect(webview.props.source.baseUrl).toBe('https://project.test')
      expect(webview.props.source.html).toContain('render=v3-site-key')
      act(() => webview.props.onMessage({ nativeEvent: { data: JSON.stringify({ type: 'token', token: 'tok-9' }) } }))
      expect(handleReCaptcha).toHaveBeenCalledWith({ code: 'tok-9', version: 'v3' })
    })

    it('shows no reCAPTCHA when the project has it off', () => {
      const { queryByTestId, queryByRole } = renderWithProviders(<LoginForm enableReCaptcha />)
      expect(queryByTestId('webview')).toBeNull()
      expect(queryByRole('checkbox')).toBeNull()
    })

    it('draws the v2 row unchecked, and says under it, not in a toast, that the project has no base url', () => {
      ;(useConfig as jest.Mock).mockReturnValue([v2()])
      const showToast = jest.fn()
      ;(useToast as jest.Mock).mockReturnValue([, { showToast }])
      const { getByRole, getByTestId, queryByTestId } = renderWithProviders(<LoginForm enableReCaptcha />)
      expect(getByRole('checkbox', { name: 'Verify reCAPTCHA' }).props.accessibilityState.checked).toBe(false)
      expect(queryByTestId('error-recaptcha')).toBeNull()
      fireEvent.press(getByRole('checkbox', { name: 'Verify reCAPTCHA' }))
      expect(getByTestId('error-recaptcha').props.children).toBe('The config doesn\'t have recaptcha base url')
      expect(showToast).not.toHaveBeenCalled()
    })

    it('falls back to the v2 check with the server\'s ask to try again, as an info notice', () => {
      ;(useConfig as jest.Mock).mockReturnValue([v2({ security_recaptcha_base_url: { value: 'https://project.test' } })])
      const { getByTestId, getByText } = renderWithProviders(
        <LoginForm enableReCaptcha formState={failed(['ERROR_AUTH_VERIFICATION_CODE'])} />
      )
      expect(getByText('Please try again')).toBeTruthy()
      expect(StyleSheet.flatten(getByTestId('login-notice').props.style).backgroundColor)
        .toBe(defaultAppTheme().native.components.alert.variants.info.background)
    })
  })
})
