import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

const store = {
  printers: [],
  auto_print_after_accept_order: false
}

jest.mock('../../../providers/StoreUtil', () => ({
  _retrieveStoreData: jest.fn(async (key) => {
    if (key === 'printers') return store.printers
    if (key === 'auto_print_after_accept_order') return store.auto_print_after_accept_order
    return null
  }),
  _setStoreData: jest.fn(async (key, value) => {
    store[key] = value
    return null
  })
}))

jest.mock('toggle-switch-react-native', () => {
  const React = require('react')
  const { Pressable, Text } = require('react-native')
  return (props: any) =>
    React.createElement(
      Pressable,
      {
        testID: 'toggle-switch',
        onPress: () => props.onToggle?.(!props.isOn)
      },
      React.createElement(Text, null, props.isOn ? 'on' : 'off')
    )
})

jest.mock('@ui', () => {
  const { buildB6PrinterUiMock } = require('../../../../../../jest/helpers/b6PrinterUiMock')
  return buildB6PrinterUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' }
  }
})

import { PrinterSettings } from '..'
import { _setStoreData } from '../../../providers/StoreUtil'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  samplePrinterBt,
  samplePrinterEpsonLan,
  printerSettingsDefaults
} from '../../../../../../jest/helpers/b6PrinterDefaults'

describe('PrinterSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    store.printers = []
    store.auto_print_after_accept_order = false
  })

  it('renders empty state when no printers', async () => {
    const { getByText } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} />
    )
    await waitFor(() => {
      expect(getByText('No printers configured')).toBeTruthy()
      expect(getByText('Add printer')).toBeTruthy()
    })
  })

  it('renders printer list and auto-print toggle', async () => {
    store.printers = [samplePrinterBt]
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} />
    )
    await waitFor(() => {
      expect(getByText('Kitchen printer')).toBeTruthy()
      expect(getByText('Auto print after accepting order')).toBeTruthy()
      expect(getByTestId('toggle-switch')).toBeTruthy()
    })
  })

  it('migrates legacy printers without driver to star on load', async () => {
    store.printers = [{ model: 'mPOP', nickname: 'Legacy', type: 1, bt: 'AA:BB' }]
    const { getByText } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} />
    )
    await waitFor(() => expect(getByText('Legacy')).toBeTruthy())
  })

  it('goes back via navbar', async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const { getByText, UNSAFE_getAllByType } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} navigation={navigation} />
    )
    await waitFor(() => expect(getByText('Printer Settings')).toBeTruthy())
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(navigation.goBack).toHaveBeenCalled()
  })

  it('deletes printer from list', async () => {
    store.printers = [samplePrinterBt]
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} />
    )
    await waitFor(() => expect(getByText('Kitchen printer')).toBeTruthy())
    fireEvent.press(getByTestId('printer-delete-0'))
    await waitFor(() => {
      expect(_setStoreData).toHaveBeenCalledWith('printers', [])
    })
  })

  it('deletes the selected same-model printer, not the first row', async () => {
    const kitchenA = {
      ...samplePrinterEpsonLan,
      nickname: 'Kitchen A',
      ip: '10.0.0.1',
      portName: '10.0.0.1'
    }
    const kitchenB = {
      ...samplePrinterEpsonLan,
      nickname: 'Kitchen B',
      ip: '10.0.0.2',
      portName: '10.0.0.2'
    }
    store.printers = [kitchenA, kitchenB]

    const { getByText, getByTestId } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} />
    )
    await waitFor(() => expect(getByText('Kitchen B')).toBeTruthy())
    fireEvent.press(getByTestId('printer-delete-1'))
    await waitFor(() => {
      expect(_setStoreData).toHaveBeenCalledWith('printers', [kitchenA])
    })
  })

  it('navigates to PrinterConfigure when adding a printer', async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const { getByText } = renderWithProviders(
      <PrinterSettings {...printerSettingsDefaults} navigation={navigation} />
    )
    await waitFor(() => expect(getByText('Add printer')).toBeTruthy())
    fireEvent.press(getByText('Add printer'))
    expect(navigation.navigate).toHaveBeenCalledWith('PrinterConfigure', { printer: null })
  })
})
