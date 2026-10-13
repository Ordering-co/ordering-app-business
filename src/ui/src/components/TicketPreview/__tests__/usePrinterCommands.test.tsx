import '../../../../../../jest/helpers/registerB6PrinterMocks'

import { Platform } from 'react-native'
import { renderHook } from '@testing-library/react-native'

const mockShowToast = jest.fn()
const mockPrintEpsonLan = jest.fn()
const mockPrintEpsonBluetooth = jest.fn()
const mockPrintEpsonUsb = jest.fn()
const mockDiscoverEpsonPrinters = jest.fn()
const mockPickEpsonDiscoveryIdentifier = jest.fn((printer, type) =>
  type === 2 ? printer.ipAddress : type === 3 ? printer.target : printer.bdAddress
)

jest.mock('../EpsonPrinterAdapter', () => ({
  printEpsonLan: (...args: any[]) => mockPrintEpsonLan(...args),
  printEpsonBluetooth: (...args: any[]) => mockPrintEpsonBluetooth(...args),
  printEpsonUsb: (...args: any[]) => mockPrintEpsonUsb(...args),
  discoverEpsonPrinters: (...args: any[]) => mockDiscoverEpsonPrinters(...args),
  pickEpsonDiscoveryIdentifier: (...args: any[]) => mockPickEpsonDiscoveryIdentifier(...args)
}))

jest.mock('@components', () => {
  const mockOrdering = require('../../../../../../jest/helpers/mockOrdering')
  return {
    ...mockOrdering,
    ToastType: { Info: 'info', Success: 'success', Warning: 'warning', Error: 'error' },
    useToast: () => [null, { showToast: mockShowToast }],
    useUtils: jest.fn(() => [{
      parsePrice: (v: any) => `$${Number(v ?? 0).toFixed(2)}`,
      parseNumber: (v: any) => Number(v ?? 0),
      parseDate: (v: any) => String(v ?? '')
    }, {}])
  }
})

import { usePrinterCommands } from '../usePrinterCommands'

describe('usePrinterCommands printButton routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrintEpsonLan.mockResolvedValue({ ok: true })
    mockPrintEpsonBluetooth.mockResolvedValue({ ok: true })
    mockPrintEpsonUsb.mockResolvedValue({ ok: true })
    mockDiscoverEpsonPrinters.mockResolvedValue({ ok: true, printers: [] })
  })

  it('routes epson LAN (type 2) to printEpsonLan', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 2,
      portName: '192.168.1.80',
      ip: '192.168.1.80',
      deviceName: 'TM-T20III',
      commandsText: 'Order No. 1\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonLan).toHaveBeenCalledWith({
      ip: '192.168.1.80',
      deviceName: 'TM-T20III',
      text: 'Order No. 1\n'
    })
    expect(mockPrintEpsonBluetooth).not.toHaveBeenCalled()
  })

  it('routes epson Bluetooth (type 1) to printEpsonBluetooth', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 1,
      portName: '00:22:15:7D:70:9C',
      deviceName: 'TM-m30II',
      commandsText: 'Order No. 2\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonBluetooth).toHaveBeenCalledWith({
      address: '00:22:15:7D:70:9C',
      deviceName: 'TM-m30II',
      text: 'Order No. 2\n'
    })
  })

  it('routes epson USB (type 3) to printEpsonUsb on Android', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'android'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB:000000000000000000',
      deviceName: 'TM-T20III',
      commandsText: 'USB ticket\n',
      showAlert: true
    })

    expect(ok).toBe(true)
    expect(mockPrintEpsonUsb).toHaveBeenCalledWith({
      target: 'USB:000000000000000000',
      deviceName: 'TM-T20III',
      text: 'USB ticket\n'
    })
    Platform.OS = originalOs
  })

  it('blocks epson USB on iOS', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'ios'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB',
      commandsText: 'x',
      showAlert: true
    })

    expect(ok).toBe(false)
    expect(mockPrintEpsonUsb).not.toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'USB printing is available on Android only.',
      3000
    )
    Platform.OS = originalOs
  })

  it('does not call epson adapter for star printers', async () => {
    const { result } = renderHook(() => usePrinterCommands())

    await result.current.printButton({
      driver: 'star',
      type: 2,
      portName: '192.168.1.50',
      commandsText: 'Order\n',
      showAlert: false
    })

    expect(mockPrintEpsonLan).not.toHaveBeenCalled()
    expect(mockPrintEpsonBluetooth).not.toHaveBeenCalled()
    expect(mockPrintEpsonUsb).not.toHaveBeenCalled()
  })

  it('passes the configured paper width to Star bitmap printing', async () => {
    const { StarXpandCommand } = require('react-native-star-io10')
    const OriginalImageParameter = StarXpandCommand.Printer.ImageParameter
    const ImageParameter = jest.fn().mockImplementation((image, width) => ({ image, width }))
    StarXpandCommand.Printer.ImageParameter = ImageParameter
    const { result } = renderHook(() => usePrinterCommands())

    await result.current.printButton({
      driver: 'star',
      type: 2,
      portName: '192.168.1.50',
      image: 'dGVzdA==',
      commandsText: null,
      ticketWidth: 384,
      showAlert: false
    })

    expect(ImageParameter).toHaveBeenCalledWith('dGVzdA==', 384)
    StarXpandCommand.Printer.ImageParameter = OriginalImageParameter
  })

  it('maps epson discovery permission errors', async () => {
    mockDiscoverEpsonPrinters.mockResolvedValue({
      ok: false,
      printers: [],
      errorKey: 'PRINTER_PERMISSION_DENIED'
    })
    const { result } = renderHook(() => usePrinterCommands())

    const discovery = await result.current.discoveryPrinterPort(1, 'epson')
    expect(discovery).toBe('Bluetooth permission is required to find printers.')
  })

  it('always toasts epson errors even when showAlert is false', async () => {
    mockPrintEpsonLan.mockResolvedValue({
      ok: false,
      errorKey: 'PRINTER_NO_PAPER'
    })
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 2,
      portName: '192.168.1.80',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Printer is out of paper.',
      3000
    )
  })

  it('toasts epson USB iOS errors even when showAlert is false', async () => {
    const originalOs = Platform.OS
    Platform.OS = 'ios'
    const { result } = renderHook(() => usePrinterCommands())

    const ok = await result.current.printButton({
      driver: 'epson',
      type: 3,
      portName: 'USB',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'USB printing is available on Android only.',
      3000
    )
    Platform.OS = originalOs
  })

  it('toasts star bluetooth permission deny even when showAlert is false', async () => {
    const { PermissionsAndroid } = require('react-native')
    const originalOs = Platform.OS
    const originalVersion = Platform.Version
    Platform.OS = 'android'
    Object.defineProperty(Platform, 'Version', { configurable: true, value: 31 })
    const checkSpy = jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false)
    const requestSpy = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('denied')

    const { result } = renderHook(() => usePrinterCommands())
    const ok = await result.current.printButton({
      driver: 'star',
      type: 1,
      portName: '00:11:62:06:CA:4D',
      commandsText: 'x',
      showAlert: false
    })

    expect(ok).toBe(false)
    expect(mockShowToast).toHaveBeenCalledWith(
      'error',
      'Bluetooth permission is required to find printers.',
      3000
    )

    checkSpy.mockRestore()
    requestSpy.mockRestore()
    Platform.OS = originalOs
    Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion })
  })
})

describe('usePrinterCommands generateCommands offer targets', () => {
  const baseOrder = {
    id: 101,
    products: [],
    payment_events: [],
    taxes: [],
    fees: [],
    delivery_type: 1,
    customer: {},
    business: {},
    summary: {
      subtotal: 20,
      total: 15,
      delivery_price: 3
    }
  }

  it('prints delivery-target discount amounts instead of product offers', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateCommands({
      ...baseOrder,
      offers: [
        {
          name: 'Product Promo',
          target: 1,
          rate_type: 2,
          summary: { discount: 2 }
        },
        {
          name: 'Free Delivery',
          target: 3,
          rate_type: 2,
          summary: { discount: 5 }
        }
      ]
    })

    expect(ticket).toContain('Free Delivery')
    expect(ticket).toContain('- $5.00')
    expect(ticket).toContain('Product Promo')
    expect(ticket).toContain('- $2.00')
    expect(ticket.split('Product Promo')).toHaveLength(2)
  })

  it('prints a delivery-only offer when no product offers exist', () => {
    const { result } = renderHook(() => usePrinterCommands())
    const ticket = result.current.generateCommands({
      ...baseOrder,
      offers: [
        {
          name: 'Free Delivery',
          target: 3,
          rate_type: 2,
          summary: { discount: 5 }
        }
      ]
    })

    expect(ticket).toContain('Free Delivery')
    expect(ticket).toContain('- $5.00')
    expect(ticket).not.toContain('Product Promo')
  })
})
