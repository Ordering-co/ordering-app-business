/**
 * The `@components` stand-in of the profile area's tests: the shared hook mocks plus the controllers the profile
 * screens wrap (each renders its UI with the defaults below and the props it is given).
 */
/* eslint-env jest */
const React = require('react')
const mockOrdering = require('./mockOrdering')

const renderUiController = (defaults = {}) => (props) => {
  const UI = props.UIComponent
  if (!UI) return null
  const { UIComponent, ...rest } = props
  return React.createElement(UI, { ...defaults, ...rest })
}

const languageDefaults = {
  languagesState: {
    loading: false,
    languages: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' }
    ]
  },
  currentLanguage: 'en',
  handleChangeLanguage: jest.fn()
}

const sessionsDefaults = {
  sessionsList: { loading: false, error: null, sessions: [] },
  actionState: { loading: false, error: null },
  handleDeleteSession: jest.fn(),
  handleDeleteAllSessions: jest.fn()
}

const logoutDefaults = {
  handleLogoutClick: jest.fn(() => Promise.resolve(true)),
  formState: { loading: false, result: { error: false } }
}

/** `overrides` replaces any member (a controller or a hook mock). */
const buildComponentsMock = (overrides = {}) => ({
  ...mockOrdering,
  LanguageSelector: renderUiController(languageDefaults),
  Sessions: renderUiController(sessionsDefaults),
  LogoutAction: renderUiController(logoutDefaults),
  UserFormDetails: renderUiController({}),
  ...overrides
})

module.exports = { renderUiController, languageDefaults, sessionsDefaults, logoutDefaults, buildComponentsMock }
