/**
 * What the printing module keeps on the device (AsyncStorage, never the server). The first three keys and the saved
 * printer's shape are the ones every install already has: they never change. Everything is read and written through
 * here so the screens listen to one source (`subscribePrinting`).
 */
import { _retrieveStoreData, _setStoreData } from '../ui/src/providers/StoreUtil'
import { normalizePrintersList } from './printerList'
import { savePrinter } from './savePrinter'
import { getPrinterConnectionId } from './getStoredPrinterIndex'
import { loadTicketPrintOptions, saveTicketPrintOptions, type TicketPrintOptions } from './ticketPrintOptions'

export const PRINTERS_STORAGE_KEY = 'printers'
export const AUTO_PRINT_STORAGE_KEY = 'auto_print_after_accept_order'
export { TICKET_PRINT_OPTIONS_STORAGE_KEY } from './ticketPrintOptions'
/** Copies of a ticket per order (a number, 1 to `MAX_COPIES`). The key the profile's log out keeps (`DEVICE_SETTINGS_KEYS`). */
export const TICKET_COPIES_STORAGE_KEY = 'ticket_copies'
/** `{ [printerKey]: LastResult }`: the outcome of each printer's last ticket. */
export const PRINTER_RESULTS_STORAGE_KEY = 'printer_last_results'

export const MAX_COPIES = 9

/** Everything of the printing module a log out keeps: a printer is the device's setup, not the user's. */
export const PRINTING_STORAGE_KEYS = [
  PRINTERS_STORAGE_KEY,
  AUTO_PRINT_STORAGE_KEY,
  'ticket_print_options',
  TICKET_COPIES_STORAGE_KEY,
  PRINTER_RESULTS_STORAGE_KEY
] as const

export type SavedPrinter = {
  model: string
  driver: 'star' | 'epson' | 'generic'
  printMode: 'append' | 'appendBitmapText'
  emulation?: string
  recommended?: boolean
  nickname?: string
  paperWidthMm: number
  /** 1 Bluetooth, 2 LAN, 3 USB */
  type: number
  ip?: string
  portName?: string
  portName1?: string
  bt?: string
  [key: string]: any
}

export type LastResult = {
  ok: boolean
  /** When the ticket was tried (ms since epoch). */
  at: number
  /** Why it failed, in the user's language (what the print path told). */
  message?: string
  /** A test ticket, not an order's. */
  test?: boolean
}

/** The key a printer's last result is stored under: its model and where it is. Independent of the list's order. */
export const printerKey = (printer: any): string => `${printer?.driver ?? 'star'}:${printer?.model ?? ''}:${getPrinterConnectionId(printer)}`

const listeners = new Set<() => void>()
/** Called whenever the printers, the auto-print switch, the ticket options, the copies or a result change. Returns the unsubscribe. */
export const subscribePrinting = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const changed = () => { listeners.forEach((listener) => listener()) }

export const listPrinters = async (): Promise<SavedPrinter[]> =>
  normalizePrintersList(await _retrieveStoreData(PRINTERS_STORAGE_KEY)) as SavedPrinter[]

/** Adds a printer, or updates the one at `index` (`edit`). Same call as before: the saved shape does not change. */
export const storePrinter = async (args: Parameters<typeof savePrinter>[0]) => {
  const list = await savePrinter(args)
  changed()
  return list
}

/** Deletes the printer at `index` (its result goes with it). */
export const removePrinter = async (printer: SavedPrinter, index?: number | null) => {
  const list = await savePrinter({ item: printer, index })
  const results = await getLastResults()
  if (results[printerKey(printer)]) {
    delete results[printerKey(printer)]
    await _setStoreData(PRINTER_RESULTS_STORAGE_KEY, results)
  }
  changed()
  return list
}

export const getAutoPrint = async (): Promise<boolean> => !!(await _retrieveStoreData(AUTO_PRINT_STORAGE_KEY))

export const setAutoPrint = async (on: boolean) => {
  await _setStoreData(AUTO_PRINT_STORAGE_KEY, !!on)
  changed()
}

export const getTicketOptions = (): Promise<TicketPrintOptions> => loadTicketPrintOptions()

export const setTicketOptions = async (options: Partial<TicketPrintOptions>) => {
  const next = await saveTicketPrintOptions(options)
  changed()
  return next
}

export const clampCopies = (value: unknown): number => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) ? Math.min(MAX_COPIES, Math.max(1, n)) : 1
}

export const getCopies = async (): Promise<number> => clampCopies(await _retrieveStoreData(TICKET_COPIES_STORAGE_KEY))

export const setCopies = async (copies: number) => {
  await _setStoreData(TICKET_COPIES_STORAGE_KEY, clampCopies(copies))
  changed()
}

export const getLastResults = async (): Promise<Record<string, LastResult>> => {
  const stored = await _retrieveStoreData(PRINTER_RESULTS_STORAGE_KEY)
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? { ...stored } : {}
}

export const recordResults = async (entries: Array<{ printer: any, result: LastResult }>) => {
  if (!entries.length) return
  const results = await getLastResults()
  for (const { printer, result } of entries) results[printerKey(printer)] = result
  await _setStoreData(PRINTER_RESULTS_STORAGE_KEY, results)
  changed()
}
