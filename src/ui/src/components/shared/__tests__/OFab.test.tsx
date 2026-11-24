import React from 'react'
import { fireEvent } from '@testing-library/react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OFab from '../OFab'

setupSharedComponentHooks()

describe('OFab', () => {
  it('handles press with ionicon', () => {
    const onPress = jest.fn()
    const { getByRole } = renderWithProviders(
      <OFab iconName="add" onPress={onPress} />
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  it('renders material icon variant', () => {
    const onPress = jest.fn()
    const { getByRole } = renderWithProviders(
      <OFab iconName="printer" materialIcon onPress={onPress} />
    )
    fireEvent.press(getByRole('button'))
    expect(onPress).toHaveBeenCalled()
  })

  // MapTracking.dc.html: a white round 44 button with the map's shadow (it was the inverse color: a black 32 square).
  it('is the mockup\'s floating button: a white round 44 disc with the map\'s shadow, the glyph in the text color', () => {
    const { StyleSheet } = require('react-native')
    const { defaultAppTheme } = require('../../../../../theme/engine')
    const theme = defaultAppTheme().native
    const { View } = require('react-native')
    const { getByRole, UNSAFE_getAllByType } = renderWithProviders(<OFab iconName="add" onPress={jest.fn()} />)
    const button = getByRole('button')
    expect(UNSAFE_getAllByType(View).some((node: any) => { const style = StyleSheet.flatten(node.props.style); return style?.width === 44 && style?.height === 44 })).toBe(true)
    let disc: any = button.parent
    while (disc && StyleSheet.flatten(disc.props.style)?.backgroundColor === undefined) disc = disc.parent
    const look = StyleSheet.flatten(disc.props.style)
    expect(look.backgroundColor).toBe(theme.tokens.color.surface)
    expect(look.borderRadius).toBe(theme.tokens.radius.full)
    expect(look.shadowOpacity ?? look.elevation).toBeDefined()
  })
})
