import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { Platform } from 'react-native'
import { fireEvent, waitFor } from '@testing-library/react-native'

const mockDiscoveryPrinterPort = jest.fn()

jest.mock('../../TicketPreview/usePrinterCommands', () => {
  const { usePrinterCommandsMockApi } = require('../../../../../../jest/helpers/b6PrinterDefaults')
  return {
    usePrinterCommands: () => ({
      ...usePrinterCommandsMockApi,
      discoveryPrinterPort: (...args: any[]) => mockDiscoveryPrinterPort(...args)
    })
  }
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

import { PrinterEdition } from '..'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  printerEditionAddDefaults,
  printerEditionEditDefaults,
  samplePrinterEpsonLan
} from '../../../../../../jest/helpers/b6PrinterDefaults'

describe('PrinterEdition', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDiscoveryPrinterPort.mockResolvedValue([])
  })

  it('renders configure header, brand chips and select printer', () => {
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    expect(getByText('Printer Configure')).toBeTruthy()
    expect(getByText('Star Micronics')).toBeTruthy()
    expect(getByText('Epson')).toBeTruthy()
    expect(getByTestId('select-dropdown')).toBeTruthy()
    expect(getByText('Select printer')).toBeTruthy()
  })

  it('shows nickname and connection type after selecting Star model', async () => {
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => {
      expect(getByText(/Nickname/)).toBeTruthy()
      expect(getByText(/Connection type/)).toBeTruthy()
      expect(getByText('Via Bluetooth')).toBeTruthy()
      expect(getByText('Via LAN / Wi‑Fi')).toBeTruthy()
    })
  })

  it('shows USB connection for Epson brand', async () => {
    const { getByText, getByTestId, queryByText } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => {
      expect(getByText('TM-T20III')).toBeTruthy()
      expect(getByText('Via USB')).toBeTruthy()
      expect(queryByText('Via LAN / Wi‑Fi')).toBeTruthy()
    })
  })

  it('persists epson driver when saving LAN printer', async () => {
    const handleChangePrinter = jest.fn()
    const { getByText, getByTestId, getByPlaceholderText } = renderWithProviders(
      <PrinterEdition
        {...printerEditionAddDefaults}
        handleChangePrinter={handleChangePrinter}
      />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => expect(getByText('Via LAN / Wi‑Fi')).toBeTruthy())
    fireEvent.press(getByText('58 mm'))
    fireEvent.press(getByText('Via LAN / Wi‑Fi'))
    fireEvent.changeText(getByPlaceholderText('Ip address'), '192.168.1.80')
    fireEvent.press(getByText('Save Printer'))
    await waitFor(() => {
      expect(handleChangePrinter).toHaveBeenCalled()
      const payload = handleChangePrinter.mock.calls[0][0]
      expect(payload.item.driver).toBe('epson')
      expect(payload.item.model).toBe('TM-T20III')
      expect(payload.item.paperWidthMm).toBe(58)
      expect(payload.type).toBe(2)
    })
  })

  it('renders edit mode with existing printer model', () => {
    const { getByText } = renderWithProviders(
      <PrinterEdition {...printerEditionEditDefaults} />
    )
    expect(getByText('Printer Configure')).toBeTruthy()
    expect(getByText('mPOP')).toBeTruthy()
  })

  it('renders edit mode for Epson printer', () => {
    const { getByText } = renderWithProviders(
      <PrinterEdition
        {...printerEditionEditDefaults}
        printer={{ ...samplePrinterEpsonLan, index: 0 }}
      />
    )
    expect(getByText('Epson')).toBeTruthy()
    expect(getByText('TM-T20III')).toBeTruthy()
    expect(getByText('Via USB')).toBeTruthy()
  })

  it('discovers Epson Bluetooth printers via search icon', async () => {
    mockDiscoveryPrinterPort.mockResolvedValue([
      { connectionSettings: { identifier: '00:22:15:7D:70:9C' } }
    ])
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => expect(getByText('Via Bluetooth')).toBeTruthy())
    fireEvent.press(getByText('Via Bluetooth'))
    fireEvent.press(getByTestId('fa-search'))
    await waitFor(() => {
      expect(mockDiscoveryPrinterPort).toHaveBeenCalledWith(1, 'epson')
    })
  })

  it('shows permission denied message when Epson discovery fails', async () => {
    mockDiscoveryPrinterPort.mockResolvedValue(
      'Bluetooth permission is required to find printers.'
    )
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => expect(getByText('Via Bluetooth')).toBeTruthy())
    fireEvent.press(getByText('Via Bluetooth'))
    fireEvent.press(getByTestId('fa-search'))
    await waitFor(() => {
      expect(getByText('Bluetooth permission is required to find printers.')).toBeTruthy()
    })
  })

  it('shows iOS unavailable copy for Epson USB', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'ios'
    const { getByText, getByTestId, queryByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => expect(getByText('Via USB')).toBeTruthy())
    fireEvent.press(getByText('Via USB'))
    await waitFor(() => {
      expect(getByText('USB printing is available on Android only.')).toBeTruthy()
      expect(queryByTestId('fa-search')).toBeNull()
    })
    Platform.OS = originalOs
  })

  it('shows USB search on Android for Epson', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'android'
    const { getByText, getByTestId } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} />
    )
    fireEvent.press(getByText('Epson'))
    fireEvent.press(getByTestId('select-option-0'))
    await waitFor(() => expect(getByText('Via USB')).toBeTruthy())
    fireEvent.press(getByText('Via USB'))
    await waitFor(() => {
      expect(getByTestId('fa-search')).toBeTruthy()
    })
    Platform.OS = originalOs
  })

  it('calls onClose from back control', () => {
    const onClose = jest.fn()
    const { UNSAFE_getAllByType } = renderWithProviders(
      <PrinterEdition {...printerEditionAddDefaults} onClose={onClose} />
    )
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(onClose).toHaveBeenCalled()
  })
})
