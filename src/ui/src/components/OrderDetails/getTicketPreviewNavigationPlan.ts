export const TICKET_PREVIEW_ENTRY = {
  preview: 'preview',
  acceptAutoPrint: 'acceptAutoPrint'
} as const

export function getTicketPreviewNavigationPlan ({
  printerSettings,
  order,
  orderStatus,
  entry,
  autoPrintEnabled
}: {
  printerSettings?: unknown
  order?: unknown
  orderStatus?: unknown
  entry?: unknown
  autoPrintEnabled?: unknown
}) {
  const screen = printerSettings ? 'TicketPreview' : 'OrderSummary'
  const fromAccept = entry === TICKET_PREVIEW_ENTRY.acceptAutoPrint

  return {
    screen,
    params: {
      printerSettings,
      order,
      orderStatus,
      shouldPrintOnMount: screen === 'TicketPreview' && fromAccept && !!autoPrintEnabled
    }
  }
}
