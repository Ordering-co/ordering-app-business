/**
 * Controller defaults for B2 auth UI wired exports.
 */
/* eslint-env jest */

const noop = () => {}

const loginFormDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  loginTab: 'email',
  formState: { loading: false, result: {} },
  useLoginByEmail: true,
  useLoginByCellphone: false,
  useLoginOtp: false,
  useLoginOtpEmail: false,
  useLoginOtpCellphone: false,
  handleChangeTab: noop,
  handleButtonLoginClick: jest.fn(),
  onNavigationRedirect: jest.fn(),
  enableReCaptcha: false,
  otpType: 'email',
  setOtpType: noop,
  generateOtpCode: jest.fn(),
  handleSendVerifyCode: jest.fn(),
  verifyPhoneState: { loading: false, result: {} },
  checkPhoneCodeState: { loading: false, result: {} },
  setCheckPhoneCodeState: jest.fn(),
  handleCheckPhoneCode: jest.fn(),
  allowedLevels: [0, 2],
  useRootPoint: false,
  notificationState: { loading: false }
}

const forgotPasswordDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  formState: { loading: false, result: {} },
  handleButtonForgotPasswordClick: jest.fn()
}

const sessionsDefaults = {
  navigation: { goBack: jest.fn(), canGoBack: jest.fn(() => true) },
  sessionsList: {
    loading: false,
    sessions: [
      { id: 1, created_at: '2026-01-01', valid_thru: '2026-12-31', current: true },
      { id: 2, created_at: '2026-02-01', valid_thru: '2026-12-31', current: false }
    ]
  },
  actionState: { loading: false },
  handleDeleteSession: jest.fn(),
  handleDeleteAllSessions: jest.fn()
}

module.exports = {
  loginFormDefaults,
  forgotPasswordDefaults,
  sessionsDefaults,
}
