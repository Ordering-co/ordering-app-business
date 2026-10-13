import { _retrieveStoreData, _setStoreData } from '../../providers/StoreUtil'
import { getStoredPrinterIndex } from './getStoredPrinterIndex'

type SavePrinterArgs = {
  item: any
  type?: number
  ip?: string
  edit?: boolean
  isAdd?: boolean
  index?: number | null
}

/**
 * Upsert or delete a printer in AsyncStorage `printers` list.
 * Delete when neither edit nor isAdd (existing list-row trash flow).
 */
export const savePrinter = async ({
  item,
  type,
  ip,
  edit,
  isAdd,
  index
}: SavePrinterArgs) => {
  const stored = await _retrieveStoreData('printers')
  let printers = Array.isArray(stored) ? [...stored] : []
  const action = edit || isAdd
  const idx = getStoredPrinterIndex({ printers, item, index })

  if (idx !== -1 && !action) {
    printers.splice(idx, 1)
  } else {
    const current = idx !== -1 ? printers[idx] : undefined
    const nextType = type ?? current?.type ?? 1
    const driver = item?.driver === 'epson' || current?.driver === 'epson'
      ? 'epson'
      : 'star'
    const nextItem = {
      ...current,
      ...item,
      driver,
      type: nextType,
      ip: ip ?? current?.ip ?? '',
      portName: nextType === 3
        ? (item?.portName ?? 'USB')
        : nextType === 1 || !ip
          ? item?.bt ?? item.portName1 ?? current?.portName1
          : ip
    }
    if (edit && idx !== -1) {
      printers[idx] = nextItem
    } else {
      printers.push(nextItem)
    }
  }

  await _setStoreData('printers', printers)
  return printers
}
