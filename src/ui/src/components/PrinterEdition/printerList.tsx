import { resolvePaperWidth } from './paperWidth'

export type PrinterDriver = 'star' | 'epson'

export type PrinterCatalogItem = {
  model: string
  driver: PrinterDriver
  printMode: 'append' | 'appendBitmapText'
  emulation?: string
  bt?: string
  recommended?: boolean
}

/** Star Micronics — existing Business App catalog */
const STAR_PRINTERS: PrinterCatalogItem[] = [
  { model: 'mPOP', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'FVP10', driver: 'star', emulation: 'StarLine', printMode: 'append' },
  { model: 'TSP100', driver: 'star', emulation: 'StarGraphic', printMode: 'appendBitmapText' },
  { model: 'TSP100IV', driver: 'star', emulation: 'StarLine', printMode: 'append' },
  { model: 'TSP65011', driver: 'star', emulation: 'StarLine', printMode: 'append' },
  { model: 'TSP7001', driver: 'star', emulation: 'StarLine', printMode: 'append' },
  { model: 'TSP80011', driver: 'star', emulation: 'StarLine', printMode: 'append' },
  { model: 'SP700', driver: 'star', emulation: 'StarDotImpact', printMode: 'append' },
  { model: 'SM-S210i', driver: 'star', emulation: 'EscPosMobile', printMode: 'append' },
  { model: 'SM-S220i', driver: 'star', emulation: 'EscPosMobile', printMode: 'append' },
  { model: 'SM-S230i', driver: 'star', emulation: 'EscosMobile', printMode: 'append' },
  { model: 'SM-T300i/T300', driver: 'star', emulation: 'EscPosMobile', printMode: 'append' },
  { model: 'SM-T400i', driver: 'star', emulation: 'EscosMobile', printMode: 'append' },
  { model: 'SM-L200', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'SM-L300', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'BSC10', driver: 'star', emulation: 'EscPos', bt: 'BT:BSC10', printMode: 'append' },
  { model: 'SM-S210i StarPRNT', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'SM-S220i StarPRNT', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'SM-S230i StarPRNT', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'SM-T300i/T300 StarPRNT', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'SM-T400i StarPRNT', driver: 'star', emulation: 'StarPRNT', printMode: 'append' },
  { model: 'mC-Print3', driver: 'star', emulation: 'StarPRNT', printMode: 'append' }
]

/** Epson — GloriaFood recommended (surface first) */
const EPSON_RECOMMENDED: PrinterCatalogItem[] = [
  { model: 'TM-T20III', driver: 'epson', recommended: true, printMode: 'append' },
  { model: 'TM-T20II', driver: 'epson', recommended: true, printMode: 'append' },
  { model: 'TM-T82', driver: 'epson', recommended: true, printMode: 'append' },
  { model: 'TM-T82II', driver: 'epson', recommended: true, printMode: 'append' },
  { model: 'TM-T88V', driver: 'epson', recommended: true, printMode: 'append' }
]

/** Epson — GloriaFood other supported */
const EPSON_OTHER: PrinterCatalogItem[] = [
  { model: 'TM-m30', driver: 'epson', printMode: 'append' },
  { model: 'TM-m30II', driver: 'epson', printMode: 'append' },
  { model: 'TM-m30II-NT', driver: 'epson', printMode: 'append' },
  { model: 'TM-T20', driver: 'epson', printMode: 'append' },
  { model: 'TM-T20X', driver: 'epson', printMode: 'append' },
  { model: 'TM-T70II', driver: 'epson', printMode: 'append' },
  { model: 'TM-T88IV', driver: 'epson', printMode: 'append' },
  { model: 'TM-T82III', driver: 'epson', printMode: 'append' },
  { model: 'TM-T82IIIL', driver: 'epson', printMode: 'append' },
  { model: 'TM-T88VI', driver: 'epson', printMode: 'append' }
]

export const PRINTERS: PrinterCatalogItem[] = [
  ...STAR_PRINTERS,
  ...EPSON_RECOMMENDED,
  ...EPSON_OTHER
]

export const getPrintersByDriver = (driver: PrinterDriver): PrinterCatalogItem[] =>
  PRINTERS.filter((printer) => printer.driver === driver)

export const normalizePrinterDriver = (printer?: { driver?: string } | null): PrinterDriver =>
  printer?.driver === 'epson' ? 'epson' : 'star'

/** Normalize stored printers for settings / auto-print (legacy → star). */
export const normalizePrintersList = (printers?: any[] | null) =>
  (Array.isArray(printers) ? printers : []).map((item) => ({
    ...item,
    driver: normalizePrinterDriver(item),
    printMode: item?.printMode || (normalizePrinterDriver(item) === 'epson' ? 'append' : item?.printMode),
    paperWidthMm: resolvePaperWidth(item?.paperWidthMm).paperWidthMm
  }))
