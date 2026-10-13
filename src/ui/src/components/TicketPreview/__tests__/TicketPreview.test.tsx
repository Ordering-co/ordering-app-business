import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../usePrinterCommands', () => {
  const { usePrinterCommandsMockApi } = require('../../../../../../jest/helpers/b6PrinterDefaults')
  return { usePrinterCommands: () => usePrinterCommandsMockApi }
})

jest.mock('@ui', () => {
  const { buildB6PrinterUiMock } = require('../../../../../../jest/helpers/b6PrinterUiMock')
  return buildB6PrinterUiMock()
})

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useUtils: jest.fn(() => [{
      optimizeImage: (url: string) => url,
      parsePrice: (v: any) => `$${Number(v ?? 0).toFixed(2)}`,
      parseNumber: (v: any) => Number(v ?? 0),
      parseDate: (d: any) => String(d ?? '')
    }, {}]),
    useConfig: jest.fn(() => [{
      loading: false,
      configs: {
        driver_tip_type: { value: '1' },
        driver_tip_use_custom: { value: '0' }
      }
    }])
  }
})

import { TicketPreview } from '..'
import { usePrinterCommands } from '../usePrinterCommands'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { ticketPreviewDefaults } from '../../../../../../jest/helpers/b6PrinterDefaults'

describe('TicketPreview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders ticket preview title', async () => {
    const { getByText } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} />
    )
    expect(getByText('Ticket Preview')).toBeTruthy()
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
  })

  it('shows print button after bitmap is ready', async () => {
    const { getByText } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} />
    )
    await waitFor(() => {
      expect(getByText('Print ticket')).toBeTruthy()
    })
  })

  it('does not print on mount when opened as preview', async () => {
    const { printButton } = usePrinterCommands()
    const { getByText } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} />
    )
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    expect(printButton).not.toHaveBeenCalled()
  })

  it('prints on mount after accept when shouldPrintOnMount is set', async () => {
    const { printButton } = usePrinterCommands()
    const { getByText } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} shouldPrintOnMount />
    )
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    await waitFor(() => {
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({
          driver: 'star',
          type: 1,
          portName: '00:11:62:06:CA:4D'
        })
      )
    })
  })

  it('prints via print button', async () => {
    const { printButton } = usePrinterCommands()
    const { getByText } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} />
    )
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({
          driver: 'star',
          type: 1,
          portName: '00:11:62:06:CA:4D'
        })
      )
    })
  })

  it('passes epson driver and model into printButton', async () => {
    const { printButton } = usePrinterCommands()
    const { samplePrinterEpsonLan } = require('../../../../../../jest/helpers/b6PrinterDefaults')
    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[{ ...samplePrinterEpsonLan }]}
      />
    )
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({
          driver: 'epson',
          deviceName: 'TM-T20III',
          ip: '192.168.1.80',
          type: 2
        })
      )
    })
  })

  it('uses the configured 58 mm width for text printers', async () => {
    const { generateCommands, printButton } = usePrinterCommands()
    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[{
          ...ticketPreviewDefaults.printerSettings[0],
          paperWidthMm: 58
        }]}
      />
    )

    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(generateCommands).toHaveBeenCalledWith(ticketPreviewDefaults.order, 24)
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({
          commandsText: expect.any(String),
          ticketWidth: 384
        })
      )
    })
  })

  it('builds 58 mm bitmaps with compact font and canvas width', async () => {
    const { createBitmapFromText, printButton } = usePrinterCommands()
    const { samplePrinterLan } = require('../../../../../../jest/helpers/b6PrinterDefaults')
    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[{
          ...samplePrinterLan,
          paperWidthMm: 58
        }]}
      />
    )

    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(createBitmapFromText).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.anything(),
        16,
        384
      )
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({
          commandsText: null,
          image: 'dGVzdA==',
          ticketWidth: 384
        })
      )
    })
  })

  it('prints mixed star and epson lists with per-driver routing', async () => {
    const { printButton } = usePrinterCommands()
    const {
      samplePrinterBt,
      samplePrinterEpsonLan
    } = require('../../../../../../jest/helpers/b6PrinterDefaults')
    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[
          { ...samplePrinterBt },
          { ...samplePrinterEpsonLan }
        ]}
      />
    )
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({ driver: 'star', type: 1, showAlert: false })
      )
      expect(printButton).toHaveBeenCalledWith(
        expect.objectContaining({ driver: 'epson', type: 2, deviceName: 'TM-T20III', showAlert: false })
      )
    })
  })

  it('does not toast success when an earlier printer failed', async () => {
    const { printButton } = usePrinterCommands()
    const { useToast } = require('@components')
    const [, { showToast }] = useToast()
    const {
      samplePrinterBt,
      samplePrinterEpsonLan
    } = require('../../../../../../jest/helpers/b6PrinterDefaults')

    printButton
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[
          { ...samplePrinterBt },
          { ...samplePrinterEpsonLan }
        ]}
      />
    )

    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => expect(printButton).toHaveBeenCalledTimes(2))
    expect(showToast).not.toHaveBeenCalledWith('info', 'Order printed', 3000)
  })

  it('toasts success once when every printer in the run succeeded', async () => {
    const { printButton } = usePrinterCommands()
    const { useToast } = require('@components')
    const [, { showToast }] = useToast()
    const {
      samplePrinterBt,
      samplePrinterEpsonLan
    } = require('../../../../../../jest/helpers/b6PrinterDefaults')

    printButton.mockResolvedValue(true)

    const { getByText } = renderWithProviders(
      <TicketPreview
        {...ticketPreviewDefaults}
        printerSettings={[
          { ...samplePrinterBt },
          { ...samplePrinterEpsonLan }
        ]}
      />
    )

    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
    fireEvent.press(getByText('Print ticket'))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('info', 'Order printed', 3000)
    })
  })

  it('goes back via navigation', async () => {
    const navigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
      canGoBack: jest.fn(() => true)
    }
    const { getByText, UNSAFE_getAllByType } = renderWithProviders(
      <TicketPreview {...ticketPreviewDefaults} navigation={navigation} />
    )
    const { TouchableOpacity } = require('react-native')
    fireEvent.press(UNSAFE_getAllByType(TouchableOpacity)[0])
    expect(navigation.goBack).toHaveBeenCalled()
    await waitFor(() => expect(getByText('Print ticket')).toBeTruthy())
  })
})
