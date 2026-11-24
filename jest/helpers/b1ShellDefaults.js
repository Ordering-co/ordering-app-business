/**
 * Defaults + controller renderer for B1 shell UI wired exports.
 */
/* eslint-env jest */

const React = require('react')

const renderUiController = (defaults = {}) => (props) => {
  const UI = props.UIComponent
  if (!UI) return null
  const { UIComponent, ...rest } = props
  return React.createElement(UI, { ...defaults, ...rest })
}

const languageSelectorDefaults = {
  languagesState: {
    loading: false,
    languages: [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' }
    ]
  },
  currentLanguage: 'en',
  handleChangeLanguage: jest.fn()
}

module.exports = {
  renderUiController,
  languageSelectorDefaults
}
