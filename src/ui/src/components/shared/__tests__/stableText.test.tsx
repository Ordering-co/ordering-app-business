import React from 'react'
import { Text } from 'react-native'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
jest.mock('@components', () => require('../../../../../../jest/helpers/mockOrdering'))
import StableText from '../StableText'

/** A one-line label in a fixed cell shrinks to its line instead of ending in an ellipsis (the review's "Goo...", the printer tiles). */
describe('StableText', () => {
  const texts = (view: any) => view.UNSAFE_getAllByType(Text)

  it('shrinks a one-line label to fit, the hidden copy that holds its room and the visible one alike', () => {
    const view = renderWithProviders(<StableText reserveWeight={600} numberOfLines={1}>Good</StableText>)
    const [hidden, shown] = texts(view)
    for (const node of [hidden, shown]) {
      expect(node.props.adjustsFontSizeToFit).toBe(true)
      expect(node.props.minimumFontScale).toBeGreaterThan(0.5)
      expect(node.props.minimumFontScale).toBeLessThan(1)
      expect(node.props.numberOfLines).toBe(1)
    }
  })

  it('leaves a label with no line limit as it is', () => {
    const view = renderWithProviders(<StableText reserveWeight={600}>Good</StableText>)
    for (const node of texts(view)) expect(node.props.adjustsFontSizeToFit).toBeUndefined()
  })

  it('can be told not to', () => {
    const view = renderWithProviders(<StableText reserveWeight={600} numberOfLines={1} fit={false}>Good</StableText>)
    for (const node of texts(view)) expect(node.props.adjustsFontSizeToFit).toBeUndefined()
  })
})
