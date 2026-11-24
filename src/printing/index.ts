/**
 * Printing, as one module. The screens import only from here (`@/printing`).
 *
 * The print paths themselves (Star, Epson, generic ESC/POS over Bluetooth, the ticket text of each, the discovery
 * and the saved printer's shape) are the ones of the original app, moved unchanged from `TicketPreview/` and
 * `PrinterEdition/`; `usePrinting` is the facade the screens use over them.
 */
export { usePrinting, PRINT_TIMEOUT_MS, CANVAS_WAIT_MS, DISCOVERY_TIMEOUT_MS } from './usePrinting'
export type { Printing, PrintOutcome } from './usePrinting'

export {
  PRINTERS_STORAGE_KEY, AUTO_PRINT_STORAGE_KEY, TICKET_PRINT_OPTIONS_STORAGE_KEY, TICKET_COPIES_STORAGE_KEY,
  PRINTER_RESULTS_STORAGE_KEY, PRINTING_STORAGE_KEYS, MAX_COPIES,
  listPrinters, storePrinter, removePrinter, getAutoPrint, setAutoPrint, getTicketOptions, setTicketOptions,
  getCopies, setCopies, clampCopies, getLastResults, recordResults, printerKey, subscribePrinting
} from './storage'
export type { SavedPrinter, LastResult } from './storage'

export { CONNECTION, matchCatalogModel, readDiscovery } from './discovery'
export type { ConnectionType, DiscoveredPrinter, DiscoverResult } from './discovery'

export { buildPrinterItem, printerAddress, printerSummary, needsBitmapCanvas, ticketColumns, isValidAddress, IPV4, BLUETOOTH_ID, NICKNAME } from './printerRecord'
export type { PrinterDraft } from './printerRecord'

export { PRINTERS, getPrintersByDriver, normalizePrinterDriver, normalizePrintersList } from './printerList'
export type { PrinterDriver, PrinterCatalogItem } from './printerList'
export { PAPER_WIDTH_OPTIONS, DEFAULT_PAPER_WIDTH_MM, resolvePaperWidth } from './paperWidth'
export { isGenericPrinter, hasGenericPrinter, hasOnlyGenericPrinters } from './genericPrinters'
export {
  DEFAULT_TICKET_PRINT_OPTIONS, normalizeTicketPrintOptions, getTicketPrintOptionGroups
} from './ticketPrintOptions'
export type { TicketPrintOptions, TicketPrintOptionKey, TicketPrintOptionGroup } from './ticketPrintOptions'
export { ticketHtml } from './document'

export { SAMPLE_ORDER } from './sampleOrder'
