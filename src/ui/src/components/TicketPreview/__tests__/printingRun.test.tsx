import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { waitFor } from '@testing-library/react-native'

jest.mock('../../../../../printing/usePrinterCommands', () => {
  const { usePrinterCommandsMockApi } = require('../../../../../../jest/helpers/b6PrinterDefaults')
  return { usePrinterCommands: () => usePrinterCommandsMockApi }
})

const mockShowToast = jest.fn()

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useToast: () => [null, { showToast: mockShowToast }]
  }
})

import { usePrinting } from '../../../../../printing/usePrinting'
import { usePrinterCommands } from '../../../../../printing/usePrinterCommands'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import {
  sampleTicketOrder,
  samplePrinterBt,
  samplePrinterEpsonLan
} from '../../../../../../jest/helpers/b6PrinterDefaults'

// What prints an accepted order on the given printers: the facade's print with its banner, and its host.
const TicketAutoPrint = ({ order, printerSettings, onDone }: any) => {
  const printing = usePrinting()
  React.useEffect(() => {
    printing.print({ order, printers: printerSettings, banner: true }).finally(() => onDone?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <>{printing.host}</>
}

describe('printing an order on a list of printers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { printButton } = usePrinterCommands()
    ;(printButton as jest.Mock).mockResolvedValue(true)
  })

  it('prints on every configured printer without showing a print button', async () => {
    const { printButton } = usePrinterCommands()
    const onDone = jest.fn()
    const { queryByText } = renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[samplePrinterBt, samplePrinterEpsonLan]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
    expect(printButton).toHaveBeenCalledTimes(2)
    expect(printButton).toHaveBeenCalledWith(
      expect.objectContaining({ driver: 'star', type: 1, showAlert: false })
    )
    expect(printButton).toHaveBeenCalledWith(
      expect.objectContaining({ driver: 'epson', type: 2, showAlert: false })
    )
    expect(queryByText('Print ticket')).toBeNull()
  })

  it('shows the printed toast for the run, and no error toast, when every printer succeeds', async () => {
    const onDone = jest.fn()
    renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[samplePrinterBt, samplePrinterEpsonLan]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    // One toast per printer (the toast has one slot, so the user sees "Order printed" once, the last replacing the first).
    expect(mockShowToast.mock.calls.map((call: any[]) => call[0])).toEqual(['info', 'info'])
    expect(mockShowToast.mock.calls.every((call: any[]) => call[1] === 'Order printed')).toBe(true)
  })

  it('shows that the ticket is printing on the order screen until it finishes', async () => {
    const { printButton } = usePrinterCommands()
    let finishPrint: (value: boolean) => void = () => {}
    ;(printButton as jest.Mock).mockImplementationOnce(
      () => new Promise<boolean>((resolve) => { finishPrint = resolve })
    )
    const onDone = jest.fn()
    const { getByText, queryByText } = renderWithProviders(
      <TicketAutoPrint order={sampleTicketOrder} printerSettings={[samplePrinterEpsonLan]} onDone={onDone} />
    )

    await waitFor(() => expect(getByText('Printing ticket...')).toBeTruthy())
    expect(onDone).not.toHaveBeenCalled()

    finishPrint(true)

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    await waitFor(() => expect(queryByText('Printing ticket...')).toBeNull())
    expect(mockShowToast.mock.calls.map((call: any[]) => call[1])).toEqual(['Order printed'])
  })

  it('draws the bitmap for image printers before printing', async () => {
    const { printButton, createBitmapFromText } = usePrinterCommands()
    const onDone = jest.fn()
    renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[{ ...samplePrinterBt, model: 'TSP100', printMode: 'appendBitmapText' }]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(createBitmapFromText).toHaveBeenCalled()
    expect(printButton).toHaveBeenCalledWith(
      expect.objectContaining({ driver: 'star', image: 'dGVzdA==', commandsText: null })
    )
  })

  it('tells the user when the ticket could not be prepared', async () => {
    const { createBitmapFromText } = usePrinterCommands()
    ;(createBitmapFromText as jest.Mock).mockRejectedValueOnce(new Error('canvas failed'))
    const onDone = jest.fn()
    renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[{ ...samplePrinterBt, model: 'TSP100', printMode: 'appendBitmapText' }]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(mockShowToast).toHaveBeenCalledWith('error', 'Order not printed, connection failed', 3000)
  })

  it('builds generic tickets at the full printer width', async () => {
    const { generateCommands } = usePrinterCommands()
    const onDone = jest.fn()
    const generic = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, portName: 'dev-1' }
    renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[{ ...generic, paperWidthMm: 58 }, { ...generic, paperWidthMm: 80 }]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const { generateGenericCommands } = usePrinterCommands()
    expect(generateGenericCommands).toHaveBeenCalledWith(sampleTicketOrder, 32, expect.anything())
    expect(generateGenericCommands).toHaveBeenCalledWith(sampleTicketOrder, 48, expect.anything())
    expect(generateCommands).not.toHaveBeenCalled()
  })

  it('keeps Star and Epson tickets at their current width', async () => {
    const { generateCommands } = usePrinterCommands()
    const onDone = jest.fn()
    renderWithProviders(
      <TicketAutoPrint
        order={sampleTicketOrder}
        printerSettings={[{ ...samplePrinterBt, paperWidthMm: 58 }, samplePrinterEpsonLan]}
        onDone={onDone}
      />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((generateCommands as jest.Mock).mock.calls).toEqual([[sampleTicketOrder, 24], [sampleTicketOrder, 37]])
  })

  it('applies the print options saved on this phone to generic printers only', async () => {
    const { saveTicketPrintOptions, DEFAULT_TICKET_PRINT_OPTIONS } = require('../../../../../printing/ticketPrintOptions')
    await saveTicketPrintOptions({ ...DEFAULT_TICKET_PRINT_OPTIONS, payments: false, customerSection: false })
    const { generateCommands, generateGenericCommands } = usePrinterCommands()
    const generic = { model: 'ESC/POS (Bluetooth)', driver: 'generic', printMode: 'append', type: 1, portName: 'dev-1', paperWidthMm: 58 }
    const onDone = jest.fn()
    renderWithProviders(
      <TicketAutoPrint order={sampleTicketOrder} printerSettings={[generic, samplePrinterEpsonLan]} onDone={onDone} />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(generateGenericCommands).toHaveBeenCalledWith(
      sampleTicketOrder,
      32,
      expect.objectContaining({ payments: false, customerSection: false, businessSection: true })
    )
    expect((generateCommands as jest.Mock).mock.calls).toEqual([[sampleTicketOrder, 37]])
    await saveTicketPrintOptions(DEFAULT_TICKET_PRINT_OPTIONS)
  })

  it('mounts the canvas only for a printer that needs it (a TSP100), not for the others', async () => {
    const onDone = jest.fn()
    const plain = renderWithProviders(
      <TicketAutoPrint order={sampleTicketOrder} printerSettings={[samplePrinterEpsonLan]} onDone={onDone} />
    )
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(plain.queryByTestId('rn-canvas')).toBeNull()
  })

  it('finishes without printing when there are no printers', async () => {
    const { printButton } = usePrinterCommands()
    const onDone = jest.fn()
    const { queryByText } = renderWithProviders(
      <TicketAutoPrint order={sampleTicketOrder} printerSettings={[]} onDone={onDone} />
    )

    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(printButton).not.toHaveBeenCalled()
    expect(mockShowToast).not.toHaveBeenCalled()
    expect(queryByText('Printing ticket...')).toBeNull()
  })
})
