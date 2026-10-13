import React from 'react'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
const { iconSource, setupSharedComponentHooks } = require('../../../../../../jest/helpers/businessSharedTestSetup')
import OText from '../OText'

setupSharedComponentHooks()

describe('OText', () => {
  it('renders children with preset and size', () => {
    const { getByText } = renderWithProviders(
      <>
        <OText preset="body">Body text</OText>
        <OText size={18} weight="700">Title</OText>
      </>
    )
    expect(getByText('Body text')).toBeTruthy()
    expect(getByText('Title')).toBeTruthy()
  })
})
