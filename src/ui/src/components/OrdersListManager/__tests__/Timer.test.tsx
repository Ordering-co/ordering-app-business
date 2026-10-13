import React from 'react'
import { StyleSheet } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => ({
  useLanguage: () => [null, (_key: string, fallback: string) => fallback],
  useUtils: () => [{ parseDate: (v: any) => v }],
  useConfig: () => [{
    configs: {
      order_deadlines_delayed_time: { value: '60' }
    }
  }]
}))

import { Timer } from '../utils'

describe('SLA Timer', () => {
  it('shows the configured delay coming from project settings', () => {
    const { getByText } = renderWithProviders(<Timer />)

    expect(getByText('60')).toBeTruthy()
    expect(getByText('min')).toBeTruthy()
  })

  it('centers the value inside the box with balanced padding', () => {
    const { getByText } = renderWithProviders(<Timer />)
    const flattened = StyleSheet.flatten(getByText('60').props.style)

    expect(flattened.textAlign).toBe('center')
    expect(flattened.paddingVertical).toBe(6)
    expect(flattened.paddingTop).toBeUndefined()
    expect(flattened.minWidth).toBe(58)
  })
})
