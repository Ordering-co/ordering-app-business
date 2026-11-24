import '../../../../../../jest/helpers/registerB6PrinterMocks'

import React from 'react'
import { Pressable, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, waitFor } from '@testing-library/react-native'

jest.mock('../../../../../printing/usePrinterCommands', () => {
  const { usePrinterCommandsMockApi } = require('../../../../../../jest/helpers/b6PrinterDefaults')
  return { usePrinterCommands: () => usePrinterCommandsMockApi }
})

import { usePrinterCommands } from '../../../../../printing/usePrinterCommands'
import { usePrinting } from '../../../../../printing/usePrinting'
import { storePrinter, setAutoPrint } from '../../../../../printing/storage'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { sampleTicketOrder, samplePrinterLan, samplePrinterBt } from '../../../../../../jest/helpers/b6PrinterDefaults'

const api = usePrinterCommands() as any

// A screen that prints, as the order actions' host will: it renders the facade's host once.
const Screen = ({ draft, order }: any) => {
  const printing = usePrinting()
  return (
    <>
      <Pressable testID='test' onPress={() => printing.testPrint(draft)}><Text>test</Text></Pressable>
      <Pressable testID='warm' onPress={() => printing.warm(draft ? [draft] : undefined)}><Text>warm</Text></Pressable>
      <Pressable testID='accept' onPress={() => printing.printOrder(order)}><Text>accept</Text></Pressable>
      {printing.host}
    </>
  )
}

describe('the printing host', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    api.printButton.mockReset().mockResolvedValue(true)
  })

  it('brings up the canvas for a test ticket of a printer that is not saved yet, and prints the picture', async () => {
    const view = renderWithProviders(<Screen draft={{ ...samplePrinterLan }} />)
    expect(view.queryByTestId('rn-canvas')).toBeNull()
    await act(async () => { fireEvent.press(view.getByTestId('test')) })
    await waitFor(() => expect(api.printButton).toHaveBeenCalled())
    expect(view.getByTestId('rn-canvas')).toBeTruthy()
    expect(api.createBitmapFromText).toHaveBeenCalledWith(expect.stringContaining('Test ticket'), expect.anything(), expect.anything(), 22, 576)
    expect(api.printButton).toHaveBeenCalledWith(expect.objectContaining({ driver: 'star', image: 'dGVzdA==', commandsText: null }))
  })

  it('shows the banner while an accepted order prints, and prints on the saved printers', async () => {
    await storePrinter({ item: samplePrinterBt, type: 1, ip: '', index: null, isAdd: true })
    await setAutoPrint(true)
    let release: (value: boolean) => void = () => {}
    api.printButton.mockImplementationOnce(() => new Promise<boolean>((resolve) => { release = resolve }))
    const view = renderWithProviders(<Screen order={{ ...sampleTicketOrder, status: 7 }} />)
    expect(view.queryByTestId('printing-banner')).toBeNull()
    await act(async () => { fireEvent.press(view.getByTestId('accept')) })
    await waitFor(() => expect(view.getByText('Printing ticket...')).toBeTruthy())
    await act(async () => { release(true) })
    await waitFor(() => expect(view.queryByTestId('printing-banner')).toBeNull())
    expect(api.printButton).toHaveBeenCalledTimes(1)
  })

  it('mounts the canvas when a screen warms it for a TSP100, and not for the other printers', async () => {
    const plain = renderWithProviders(<Screen draft={{ ...samplePrinterBt }} />)
    await act(async () => { fireEvent.press(plain.getByTestId('warm')) })
    expect(plain.queryByTestId('rn-canvas')).toBeNull()
    plain.unmount()
    const view = renderWithProviders(<Screen draft={{ ...samplePrinterLan }} />)
    expect(view.queryByTestId('rn-canvas')).toBeNull()
    await act(async () => { fireEvent.press(view.getByTestId('warm')) })
    expect(view.getByTestId('rn-canvas')).toBeTruthy()
  })

  it('draws nothing when no printer needs the canvas and nothing is printing', () => {
    const view = renderWithProviders(<Screen draft={{ ...samplePrinterBt }} />)
    expect(view.queryByTestId('rn-canvas')).toBeNull()
    expect(view.queryByTestId('printing-banner')).toBeNull()
  })
})
