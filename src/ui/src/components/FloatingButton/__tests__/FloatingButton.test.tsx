import React from 'react'
import { fireEvent } from '@testing-library/react-native'

import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  const { renderUiController } = require('../../../../../../jest/helpers/b1ShellDefaults')
  return {
    ...mockOrdering,
    FloatingButton: renderUiController({})
  }
})

import { FloatingButton } from '..'

describe('FloatingButton', () => {
  it('handles primary button click', () => {
    const firstButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton btnText="Accept order" firstButtonClick={firstButtonClick} />
    )
    fireEvent.press(getByText('Accept order'))
    expect(firstButtonClick).toHaveBeenCalled()
  })

  it('renders secondary button when enabled', () => {
    const secondButtonClick = jest.fn()
    const { getByText } = renderWithProviders(
      <FloatingButton
        btnText="Accept"
        secondBtnText="Reject"
        secondButton
        firstButtonClick={jest.fn()}
        secondButtonClick={secondButtonClick}
      />
    )
    fireEvent.press(getByText('Reject'))
    expect(secondButtonClick).toHaveBeenCalled()
  })

  it('hides reject buttons when isHideRejectButtons is true', () => {
    const { queryByText } = renderWithProviders(
      <FloatingButton
        btnText="Hidden"
        isHideRejectButtons
        firstButtonClick={jest.fn()}
      />
    )
    expect(queryByText('Hidden')).toBeNull()
  })
})
