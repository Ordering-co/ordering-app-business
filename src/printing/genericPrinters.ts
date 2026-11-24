import { normalizePrinterDriver } from './printerList'

export const isGenericPrinter = (printer: any) => normalizePrinterDriver(printer) === 'generic'

export const hasGenericPrinter = (printers: unknown) =>
  Array.isArray(printers) && printers.some(isGenericPrinter)

export const hasOnlyGenericPrinters = (printers: unknown) =>
  Array.isArray(printers) && printers.length > 0 && printers.every(isGenericPrinter)
