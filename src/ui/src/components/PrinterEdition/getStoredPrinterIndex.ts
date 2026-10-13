export function getPrinterConnectionId (printer: any) {
  return printer?.portName || printer?.ip || printer?.bt || printer?.portName1 || ''
}

export function isSameStoredPrinter (stored: any, item: any) {
  if (!stored || !item) return false
  if (stored.model !== item.model) return false

  const storedId = getPrinterConnectionId(stored)
  const itemId = getPrinterConnectionId(item)
  if (storedId && itemId) {
    return storedId === itemId
  }

  return !storedId && !itemId
}

export function getStoredPrinterIndex ({
  printers,
  item,
  index
}: {
  printers: any[]
  item?: any
  index?: number | null
}) {
  if (!Array.isArray(printers)) return -1

  if (typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < printers.length) {
    return index
  }

  return printers.findIndex((printer) => isSameStoredPrinter(printer, item))
}
