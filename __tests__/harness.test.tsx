import React from 'react'
import { Text } from 'react-native'
import { renderWithProviders } from '../jest/helpers/renderWithProviders'

describe('Jest harness (F1)', () => {
  it('renders with ThemeProvider and SafeAreaProvider', () => {
    const { getByText } = renderWithProviders(<Text>Harness ok</Text>)
    expect(getByText('Harness ok')).toBeTruthy()
  })

  it('mocks @components useLanguage', () => {
    const { useLanguage } = require('@components')
    const [, translate] = useLanguage()
    expect(translate('TEST_KEY', 'Fallback')).toBe('Fallback')
  })
})
