import React from 'react'

import { renderPage } from '../../../jest/helpers/renderPage'

jest.mock('@ui', () => require('../../../jest/helpers/mockUi'))

import PrinterConfigure from '../PrinterConfigure'

describe('PrinterConfigure', () => {
  it('renders printer edition in unpadded container', () => {
    const { getByTestId } = renderPage(PrinterConfigure, {
      route: { params: { printer: null } }
    })
    expect(getByTestId('printer-edition')).toBeTruthy()
    expect(getByTestId('container-no-padding')).toBeTruthy()
  })

  it('passes printer from route params', () => {
    const { getByTestId } = renderPage(PrinterConfigure, {
      route: { params: { printer: { model: 'TM-T20III', driver: 'epson' } } }
    })
    expect(getByTestId('printer-edition-model').props.children).toBe('TM-T20III')
  })
})
