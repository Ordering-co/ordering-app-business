import type { AppScreen } from './types'
import PrinterSetup from '../../pages/PrinterSetup'
import PrinterConfigure from '../../pages/PrinterConfigure'
import PrintTicketSettings from '../../pages/PrintTicketSettings'
import TicketPreview from '../../pages/TicketPreview'

/**
 * The stack screens of the printers area (the shell mounts the list). `Printers` is the list the profile opens.
 * The old route names `PrinterSetup` and `OrderSummary` are gone: nothing navigates to them (the print entry opens
 * `TicketPreview`, the profile opens `Printers`).
 */
export const printersScreens: AppScreen[] = [
  { name: 'Printers', component: PrinterSetup, options: { headerShown: false } },
  { name: 'PrinterConfigure', component: PrinterConfigure, options: { headerShown: false } },
  { name: 'PrintTicketSettings', component: PrintTicketSettings, options: { headerShown: false } },
  { name: 'TicketPreview', component: TicketPreview, options: { headerShown: false } }
]
