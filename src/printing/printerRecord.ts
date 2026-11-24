/**
 * The saved printer's record: how a wizard builds it from a catalog model, and how a screen names it. The shape is
 * exactly what the old form saved (existing installs keep their printers): `savePrinter` still derives `portName`.
 */
import { CONNECTION, type ConnectionType } from './discovery'
import { normalizePrinterDriver, type PrinterCatalogItem } from './printerList'
import { resolvePaperWidth } from './paperWidth'
import { escPosColumnsFor } from './escPos'
import type { SavedPrinter } from './storage'

/** What the wizard collects. `address` is the IP (LAN), the Bluetooth identifier, or the USB target. */
export type PrinterDraft = {
  catalog: PrinterCatalogItem
  nickname: string
  paperWidthMm: number
  connection: ConnectionType
  address: string
}

/** The `item` of `savePrinter`, equal to what the one-screen form built. */
export const buildPrinterItem = ({ catalog, nickname, paperWidthMm, connection, address }: PrinterDraft): SavedPrinter => {
  const target = address.trim()
  // The catalog's own `bt` (a legacy model hint of one Star model) is not an address.
  const model: any = { ...catalog }
  delete model.bt
  return {
    ...model,
    driver: normalizePrinterDriver(catalog),
    paperWidthMm: resolvePaperWidth(paperWidthMm).paperWidthMm,
    nickname: nickname.trim() || catalog.model,
    type: connection,
    ip: connection === CONNECTION.LAN ? target : '',
    bt: connection === CONNECTION.BLUETOOTH ? target : '',
    portName1: connection === CONNECTION.BLUETOOTH ? target : '',
    portName: connection === CONNECTION.USB ? (target || 'USB') : target
  }
}

/** The address the wizard shows and edits for a stored printer. */
export const printerAddress = (printer: any): string =>
  printer?.type === CONNECTION.LAN
    ? (printer?.ip || printer?.portName || '')
    : printer?.type === CONNECTION.BLUETOOTH
      ? (printer?.bt || printer?.portName1 || printer?.portName || '')
      : (printer?.portName && printer.portName !== 'USB' ? printer.portName : '')

export const IPV4 = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
export const BLUETOOTH_ID = /^[a-zA-Z0-9:\-]+$/
/** A name is one line (the old form enforced no more, and its own default, the model, has hyphens and slashes). */
export const NICKNAME = /^[^\n]*$/

/** The address is the kind the connection needs (an IP, a Bluetooth identifier; USB needs none). */
export const isValidAddress = (connection: ConnectionType, address: string): boolean =>
  connection === CONNECTION.LAN
    ? IPV4.test(address.trim())
    : connection === CONNECTION.BLUETOOTH
      ? BLUETOOTH_ID.test(address.trim())
      : true

const BRAND_NAME = { star: 'Star', epson: 'Epson' } as const

/** `Star TSP100 · LAN 192.168.1.40 · 80 mm`, as a printer's card says it. */
export const printerSummary = (printer: any, t: (key: string, fallback: string) => string): string => {
  const driver = normalizePrinterDriver(printer)
  const brand = driver === 'generic' ? t('PRINTER_GENERIC_ESC_POS', 'Generic ESC/POS') : `${BRAND_NAME[driver]} ${printer?.model ?? ''}`.trim()
  const address = printerAddress(printer)
  const way = printer?.type === CONNECTION.LAN
    ? `${t('PRINTER_CONNECTION_LAN', 'LAN')} ${address}`.trim()
    : printer?.type === CONNECTION.USB
      ? t('PRINTER_CONNECTION_USB', 'USB')
      : t('PRINTER_CONNECTION_BLUETOOTH', 'Bluetooth')
  return `${brand} · ${way} · ${resolvePaperWidth(printer?.paperWidthMm).paperWidthMm} mm`
}

/** A Star printer in `appendBitmapText` mode (the TSP100) prints a picture of the ticket: it needs the canvas. */
export const needsBitmapCanvas = (printers: unknown): boolean =>
  Array.isArray(printers) && printers.some((printer: any) => normalizePrinterDriver(printer) === 'star' && printer?.printMode !== 'append')

/** How many columns a printer's ticket is broken at (what `usePrinting().ticketText` uses for it): generic ESC/POS prints a column per 12 dots. */
export const ticketColumns = (printer?: { driver?: string, paperWidthMm?: number } | null): number => {
  const width = resolvePaperWidth(printer?.paperWidthMm)
  return normalizePrinterDriver(printer) === 'generic' ? escPosColumnsFor(width.ticketWidth) : width.ticketWidthToShow
}
