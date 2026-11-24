import React from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OModal from '../OModal'

setupSharedComponentHooks()

describe('OModal page width', () => {
  const column = (ui: React.ReactElement, platform: 'phone' | 'tablet') => {
    const view = renderWithProviders(ui, { platform })
    return StyleSheet.flatten(view.getByTestId('page-body').parent!.parent!.props.style)
  }
  const page = (fullWidth?: boolean) => <OModal open entireModal customClose fullWidth={fullWidth}><View testID='page-body' /></OModal>

  it('keeps the stack screens\' column on a tablet, and a map page (fullWidth) takes the whole width (IPAD2-C4)', () => {
    expect(column(page(), 'tablet').maxWidth).toBe(600)
    expect(column(page(true), 'tablet').maxWidth).toBe('100%')
  })
})

describe('OModal', () => {
  it('renders title, subtitle, and children', () => {
    const onClose = jest.fn()
    const { getByText } = renderWithProviders(
      <OModal open title="Modal title" subtitle="Subtitle" onClose={onClose}>
        <Text>Modal body</Text>
      </OModal>
    )
    expect(getByText('Modal title')).toBeTruthy()
    expect(getByText('Modal body')).toBeTruthy()
  })

  it('renders on ios and android', () => {
    Platform.OS = 'ios'
    const { getByText: getIos } = renderWithProviders(
      <OModal open title="iOS modal" onClose={jest.fn()} />
    )
    expect(getIos('iOS modal')).toBeTruthy()

    Platform.OS = 'android'
    const { getByText: getAndroid } = renderWithProviders(
      <OModal open title="Android modal" onClose={jest.fn()} isTransparent />
    )
    expect(getAndroid('Android modal')).toBeTruthy()
  })
})
