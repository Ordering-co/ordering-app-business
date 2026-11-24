import { PermissionsAndroid, Platform } from 'react-native'
import { BleManager, State } from 'react-native-ble-plx'

import { buildEscPosReceipt, bytesToBase64, chunkBytes } from './escPos'

export type GenericBleErrorKey =
  | 'PRINTER_BLUETOOTH_OFF'
  | 'PRINTER_PERMISSION_DENIED'
  | 'NO_PRINTERS_FOUND'
  | 'PRINTER_UNREACHABLE'
  | 'PRINTER_NOT_WRITABLE'
  | 'ORDER_PRINTED_FAILED'

export type GenericBleDevice = {
  id: string
  name: string
  rssi: number | null
}

export type GenericBleDiscoveryResult = {
  ok: boolean
  devices: GenericBleDevice[]
  errorKey?: GenericBleErrorKey
  errorMessage?: string
}

export type GenericBlePrintResult = {
  ok: boolean
  errorKey?: GenericBleErrorKey
  errorMessage?: string
}

type WritableCandidate = {
  serviceUUID: string
  uuid: string
  isWritableWithResponse: boolean
  isWritableWithoutResponse: boolean
}

type PrintParams = {
  deviceId: string
  text: string
  columns?: number
  timeoutMs?: number
}

const fullUuid = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`

const KNOWN_PRINTER_CHARACTERISTICS = [
  { service: fullUuid('18f0'), characteristic: fullUuid('2af1') },
  { service: '49535343-fe7d-4ae5-8fa9-9fafd205e455', characteristic: '49535343-8841-43f4-a8d4-ecbe34729bb3' },
  { service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2', characteristic: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f' },
  { service: fullUuid('ff00'), characteristic: fullUuid('ff02') }
]

const STANDARD_SERVICES = [fullUuid('1800'), fullUuid('1801'), fullUuid('180a')]

const STATE_WAIT_MS = 10000
const DEFAULT_SCAN_MS = 4000
const DEFAULT_PRINT_TIMEOUT_MS = 10000
const ANDROID_REQUESTED_MTU = 185
const DEFAULT_MTU = 23
const MIN_CHUNK_SIZE = 20
const MAX_CHUNK_SIZE = 180
const CHUNK_DELAY_MS = 20
const DRAIN_DELAY_MS = 400

let manager: BleManager | null = null
let printQueue: Promise<unknown> = Promise.resolve()

const getManager = () => {
  if (!manager) {
    manager = new BleManager()
  }
  return manager
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Printer did not answer in time')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

const errorMessageOf = (error: any) => String(error?.message ?? error ?? '')

const ensurePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true
  try {
    if (Number(Platform.Version) >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ])
      return Object.values(result).every((status) => status === PermissionsAndroid.RESULTS.GRANTED)
    }
    const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
    return status === PermissionsAndroid.RESULTS.GRANTED
  } catch {
    return false
  }
}

const isTransitionalState = (state: State) => state === State.Unknown || state === State.Resetting

const resolveBluetoothState = async (bleManager: BleManager): Promise<State> => {
  const current = await bleManager.state()
  if (!isTransitionalState(current)) return current

  return new Promise((resolve) => {
    let settled = false
    let subscription: { remove: () => void } | undefined
    const finish = (state: State) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      subscription?.remove()
      resolve(state)
    }
    const timer = setTimeout(() => finish(current), STATE_WAIT_MS)
    subscription = bleManager.onStateChange((state) => {
      if (!isTransitionalState(state)) finish(state)
    }, true)
    if (settled) subscription.remove()
  })
}

const prepareBluetooth = async (): Promise<GenericBleErrorKey | null> => {
  if (!(await ensurePermissions())) return 'PRINTER_PERMISSION_DENIED'
  const state = await resolveBluetoothState(getManager())
  if (state === State.PoweredOn) return null
  if (state === State.Unauthorized) return 'PRINTER_PERMISSION_DENIED'
  return 'PRINTER_BLUETOOTH_OFF'
}

const byStrongestSignal = (a: GenericBleDevice, b: GenericBleDevice) => {
  if (a.rssi === null && b.rssi === null) return 0
  if (a.rssi === null) return 1
  if (b.rssi === null) return -1
  return b.rssi - a.rssi
}

export const discoverGenericBlePrinters = async ({
  scanMs = DEFAULT_SCAN_MS
}: { scanMs?: number } = {}): Promise<GenericBleDiscoveryResult> => {
  const blocked = await prepareBluetooth()
  if (blocked) return { ok: false, devices: [], errorKey: blocked }

  const bleManager = getManager()
  const found = new Map<string, GenericBleDevice>()

  try {
    await bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error || !device) return
      const name = device.name || device.localName
      if (!name || found.has(device.id)) return
      found.set(device.id, { id: device.id, name, rssi: device.rssi ?? null })
    })
    await wait(scanMs)
  } catch (error) {
    return { ok: false, devices: [], errorKey: 'NO_PRINTERS_FOUND', errorMessage: errorMessageOf(error) }
  } finally {
    await Promise.resolve(bleManager.stopDeviceScan()).catch(() => undefined)
  }

  const devices = Array.from(found.values()).sort(byStrongestSignal)
  return devices.length
    ? { ok: true, devices }
    : { ok: false, devices: [], errorKey: 'NO_PRINTERS_FOUND' }
}

const isWritable = (characteristic: WritableCandidate) =>
  characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse

const pickWritableCharacteristic = <T extends WritableCandidate>(characteristics: T[]): T | null => {
  const writable = characteristics.filter(isWritable)
  for (const known of KNOWN_PRINTER_CHARACTERISTICS) {
    const match = writable.find((characteristic) =>
      characteristic.serviceUUID.toLowerCase() === known.service &&
      characteristic.uuid.toLowerCase() === known.characteristic
    )
    if (match) return match
  }
  return writable.find((characteristic) =>
    !STANDARD_SERVICES.includes(characteristic.serviceUUID.toLowerCase())
  ) ?? null
}

const collectCharacteristics = async (bleManager: BleManager, deviceId: string) => {
  const services = await bleManager.servicesForDevice(deviceId)
  const groups = await Promise.all(
    services.map((service) => bleManager.characteristicsForDevice(deviceId, service.uuid))
  )
  return groups.flat()
}

const runPrint = async ({
  deviceId,
  text,
  columns,
  timeoutMs = DEFAULT_PRINT_TIMEOUT_MS
}: PrintParams): Promise<GenericBlePrintResult> => {
  const blocked = await prepareBluetooth()
  if (blocked) return { ok: false, errorKey: blocked }

  const bleManager = getManager()

  try {
    let mtu = DEFAULT_MTU
    let characteristics
    try {
      const device = await bleManager.connectToDevice(deviceId, {
        timeout: timeoutMs,
        ...(Platform.OS === 'android' ? { requestMTU: ANDROID_REQUESTED_MTU } : {})
      })
      const discovered = await device.discoverAllServicesAndCharacteristics()
      mtu = discovered?.mtu ?? device.mtu ?? DEFAULT_MTU
      characteristics = await collectCharacteristics(bleManager, deviceId)
    } catch (error) {
      return { ok: false, errorKey: 'PRINTER_UNREACHABLE', errorMessage: errorMessageOf(error) }
    }

    const target = pickWritableCharacteristic(characteristics)
    if (!target) return { ok: false, errorKey: 'PRINTER_NOT_WRITABLE' }

    const chunkSize = Math.max(MIN_CHUNK_SIZE, Math.min(MAX_CHUNK_SIZE, mtu - 3))
    const chunks = chunkBytes(buildEscPosReceipt(text, { columns }), chunkSize)
    const confirmEachChunk = !!target.isWritableWithResponse
    try {
      for (const chunk of chunks) {
        const payload = bytesToBase64(chunk)
        if (confirmEachChunk) {
          await withTimeout(
            bleManager.writeCharacteristicWithResponseForDevice(deviceId, target.serviceUUID, target.uuid, payload),
            timeoutMs
          )
        } else {
          await withTimeout(
            bleManager.writeCharacteristicWithoutResponseForDevice(deviceId, target.serviceUUID, target.uuid, payload),
            timeoutMs
          )
          await wait(CHUNK_DELAY_MS)
        }
      }
      if (!confirmEachChunk) {
        await wait(DRAIN_DELAY_MS)
      }
    } catch (error) {
      return { ok: false, errorKey: 'ORDER_PRINTED_FAILED', errorMessage: errorMessageOf(error) }
    }

    return { ok: true }
  } finally {
    await Promise.resolve(bleManager.cancelDeviceConnection(deviceId)).catch(() => undefined)
  }
}

export const printGenericBle = (params: PrintParams): Promise<GenericBlePrintResult> => {
  const run = printQueue.then(() =>
    runPrint(params).catch((error): GenericBlePrintResult => ({
      ok: false,
      errorKey: 'ORDER_PRINTED_FAILED',
      errorMessage: errorMessageOf(error)
    }))
  )
  printQueue = run
  return run
}

const resetManagerForTests = () => {
  manager = null
  printQueue = Promise.resolve()
}

export const __private__ = {
  pickWritableCharacteristic,
  resetManagerForTests
}
