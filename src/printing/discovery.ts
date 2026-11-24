/**
 * What the screens know of a device the discovery found, whichever brand and connection found it. The brands'
 * own discovery (`discoveryPrinterPort` of `usePrinterCommands`) is untouched; this only reads its list.
 */
import { getPrintersByDriver, normalizePrinterDriver, type PrinterDriver } from './printerList'

export const CONNECTION = { BLUETOOTH: 1, LAN: 2, USB: 3 } as const
export type ConnectionType = typeof CONNECTION[keyof typeof CONNECTION]

export type DiscoveredPrinter = {
  /** What the print path connects with: the IP address (LAN), the Bluetooth identifier, or the ePOS target (USB). */
  id: string
  /** What the device calls itself (`TSP100IV`, `TM-m30II`, a Bluetooth name). */
  name: string
  /** The catalog model it maps to, when it does. Without one the screen asks for the model. */
  model?: string
  brand: PrinterDriver
  connection: ConnectionType
}

export type DiscoverResult = {
  devices: DiscoveredPrinter[]
  /** The discovery's own explanation when it found nothing (a missing permission, Bluetooth off), already translated. */
  message?: string
  /** The search could not run because the system permission (Nearby devices) is refused: the screen offers the settings. */
  permissionDenied?: boolean
}

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')

// Star's `StarPrinterModel` names, compacted, to the catalog's model. A model that is not here is not guessed.
const STAR_MODELS: Record<string, string> = {
  tsp650ii: 'TSP65011',
  tsp700ii: 'TSP7001',
  tsp800ii: 'TSP80011',
  tsp100lan: 'TSP100',
  tsp100iiu: 'TSP100',
  tsp100iiuplus: 'TSP100',
  tsp100eco: 'TSP100',
  tsp100iiiw: 'TSP100',
  tsp100iiilan: 'TSP100',
  tsp100iiibi: 'TSP100',
  tsp100iiiu: 'TSP100',
  tsp100iv: 'TSP100IV',
  tsp100ivsk: 'TSP100IV',
  mpop: 'mPOP',
  mcprint3: 'mC-Print3',
  sms210i: 'SM-S210i',
  sms230i: 'SM-S230i',
  smt300: 'SM-T300i/T300',
  smt300i: 'SM-T300i/T300',
  smt400i: 'SM-T400i',
  sml200: 'SM-L200',
  sml300: 'SM-L300',
  bsc10: 'BSC10',
  sp700: 'SP700'
}

/** The catalog model a discovered device is, or `undefined` (the screen then offers the brand's models to pick from). */
export const matchCatalogModel = (brand: PrinterDriver, deviceName?: string): string | undefined => {
  if (!deviceName) return undefined
  const key = compact(deviceName)
  if (brand === 'generic') return getPrintersByDriver('generic')[0]?.model
  if (brand === 'star') return STAR_MODELS[key]
  return getPrintersByDriver('epson').find((item) => compact(item.model) === key)?.model
}

/** One row per device of what a brand's discovery returned (`StarPrinter[]`, Epson's or the BLE list). */
export const readDiscovery = (found: unknown, brand: PrinterDriver, connection: ConnectionType): DiscoveredPrinter[] => {
  if (!Array.isArray(found)) return []
  const seen = new Set<string>()
  const devices: DiscoveredPrinter[] = []
  for (const item of found as any[]) {
    const id = item?.connectionSettings?.identifier
    if (!id || seen.has(id)) continue
    seen.add(id)
    const star = brand === 'star' ? String(item?.information?.model ?? '') : ''
    const name = String(item?.deviceName || (star && star !== 'Unknown' ? star.replace(/_/g, '-') : '') || '')
    devices.push({
      id,
      name,
      model: matchCatalogModel(brand, brand === 'star' ? star : item?.deviceName),
      brand: normalizePrinterDriver({ driver: brand }),
      connection
    })
  }
  return devices
}
