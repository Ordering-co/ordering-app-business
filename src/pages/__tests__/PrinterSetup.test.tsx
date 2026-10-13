import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import PrinterSetup from '../PrinterSetup'

describe('PrinterSetup', () => {
  it('renders printer settings in unpadded container', () => {
    const { getByTestId } = renderPage(PrinterSetup)
    expect(getByTestId('printer-settings')).toBeTruthy()
    expect(getByTestId('container-no-padding')).toBeTruthy()
  })
})
