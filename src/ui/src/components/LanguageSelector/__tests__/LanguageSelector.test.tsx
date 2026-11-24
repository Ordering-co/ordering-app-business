import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { useLanguage } from '@components'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => require('../../../../../../jest/helpers/profileMocks').buildComponentsMock())

import { LanguageSelector, LanguageSheet } from '..'

const profileMocks = require('../../../../../../jest/helpers/profileMocks')

describe('LanguageSelector', () => {
  beforeEach(() => {
    profileMocks.languageDefaults.handleChangeLanguage = jest.fn()
    profileMocks.languageDefaults.currentLanguage = 'en'
    profileMocks.languageDefaults.languagesState = {
      loading: false,
      languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Español' }, { code: 'pt', name: 'Português' }]
    }
  })

  it('is the profile\'s row: the title and the current language as its value', () => {
    const { getByTestId, getByText } = renderWithProviders(<LanguageSelector />)
    expect(getByTestId('language-selector')).toBeTruthy()
    expect(getByText('Language')).toBeTruthy()
    expect(getByText('English')).toBeTruthy()
  })

  it('opens the sheet with every language by its own name, a check on the current one, and applies a tap at once', () => {
    const { getByTestId, getByText, getAllByText, queryByTestId, getAllByRole, UNSAFE_getAllByProps } = renderWithProviders(<LanguageSelector />)
    fireEvent.press(getByTestId('language-selector'))
    expect(getByText('Español')).toBeTruthy()
    expect(getByText('Português')).toBeTruthy()
    // "English" is the row's value and the sheet's current choice.
    expect(getAllByText('English')).toHaveLength(2)
    expect(queryByTestId('language-selector')).toBeTruthy()
    expect(getAllByRole('button', { selected: true })).toHaveLength(1)
    expect(UNSAFE_getAllByProps({ name: 'checkmark' }).length).toBeGreaterThan(0)
    fireEvent.press(getByText('Español'))
    expect(profileMocks.languageDefaults.handleChangeLanguage).toHaveBeenCalledWith('es')
  })

  // IOS-C8: the API's language has `name` in English and no native name; the sheet shows each language in its own.
  describe('each language by its own name', () => {
    beforeEach(() => {
      profileMocks.languageDefaults.languagesState = {
        loading: false,
        languages: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
          { code: 'es-419-1', name: 'Spanish (Mexico)' },
          { code: 'pt', name: 'Portuguese' },
          { code: 'zh-CN', name: 'Chinese Simplified' },
          { code: 'bg', name: 'Bulgarian Translation' },
          { code: 'xx', name: 'Klingon' }
        ]
      }
    })

    it('lists the server\'s languages, in its order, by their native names, with the server\'s name for a code the app does not know', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<LanguageSelector />)
      fireEvent.press(getByTestId('language-selector'))
      ;['Español', 'Español (Mexico)', 'Português', '简体中文', 'Български', 'Klingon'].forEach((name) => expect(getByText(name)).toBeTruthy())
      ;['Spanish', 'Portuguese', 'Chinese Simplified', 'Bulgarian Translation'].forEach((name) => expect(queryByText(name)).toBeNull())
      fireEvent.press(getByText('Português'))
      expect(profileMocks.languageDefaults.handleChangeLanguage).toHaveBeenCalledWith('pt')
    })

    it('names the current language in its own name on the profile row and the login link, and a screen reader adds the English name', () => {
      profileMocks.languageDefaults.currentLanguage = 'es'
      const original = (useLanguage as jest.Mock).getMockImplementation()
      ;(useLanguage as jest.Mock).mockReturnValue([{ loading: false, dictionary: { SOME_KEY: 'texto' } }, (_key: string, fallback?: string) => fallback ?? _key])
      const row = renderWithProviders(<LanguageSelector />)
      expect(row.getByText('Español')).toBeTruthy()
      row.unmount()
      const link = renderWithProviders(<LanguageSheet variant='link' />)
      expect(link.getByText('Español')).toBeTruthy()
      expect(link.getByLabelText('Language: Español, Spanish')).toBeTruthy()
      ;(useLanguage as jest.Mock).mockReset().mockImplementation(original as any)
    })
  })

  it('is the login screen\'s link in the link variant: the globe and the current language, same sheet', () => {
    const { getByTestId, getByText, getByLabelText } = renderWithProviders(<LanguageSheet variant='link' />)
    expect(getByLabelText('Language: English')).toBeTruthy()
    fireEvent.press(getByTestId('language-selector'))
    fireEvent.press(getByText('Português'))
    expect(profileMocks.languageDefaults.handleChangeLanguage).toHaveBeenCalledWith('pt')
  })

  it('draws nothing with a single language, and tells the profile so', () => {
    profileMocks.languageDefaults.languagesState = { loading: false, languages: [{ code: 'en', name: 'English' }] }
    const onShownChange = jest.fn()
    const { queryByTestId } = renderWithProviders(<LanguageSelector onShownChange={onShownChange} />)
    expect(queryByTestId('language-selector')).toBeNull()
    expect(onShownChange).toHaveBeenLastCalledWith(false)
  })

  it('draws nothing while the languages load', () => {
    profileMocks.languageDefaults.languagesState = { loading: true, languages: [{ code: 'en', name: 'English' }, { code: 'es', name: 'Español' }] }
    const { queryByTestId } = renderWithProviders(<LanguageSelector />)
    expect(queryByTestId('language-selector')).toBeNull()
  })

  it('tells the profile when the row is shown', () => {
    const onShownChange = jest.fn()
    renderWithProviders(<LanguageSelector onShownChange={onShownChange} />)
    expect(onShownChange).toHaveBeenLastCalledWith(true)
  })

  // IOS-C1: the device kept "Spanish", the project has no Spanish texts for the app, every text was English.
  describe('the language the texts are in (not only the stored choice)', () => {
    const t = (_key: string, fallback?: string) => fallback ?? _key
    const withDictionary = (dictionary: Record<string, string>, loading = false) =>
      (useLanguage as jest.Mock).mockReturnValue([{ loading, dictionary }, t])
    afterEach(() => (useLanguage as jest.Mock).mockReset())
    beforeEach(() => { profileMocks.languageDefaults.currentLanguage = 'es' })

    it('shows English when the stored language has no texts (an empty dictionary): the screen is in the fallbacks', () => {
      withDictionary({})
      const { getByLabelText, queryByText } = renderWithProviders(<LanguageSelector variant='link' />)
      expect(getByLabelText('Language: English')).toBeTruthy()
      expect(queryByText('Español')).toBeNull()
    })

    it('shows the stored language when its dictionary has texts', () => {
      withDictionary({ LOG_IN: 'Iniciar sesión' })
      const { getByLabelText } = renderWithProviders(<LanguageSelector variant='link' />)
      expect(getByLabelText('Language: Español')).toBeTruthy()
    })

    it('keeps the stored language while the texts load (the dictionary is empty until they arrive)', () => {
      withDictionary({}, true)
      const { getByLabelText } = renderWithProviders(<LanguageSelector variant='link' />)
      expect(getByLabelText('Language: Español')).toBeTruthy()
    })

    it('checks the English entry in the sheet and the profile row names it too', () => {
      withDictionary({})
      const { getByText, getAllByText } = renderWithProviders(<LanguageSelector />)
      expect(getByText('English')).toBeTruthy()
      fireEvent.press(getByText('English'))
      expect(getAllByText('English')).toHaveLength(2)
    })
  })
})
