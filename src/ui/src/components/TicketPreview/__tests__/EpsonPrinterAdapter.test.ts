import '../../../../../../jest/helpers/registerB6PrinterMocks'

import { Platform } from 'react-native'
import { Printer, PrintersDiscovery } from 'react-native-esc-pos-printer'
import {
  printEpsonLan,
  printEpsonBluetooth,
  printEpsonUsb,
  discoverEpsonPrinters,
  pickEpsonDiscoveryIdentifier,
  __private__
} from '../EpsonPrinterAdapter'

describe('EpsonPrinterAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(Printer as any).__instances.length = 0
  })

  describe('buildTcpTarget / buildBtTarget / buildUsbTarget', () => {
    it('prefixes TCP: for bare IPs', () => {
      expect(__private__.buildTcpTarget('192.168.1.80')).toBe('TCP:192.168.1.80')
    })

    it('prefixes BT: and normalizes dashes', () => {
      expect(__private__.buildBtTarget('00-22-15-7D-70-9C')).toBe('BT:00:22:15:7D:70:9C')
      expect(__private__.buildBtTarget('BT:AA:BB:CC:DD:EE:FF')).toBe('BT:AA:BB:CC:DD:EE:FF')
    })

    it('normalizes USB targets and treats placeholder USB as empty', () => {
      expect(__private__.buildUsbTarget('USB')).toBe('')
      expect(__private__.buildUsbTarget('USB:abc')).toBe('USB:abc')
      expect(__private__.buildUsbTarget('serial123')).toBe('USB:serial123')
    })
  })

  describe('mapEpsonError', () => {
    it('maps timeout, connect, permission, paper, cover, and offline errors', () => {
      expect(__private__.mapEpsonError({ message: 'ERR_TIMEOUT' }).errorKey).toBe('PRINTER_TIMEOUT')
      expect(__private__.mapEpsonError({ message: 'ERR_CONNECT' }).errorKey).toBe('PRINTER_UNREACHABLE')
      expect(__private__.mapEpsonError({ message: 'Permission error' }).errorKey).toBe('PRINTER_PERMISSION_DENIED')
      expect(__private__.mapEpsonError({ message: 'CODE_ERR_EMPTY' }).errorKey).toBe('PRINTER_NO_PAPER')
      expect(__private__.mapEpsonError({ message: 'CODE_ERR_COVER_OPEN' }).errorKey).toBe('PRINTER_COVER_OPEN')
      expect(__private__.mapEpsonError({ message: 'Printer offline' }).errorKey).toBe('PRINTER_OFFLINE')
    })
  })

  describe('printEpsonLan / printEpsonBluetooth', () => {
    it('prints over TCP', async () => {
      const result = await printEpsonLan({
        ip: '192.168.1.80',
        deviceName: 'TM-T20III',
        text: 'Order No. 42\n'
      })

      expect(result).toEqual({ ok: true })
      const instance = (Printer as any).__instances[0]
      expect(instance.target).toBe('TCP:192.168.1.80')
      expect(instance.addText).toHaveBeenCalledWith('Order No. 42\n')
      expect(instance.addCut).toHaveBeenCalled()
    })

    it('prints over Bluetooth', async () => {
      const result = await printEpsonBluetooth({
        address: '00:22:15:7D:70:9C',
        deviceName: 'TM-m30II',
        text: 'BT ticket\n'
      })

      expect(result).toEqual({ ok: true })
      const instance = (Printer as any).__instances[0]
      expect(instance.target).toBe('BT:00:22:15:7D:70:9C')
      expect(instance.deviceName).toBe('TM-m30II')
      expect(instance.disconnect).toHaveBeenCalled()
    })

    it('rejects empty address or text', async () => {
      expect(await printEpsonBluetooth({ address: '', text: 'x' })).toEqual({
        ok: false,
        errorKey: 'ORDER_PRINTED_FAILED'
      })
    })

    it('prints over USB on Android with explicit target', async () => {
      const originalOs = Platform.OS
      Platform.OS = 'android'
      const result = await printEpsonUsb({
        target: 'USB:000000000000000000',
        deviceName: 'TM-T20III',
        text: 'USB ticket\n'
      })
      expect(result).toEqual({ ok: true })
      const instance = (Printer as any).__instances[0]
      expect(instance.target).toBe('USB:000000000000000000')
      Platform.OS = originalOs
    })

    it('rejects USB print on iOS', async () => {
      const originalOs = Platform.OS
      Platform.OS = 'ios'
      const result = await printEpsonUsb({
        target: 'USB:000000000000000000',
        text: 'x'
      })
      expect(result).toEqual({ ok: false, errorKey: 'ORDER_PRINTED_FAILED' })
      Platform.OS = originalOs
    })
  })

  describe('discoverEpsonPrinters', () => {
    it('returns printers when discovery emits devices', async () => {
      ;(PrintersDiscovery.start as jest.Mock).mockImplementation(async () => {
        ;(PrintersDiscovery as any).__emitDiscovery([{
          target: 'BT:00:22:15:7D:70:9C',
          deviceName: 'TM-m30II',
          ipAddress: '',
          macAddress: '00:22:15:7D:70:9C',
          bdAddress: '00:22:15:7D:70:9C'
        }])
        ;(PrintersDiscovery as any).__listeners.status.forEach((cb: any) => cb('inactive'))
      })

      const result = await discoverEpsonPrinters({ type: 1 })
      expect(result.ok).toBe(true)
      expect(result.printers[0].deviceName).toBe('TM-m30II')
      expect(PrintersDiscovery.start).toHaveBeenCalled()
    })

    it('maps permission errors from discovery', async () => {
      ;(PrintersDiscovery.start as jest.Mock).mockImplementation(async () => {
        ;(PrintersDiscovery as any).__emitError({ message: 'Permission error' })
      })

      const result = await discoverEpsonPrinters({ type: 1 })
      expect(result.ok).toBe(false)
      expect(result.errorKey).toBe('PRINTER_PERMISSION_DENIED')
    })
  })

  describe('pickEpsonDiscoveryIdentifier', () => {
    it('picks IP for LAN, BD for Bluetooth, and full target for USB', () => {
      const printer = {
        target: 'USB:000000000000000000',
        deviceName: 'TM-T20III',
        ipAddress: '10.0.0.8',
        macAddress: '00:22:15:7D:70:9C',
        bdAddress: '00:22:15:7D:70:9C'
      }
      expect(pickEpsonDiscoveryIdentifier(printer, 2)).toBe('10.0.0.8')
      expect(pickEpsonDiscoveryIdentifier({ ...printer, target: 'BT:00:22:15:7D:70:9C' }, 1)).toBe('00:22:15:7D:70:9C')
      expect(pickEpsonDiscoveryIdentifier(printer, 3)).toBe('USB:000000000000000000')
    })
  })
})
