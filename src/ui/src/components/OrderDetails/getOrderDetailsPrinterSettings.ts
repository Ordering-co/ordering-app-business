import { normalizePrintersList } from '../PrinterEdition/printerList'

export function getOrderDetailsPrinterSettings ({
  printers,
  autoPrint
}: {
  printers?: unknown
  autoPrint?: unknown
}) {
  const list = normalizePrintersList(Array.isArray(printers) ? printers : null)

  return {
    printerSettings: list.length ? list : '',
    autoPrintEnabled: !!autoPrint
  }
}
