import { useLanguage, useToast, ToastType } from '@components'

import { usePrinterCommands } from './usePrinterCommands'
import { getPrintRunFeedback } from './getPrintRunFeedback'
import { escPosColumnsFor } from './escPos'
import { loadTicketPrintOptions } from './ticketPrintOptions'
import { hasGenericPrinter } from './genericPrinters'
import { resolvePaperWidth } from './paperWidth'
import { normalizePrinterDriver } from './printerList'

type PrintTicketParams = {
  order: any
  printerSettings: any
  canvas: any
  ctx: any
}

export const useTicketPrintRun = () => {
  const [, t] = useLanguage()
  const [, { showToast }] = useToast()
  const { printButton, generateCommands, generateGenericCommands, createBitmapFromText } = usePrinterCommands()

  const printTicket = async ({ order, printerSettings, canvas, ctx }: PrintTicketParams) => {
    const printers = Array.isArray(printerSettings) ? printerSettings : []
    const printOptions = hasGenericPrinter(printers) ? await loadTicketPrintOptions() : undefined
    const results = []
    for (const printer of printers) {
      const driver = normalizePrinterDriver(printer)
      const useTextCommands = printer?.printMode === 'append' || driver !== 'star'
      const paperWidth = resolvePaperWidth(printer?.paperWidthMm)
      const commandsText = driver === 'generic'
        ? generateGenericCommands(order, escPosColumnsFor(paperWidth.ticketWidth), printOptions)
        : generateCommands(order, paperWidth.ticketWidthToShow)
      const image = useTextCommands
        ? null
        : await createBitmapFromText(
          commandsText,
          canvas,
          ctx,
          paperWidth.fontSizeToPrint,
          paperWidth.ticketWidth
        )

      const ok = await printButton({
        portName: printer?.portName,
        type: printer?.type,
        driver,
        deviceName: printer?.model,
        ip: printer?.ip || printer?.portName,
        image,
        commandsText: useTextCommands ? commandsText : null,
        ticketWidth: paperWidth.ticketWidth,
        showAlert: false
      })
      results.push(ok)
    }

    if (getPrintRunFeedback(results).showSuccessToast) {
      showToast(ToastType.Info, t('ORDER_PRINTED_SUCCESS', 'Order printed'), 3000)
    }

    return results
  }

  return { printTicket }
}
