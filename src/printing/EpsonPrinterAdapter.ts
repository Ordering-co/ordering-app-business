import { Platform } from 'react-native'
import {
  Printer,
  PrinterConstants,
  PrintersDiscovery,
  DiscoveryFilterOption
} from 'react-native-esc-pos-printer'

export type EpsonErrorKey =
  | 'PRINTER_UNREACHABLE'
  | 'PRINTER_TIMEOUT'
  | 'ORDER_PRINTED_FAILED'
  | 'PRINTER_PERMISSION_DENIED'
  | 'PRINTER_NO_PAPER'
  | 'PRINTER_COVER_OPEN'
  | 'PRINTER_OFFLINE'

export type EpsonPrintResult = {
  ok: boolean
  errorKey?: EpsonErrorKey
  errorMessage?: string
}

export type EpsonDiscoveredPrinter = {
  target: string
  deviceName: string
  ipAddress: string
  macAddress: string
  bdAddress: string
}

export type EpsonDiscoveryResult = {
  ok: boolean
  printers: EpsonDiscoveredPrinter[]
  errorKey?: 'PRINTER_PERMISSION_DENIED' | 'NO_PRINTERS_FOUND' | 'ORDER_PRINTED_FAILED' | 'PRINTER_BLUETOOTH_PAIR_CANCELLED'
  errorMessage?: string
}

type PrintParams = {
  target: string
  deviceName?: string
  text: string
  timeoutMs?: number
}

type PrintLanParams = {
  ip: string
  deviceName?: string
  text: string
  timeoutMs?: number
}

type PrintBluetoothParams = {
  address: string
  deviceName?: string
  text: string
  timeoutMs?: number
}

type PrintUsbParams = {
  /** Full ePOS target (`USB:…`) or placeholder `USB` to auto-discover */
  target?: string
  deviceName?: string
  text: string
  timeoutMs?: number
}

type DiscoverParams = {
  /** 1 = Bluetooth, 2 = LAN/TCP, 3 = USB */
  type?: number
  timeoutMs?: number
}

const buildTcpTarget = (ip: string) => {
  const trimmed = (ip || '').trim()
  if (!trimmed) return ''
  if (trimmed.toUpperCase().startsWith('TCP:')) return trimmed
  return `TCP:${trimmed}`
}

const buildBtTarget = (address: string) => {
  const trimmed = (address || '').trim()
  if (!trimmed) return ''
  if (trimmed.toUpperCase().startsWith('BT:')) return trimmed
  return `BT:${trimmed.replace(/-/g, ':')}`
}

const buildUsbTarget = (target?: string) => {
  const trimmed = (target || '').trim()
  if (!trimmed || trimmed.toUpperCase() === 'USB') return ''
  if (trimmed.toUpperCase().startsWith('USB:')) return trimmed
  return `USB:${trimmed}`
}

const stripTargetPrefix = (target: string, prefix: 'TCP:' | 'BT:' | 'USB:') => {
  const trimmed = (target || '').trim()
  if (trimmed.toUpperCase().startsWith(prefix)) {
    return trimmed.slice(prefix.length)
  }
  return trimmed
}

const matchUsbDeviceName = (
  printers: EpsonDiscoveredPrinter[],
  deviceName?: string
) => {
  if (!printers.length) return null
  if (!deviceName) return printers[0]
  const normalized = deviceName.toUpperCase()
  return (
    printers.find((printer) => printer.deviceName?.toUpperCase().includes(normalized)) ||
    printers.find((printer) => normalized.includes(printer.deviceName?.toUpperCase() || '')) ||
    printers[0]
  )
}

const mapEpsonError = (error: any): EpsonPrintResult => {
  const raw = String(error?.message || error?.status || error || '')
  const upper = raw.toUpperCase()

  if (upper.includes('PERMISSION')) {
    return {
      ok: false,
      errorKey: 'PRINTER_PERMISSION_DENIED',
      errorMessage: raw
    }
  }

  if (
    upper.includes('COVER') ||
    upper.includes('CODE_ERR_COVER_OPEN')
  ) {
    return {
      ok: false,
      errorKey: 'PRINTER_COVER_OPEN',
      errorMessage: raw
    }
  }

  if (
    upper.includes('EMPTY') ||
    upper.includes('NO_PAPER') ||
    upper.includes('OUT OF PAPER') ||
    upper.includes('CODE_ERR_EMPTY') ||
    upper.includes('PAPER END')
  ) {
    return {
      ok: false,
      errorKey: 'PRINTER_NO_PAPER',
      errorMessage: raw
    }
  }

  if (
    upper.includes('OFFLINE') ||
    upper.includes('NOT ONLINE')
  ) {
    return {
      ok: false,
      errorKey: 'PRINTER_OFFLINE',
      errorMessage: raw
    }
  }

  if (upper.includes('TIMEOUT') || upper.includes('ERR_TIMEOUT')) {
    return {
      ok: false,
      errorKey: 'PRINTER_TIMEOUT',
      errorMessage: raw
    }
  }

  if (
    upper.includes('CONNECT') ||
    upper.includes('NOT_FOUND') ||
    upper.includes('UNREACHABLE') ||
    upper.includes('ERR_CONNECT') ||
    upper.includes('ERR_NOT_FOUND') ||
    upper.includes('DISCONNECT') ||
    upper.includes('ERR_PORT')
  ) {
    return {
      ok: false,
      errorKey: 'PRINTER_UNREACHABLE',
      errorMessage: raw
    }
  }

  return {
    ok: false,
    errorKey: 'ORDER_PRINTED_FAILED',
    errorMessage: raw
  }
}

const printEpson = async ({
  target,
  deviceName = 'TM-T20III',
  text,
  timeoutMs = 15000
}: PrintParams): Promise<EpsonPrintResult> => {
  if (!target || !text) {
    return { ok: false, errorKey: 'ORDER_PRINTED_FAILED' }
  }

  const printer = new Printer({
    target,
    deviceName
  })

  try {
    await printer.addQueueTask(async () => {
      await printer.connect(timeoutMs)
      await printer.addTextAlign(PrinterConstants.ALIGN_LEFT)
      await printer.addText(text)
      await printer.addFeedLine(3)
      await printer.addCut(PrinterConstants.CUT_FEED)
      await printer.sendData(timeoutMs)
      await printer.disconnect()
    })
    return { ok: true }
  } catch (error) {
    try {
      await printer.disconnect()
    } catch (_) {
      // ignore disconnect errors after a failed job
    }
    return mapEpsonError(error)
  }
}

/**
 * Print receipt text to an Epson TM printer over LAN / WLAN (ePOS TCP).
 * WLAN uses the same path once the printer shares the device network.
 */
export const printEpsonLan = async ({
  ip,
  deviceName = 'TM-T20III',
  text,
  timeoutMs = 15000
}: PrintLanParams): Promise<EpsonPrintResult> => {
  return printEpson({
    target: buildTcpTarget(ip),
    deviceName,
    text,
    timeoutMs
  })
}

/**
 * Print receipt text to an Epson TM printer over Bluetooth (ePOS BT:MAC).
 */
export const printEpsonBluetooth = async ({
  address,
  deviceName = 'TM-T20III',
  text,
  timeoutMs = 15000
}: PrintBluetoothParams): Promise<EpsonPrintResult> => {
  return printEpson({
    target: buildBtTarget(address),
    deviceName,
    text,
    timeoutMs
  })
}

const resolveDiscoveryPortType = (type?: number) => {
  if (type === 1) return DiscoveryFilterOption.PORTTYPE_BLUETOOTH
  if (type === 2) return DiscoveryFilterOption.PORTTYPE_TCP
  if (type === 3) return DiscoveryFilterOption.PORTTYPE_USB
  return DiscoveryFilterOption.PORTTYPE_ALL
}

/**
 * Discover Epson printers via ePOS. type 1 = Bluetooth, type 2 = LAN/TCP, type 3 = USB.
 * On iOS Bluetooth, opens the native pairing sheet first (required by ePOS).
 */
export const discoverEpsonPrinters = async ({
  type = 1,
  timeoutMs
}: DiscoverParams = {}): Promise<EpsonDiscoveryResult> => {
  if (type === 3 && Platform.OS !== 'android') {
    return {
      ok: false,
      printers: [],
      errorKey: 'ORDER_PRINTED_FAILED',
      errorMessage: 'USB printing is available on Android only.'
    }
  }

  const timeout = timeoutMs ?? (Platform.OS === 'ios' ? 5000 : 10000)

  if (Platform.OS === 'ios' && type === 1) {
    try {
      await PrintersDiscovery.pairBluetoothDevice()
    } catch (error: any) {
      const raw = String(error?.message || error || '')
      if (raw.toUpperCase().includes('CANCEL')) {
        return {
          ok: false,
          printers: [],
          errorKey: 'PRINTER_BLUETOOTH_PAIR_CANCELLED',
          errorMessage: raw
        }
      }
      // Continue into discovery for other pairing errors
    }
  }

  return new Promise((resolve) => {
    let settled = false
    let found: EpsonDiscoveredPrinter[] = []

    const finish = (result: EpsonDiscoveryResult) => {
      if (settled) return
      settled = true
      unsubscribeDiscovery()
      unsubscribeError()
      unsubscribeStatus()
      resolve(result)
    }

    const unsubscribeDiscovery = PrintersDiscovery.onDiscovery((printers) => {
      found = (printers || []).map((info: any) => ({
        target: info?.target || '',
        deviceName: info?.deviceName || '',
        ipAddress: info?.ipAddress || '',
        macAddress: info?.macAddress || '',
        bdAddress: info?.bdAddress || ''
      }))
    })

    const unsubscribeError = PrintersDiscovery.onError((error: any) => {
      const raw = String(error?.message || error || '')
      const upper = raw.toUpperCase()
      finish({
        ok: false,
        printers: found,
        errorKey: upper.includes('PERMISSION')
          ? 'PRINTER_PERMISSION_DENIED'
          : 'ORDER_PRINTED_FAILED',
        errorMessage: raw
      })
      PrintersDiscovery.stop().catch(() => {})
    })

    const unsubscribeStatus = PrintersDiscovery.onStatusChange((status) => {
      if (status === 'inactive') {
        finish({
          ok: found.length > 0,
          printers: found,
          errorKey: found.length > 0 ? undefined : 'NO_PRINTERS_FOUND'
        })
      }
    })

    PrintersDiscovery.start({
      timeout,
      autoStop: true,
      filterOption: {
        portType: resolveDiscoveryPortType(type)
      }
    }).catch((error: any) => {
      finish({
        ok: false,
        printers: [],
        errorKey: 'ORDER_PRINTED_FAILED',
        errorMessage: String(error?.message || error || '')
      })
    })
  })
}

/**
 * Print receipt text to an Epson TM printer over USB (Android / ePOS USB:…).
 * When target is missing or placeholder `USB`, discovers attached printers first.
 */
export const printEpsonUsb = async ({
  target,
  deviceName = 'TM-T20III',
  text,
  timeoutMs = 15000
}: PrintUsbParams): Promise<EpsonPrintResult> => {
  if (Platform.OS !== 'android') {
    return { ok: false, errorKey: 'ORDER_PRINTED_FAILED' }
  }

  let usbTarget = buildUsbTarget(target)
  if (!usbTarget) {
    const discovered = await discoverEpsonPrinters({ type: 3 })
    if (discovered.errorKey === 'PRINTER_PERMISSION_DENIED') {
      return { ok: false, errorKey: 'PRINTER_PERMISSION_DENIED', errorMessage: discovered.errorMessage }
    }
    const match = matchUsbDeviceName(discovered.printers, deviceName)
    if (!match?.target) {
      return {
        ok: false,
        errorKey: 'PRINTER_UNREACHABLE',
        errorMessage: discovered.errorMessage || 'USB printer not found'
      }
    }
    usbTarget = match.target
  }

  return printEpson({
    target: usbTarget,
    deviceName,
    text,
    timeoutMs
  })
}

/** Map discovery result into identifiers usable by PrinterEdition fields. */
export const pickEpsonDiscoveryIdentifier = (
  printer: EpsonDiscoveredPrinter,
  type: number
) => {
  if (type === 3) {
    return printer.target || ''
  }
  if (type === 2) {
    return printer.ipAddress || stripTargetPrefix(printer.target, 'TCP:')
  }
  return (
    printer.bdAddress ||
    printer.macAddress ||
    stripTargetPrefix(printer.target, 'BT:')
  )
}

export const __private__ = {
  buildTcpTarget,
  buildBtTarget,
  buildUsbTarget,
  stripTargetPrefix,
  mapEpsonError,
  resolveDiscoveryPortType,
  matchUsbDeviceName
}
