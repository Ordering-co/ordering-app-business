import '../../../jest/helpers/registerB6PrinterMocks'

import { Platform, PermissionsAndroid } from 'react-native'
import {
  discoverGenericBlePrinters,
  printGenericBle,
  __private__
} from '../GenericBlePrinterAdapter'
import { buildEscPosReceipt } from '../escPos'

const { __mock } = require('react-native-ble-plx')

const uuid16 = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`

const setupWritablePrinter = ({ withoutResponse = true, withResponse = true } = {}) => {
  __mock.services = [{ uuid: uuid16('1800') }, { uuid: uuid16('18f0') }]
  __mock.characteristics = [
    { serviceUUID: uuid16('1800'), uuid: uuid16('2a00'), isWritableWithResponse: true, isWritableWithoutResponse: false },
    { serviceUUID: uuid16('18f0'), uuid: uuid16('2af1'), isWritableWithResponse: withResponse, isWritableWithoutResponse: withoutResponse }
  ]
}

const writtenBytes = () =>
  __mock.writes.flatMap((write: any) => Array.from(Buffer.from(write.base64, 'base64')))

describe('GenericBlePrinterAdapter', () => {
  const originalOs = Platform.OS
  const originalVersion = Platform.Version

  beforeEach(() => {
    jest.clearAllMocks()
    __mock.reset()
    __private__.resetManagerForTests()
  })

  afterEach(() => {
    Platform.OS = originalOs
    Object.defineProperty(Platform, 'Version', { configurable: true, value: originalVersion })
    jest.restoreAllMocks()
  })

  describe('discoverGenericBlePrinters', () => {
    it('returns named devices without duplicates sorted by signal', async () => {
      __mock.scanResults = [
        { id: 'a', name: 'MPT-II', localName: null, rssi: -70 },
        { id: 'b', name: null, localName: null, rssi: -40 },
        { id: 'c', name: 'Printer', localName: null, rssi: -50 },
        { id: 'a', name: 'MPT-II', localName: null, rssi: -70 }
      ]

      const result = await discoverGenericBlePrinters({ scanMs: 10 })

      expect(result.ok).toBe(true)
      expect(result.devices).toEqual([
        { id: 'c', name: 'Printer', rssi: -50 },
        { id: 'a', name: 'MPT-II', rssi: -70 }
      ])
    })

    it('uses localName when name is missing', async () => {
      __mock.scanResults = [{ id: 'd', name: null, localName: 'BlueTooth Printer', rssi: null }]

      const result = await discoverGenericBlePrinters({ scanMs: 10 })

      expect(result.devices).toEqual([{ id: 'd', name: 'BlueTooth Printer', rssi: null }])
    })

    it('reports NO_PRINTERS_FOUND when nothing is around', async () => {
      const result = await discoverGenericBlePrinters({ scanMs: 10 })

      expect(result).toEqual({ ok: false, devices: [], errorKey: 'NO_PRINTERS_FOUND' })
    })
  })

  describe('bluetooth state and permissions', () => {
    it('reports PRINTER_BLUETOOTH_OFF without scanning or connecting', async () => {
      __mock.state = 'PoweredOff'
      setupWritablePrinter()

      const discovery = await discoverGenericBlePrinters({ scanMs: 10 })
      const print = await printGenericBle({ deviceId: 'a', text: 'x' })

      expect(discovery.errorKey).toBe('PRINTER_BLUETOOTH_OFF')
      expect(print).toEqual(expect.objectContaining({ ok: false, errorKey: 'PRINTER_BLUETOOTH_OFF' }))
      expect(__mock.events).toEqual([])
    })

    it('reports PRINTER_PERMISSION_DENIED when Android 12+ denies scan/connect', async () => {
      Platform.OS = 'android'
      Object.defineProperty(Platform, 'Version', { configurable: true, value: 33 })
      const requestSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
        'android.permission.BLUETOOTH_SCAN': 'denied',
        'android.permission.BLUETOOTH_CONNECT': 'granted'
      } as any)

      const result = await discoverGenericBlePrinters({ scanMs: 10 })

      expect(requestSpy).toHaveBeenCalledWith([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ])
      expect(result.errorKey).toBe('PRINTER_PERMISSION_DENIED')
      expect(__mock.events).toEqual([])
    })

    it('asks for fine location on Android 10-11 and scans when granted', async () => {
      Platform.OS = 'android'
      Object.defineProperty(Platform, 'Version', { configurable: true, value: 29 })
      const requestSpy = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('granted' as any)
      __mock.scanResults = [{ id: 'a', name: 'MPT-II', localName: null, rssi: -60 }]

      const result = await discoverGenericBlePrinters({ scanMs: 10 })

      expect(requestSpy).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
      expect(result.ok).toBe(true)
    })
  })

  describe('pickWritableCharacteristic', () => {
    it('prefers the known 18F0/2AF1 printer characteristic', () => {
      const picked = __private__.pickWritableCharacteristic([
        { serviceUUID: uuid16('ffe0'), uuid: uuid16('ffe1'), isWritableWithResponse: true, isWritableWithoutResponse: true },
        { serviceUUID: uuid16('18F0'), uuid: uuid16('2AF1'), isWritableWithResponse: true, isWritableWithoutResponse: false }
      ])

      expect(picked?.uuid).toBe(uuid16('2AF1'))
    })

    it('falls back to the first writable outside standard services', () => {
      const picked = __private__.pickWritableCharacteristic([
        { serviceUUID: uuid16('1800'), uuid: uuid16('2a00'), isWritableWithResponse: true, isWritableWithoutResponse: false },
        { serviceUUID: uuid16('180a'), uuid: uuid16('2a29'), isWritableWithResponse: true, isWritableWithoutResponse: false },
        { serviceUUID: uuid16('ffe0'), uuid: uuid16('ffe1'), isWritableWithResponse: false, isWritableWithoutResponse: true }
      ])

      expect(picked?.uuid).toBe(uuid16('ffe1'))
    })

    it('returns null when nothing is writable', () => {
      const picked = __private__.pickWritableCharacteristic([
        { serviceUUID: uuid16('ffe0'), uuid: uuid16('ffe1'), isWritableWithResponse: false, isWritableWithoutResponse: false }
      ])

      expect(picked).toBeNull()
    })
  })

  describe('printGenericBle', () => {
    it('sends the whole receipt in ordered chunks no bigger than the MTU allows', async () => {
      setupWritablePrinter()
      __mock.mtu = 23
      const text = 'x'.repeat(500)

      const result = await printGenericBle({ deviceId: 'a', text })

      expect(result).toEqual({ ok: true })
      expect(writtenBytes()).toEqual(Array.from(buildEscPosReceipt(text)))
      expect(__mock.writes.every((write: any) => Buffer.from(write.base64, 'base64').length <= 20)).toBe(true)
    })

    it('writes without response when that is the only fast option and waits before disconnecting', async () => {
      setupWritablePrinter({ withoutResponse: true, withResponse: false })

      const result = await printGenericBle({ deviceId: 'a', text: 'hola' })

      expect(result).toEqual({ ok: true })
      expect(__mock.writes.length).toBeGreaterThan(0)
      expect(__mock.writes.every((write: any) => write.withResponse === false)).toBe(true)
      expect(__mock.writes[0].uuid).toBe(uuid16('2af1'))
      const lastWriteAt = __mock.writes[__mock.writes.length - 1].at
      expect(__mock.cancelledAt[0] - lastWriteAt).toBeGreaterThanOrEqual(300)
    })

    it('centers the ticket for the printer columns it is given', async () => {
      setupWritablePrinter()
      __mock.mtu = 185
      const text = 'Order 265\n------------------------\n'

      await printGenericBle({ deviceId: 'a', text, columns: 32 })

      expect(writtenBytes()).toEqual(Array.from(buildEscPosReceipt(text, { columns: 32 })))
    })

    it('waits for the printer to confirm every chunk when it accepts writes with response', async () => {
      setupWritablePrinter({ withoutResponse: true, withResponse: true })
      __mock.mtu = 23

      await printGenericBle({ deviceId: 'a', text: 'x'.repeat(50) })

      const flags = __mock.writes.map((write: any) => write.withResponse)
      expect(flags.length).toBeGreaterThan(2)
      expect(flags.every((flag: boolean) => flag === true)).toBe(true)
      expect(writtenBytes()).toEqual(Array.from(buildEscPosReceipt('x'.repeat(50))))
    })

    it('sizes the chunks with the MTU the printer reports after discovering its services', async () => {
      setupWritablePrinter()
      __mock.mtu = 23
      __mock.discoveredMtu = 185
      const text = 'x'.repeat(500)

      await printGenericBle({ deviceId: 'a', text })

      const sizes = __mock.writes.map((write: any) => Buffer.from(write.base64, 'base64').length)
      expect(Math.max(...sizes)).toBe(180)
      expect(writtenBytes()).toEqual(Array.from(buildEscPosReceipt(text)))
    })

    it('gives up, frees the printer and keeps printing later when a write never finishes', async () => {
      setupWritablePrinter()
      __mock.hangAfterWrites = 1

      const stuck = await printGenericBle({ deviceId: 'a', text: 'x'.repeat(50), timeoutMs: 50 })

      expect(stuck).toEqual(expect.objectContaining({ ok: false, errorKey: 'ORDER_PRINTED_FAILED' }))
      expect(__mock.events[__mock.events.length - 1]).toBe('cancel:a')

      __mock.hangAfterWrites = null
      const next = await printGenericBle({ deviceId: 'a', text: 'x', timeoutMs: 50 })

      expect(next).toEqual({ ok: true })
    })

    it('writes with response when it is the only option', async () => {
      setupWritablePrinter({ withoutResponse: false })

      await printGenericBle({ deviceId: 'a', text: 'hola' })

      expect(__mock.writes.every((write: any) => write.withResponse === true)).toBe(true)
    })

    it('reports PRINTER_NOT_WRITABLE and disconnects when no characteristic accepts data', async () => {
      __mock.services = [{ uuid: uuid16('1800') }]
      __mock.characteristics = [
        { serviceUUID: uuid16('1800'), uuid: uuid16('2a00'), isWritableWithResponse: true, isWritableWithoutResponse: false }
      ]

      const result = await printGenericBle({ deviceId: 'a', text: 'x' })

      expect(result).toEqual(expect.objectContaining({ ok: false, errorKey: 'PRINTER_NOT_WRITABLE' }))
      expect(__mock.events).toEqual(['connect:a', 'cancel:a'])
    })

    it('reports PRINTER_UNREACHABLE when the printer cannot be reached', async () => {
      __mock.connectError = new Error('Operation timed out')

      const result = await printGenericBle({ deviceId: 'a', text: 'x' })

      expect(result).toEqual(expect.objectContaining({ ok: false, errorKey: 'PRINTER_UNREACHABLE' }))
    })

    it('closes the connection when a write fails and prints fine afterwards', async () => {
      setupWritablePrinter()
      __mock.writeError = new Error('Write failed')

      const failed = await printGenericBle({ deviceId: 'a', text: 'x' })

      expect(failed).toEqual(expect.objectContaining({ ok: false, errorKey: 'ORDER_PRINTED_FAILED' }))
      expect(__mock.events[__mock.events.length - 1]).toBe('cancel:a')

      __mock.writeError = null
      const retried = await printGenericBle({ deviceId: 'a', text: 'x' })

      expect(retried).toEqual({ ok: true })
    })

    it('never overlaps two prints', async () => {
      setupWritablePrinter()

      await Promise.all([
        printGenericBle({ deviceId: 'a', text: 'uno' }),
        printGenericBle({ deviceId: 'b', text: 'dos' })
      ])

      expect(__mock.events).toEqual(['connect:a', 'cancel:a', 'connect:b', 'cancel:b'])
    })
  })
})
