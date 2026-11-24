/**
 * The one door to printing: what a screen asks of the printers and the ticket, whichever brand and connection.
 * It is a facade over the unchanged print paths (`usePrinterCommands`: Star, Epson, generic; `useTicketPrintRun`),
 * adding only what the screens need around them: the saved list, the stored options, the text at a printer's width,
 * a result per printer (with the reason a ticket failed), a timeout, copies, a test ticket, the PDF and discovery.
 * Toasts stay inside the print paths; a result is also returned, so a screen can say it inline.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage, useToast, ToastType } from '@components'

import { getOrderStatus } from '../ui/src/utils'
import { PrintingHost } from '../ui/src/components/TicketPreview/PrintingHost'
import { usePrinterCommands } from './usePrinterCommands'
import { useTicketPrintRun } from './useTicketPrintRun'
import { escPosColumnsFor } from './escPos'
import { resolvePaperWidth } from './paperWidth'
import { normalizePrinterDriver, type PrinterDriver } from './printerList'
import { hasGenericPrinter } from './genericPrinters'
import { DEFAULT_TICKET_PRINT_OPTIONS, type TicketPrintOptions } from './ticketPrintOptions'
import { CONNECTION, readDiscovery, type ConnectionType, type DiscoverResult } from './discovery'
import { needsBitmapCanvas } from './printerRecord'
import { printWithSystem, sharePdf, type DocumentResult } from './document'
import {
  getAutoPrint, getCopies, getLastResults, getTicketOptions, listPrinters, printerKey, recordResults, subscribePrinting,
  type LastResult, type SavedPrinter
} from './storage'

/** A print that has not answered by then failed (an Epson send alone waits 15 s; Bluetooth connects and writes in chunks). */
export const PRINT_TIMEOUT_MS = 45000
/** How long a ticket for a Star TSP100 waits for the canvas (a web view) that draws its picture to come up. */
export const CANVAS_WAIT_MS = 30000
/** How long a discovery may take, whichever brand (Epson on Android waits up to 10 s, Bluetooth pairing is up to the user). */
export const DISCOVERY_TIMEOUT_MS = 30000

export type PrintOutcome = {
  printer: SavedPrinter
  key: string
  ok: boolean
  /** Why it failed, in the user's language. */
  message?: string
  at: number
}

type TicketTextOptions = {
  /** The printer the text is for (its brand and paper width); without one, a Star printer at 80 mm. */
  printer?: Partial<SavedPrinter> | null
  /** The options of a generic printer's ticket; the stored ones by default. */
  options?: Partial<TicketPrintOptions>
}

const withTimeout = <T,>(work: Promise<T>, ms: number, onTimeout: () => T): Promise<T> =>
  new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms)
    work.then(
      (value) => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); resolve(onTimeout()) }
    )
  })

/** The work's answer, or `onTimeout()` when it takes longer than `ms`; unlike `withTimeout`, a failure of the work is thrown. */
const raceTimeout = <T,>(work: Promise<T>, ms: number, onTimeout: () => T): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => resolve(onTimeout()), ms)
    work.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (error) => { clearTimeout(timer); reject(error) }
    )
  })

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const usePrinting = () => {
  const [, t] = useLanguage()
  const [toast, { showToast }] = useToast() as any
  const { generateCommands, generateGenericCommands, printButton, createBitmapFromText, discoveryPrinterPort } = usePrinterCommands()
  const { printTicket } = useTicketPrintRun()

  const [state, setState] = useState<{
    loaded: boolean
    printers: SavedPrinter[]
    autoPrint: boolean
    options: TicketPrintOptions
    copies: number
    results: Record<string, LastResult>
  }>({ loaded: false, printers: [], autoPrint: false, options: DEFAULT_TICKET_PRINT_OPTIONS, copies: 1, results: {} })
  const [banner, setBanner] = useState(false)
  // The canvas of a TSP100's ticket is a web view: mounted when a ticket first needs it (or a screen warms it), then kept.
  const [bitmapAsked, setBitmapAsked] = useState(false)

  const canvas: any = useRef(null)
  const ctx: any = useRef(null)
  const alive = useRef(true)
  const toastNow = useRef(toast)
  toastNow.current = toast

  const reload = useCallback(async () => {
    const [printers, autoPrint, options, copies, results] = await Promise.all([
      listPrinters(), getAutoPrint(), getTicketOptions(), getCopies(), getLastResults()
    ])
    if (alive.current) setState({ loaded: true, printers, autoPrint, options, copies, results })
  }, [])

  useEffect(() => {
    alive.current = true
    reload()
    const stop = subscribePrinting(() => { reload() })
    return () => { alive.current = false; stop() }
  }, [reload])

  const withStatus = useCallback((order: any) =>
    order && !order.orderStatus ? { ...order, orderStatus: getOrderStatus(order.status, t)?.value } : order, [t])

  /** The ticket as the printer will print it (its width and brand's text), as a string. Pure but for the language and the stored options. */
  const ticketText = useCallback((rawOrder: any, { printer, options }: TicketTextOptions = {}): string => {
    if (!rawOrder) return ''
    const order = withStatus(rawOrder)
    const driver = normalizePrinterDriver(printer)
    const width = resolvePaperWidth(printer?.paperWidthMm)
    return driver === 'generic'
      ? generateGenericCommands(order, escPosColumnsFor(width.ticketWidth), { ...state.options, ...options })
      : generateCommands(order, width.ticketWidthToShow)
  }, [generateCommands, generateGenericCommands, state.options, withStatus])

  const waitForCanvas = async () => {
    const limit = Date.now() + CANVAS_WAIT_MS
    while (!(canvas.current && ctx.current)) {
      if (Date.now() > limit) return false
      await pause(100)
    }
    return true
  }

  /** What the print path told the user (its error toast), read after it returned. */
  const lastError = async (before: unknown): Promise<string | undefined> => {
    await pause(0)
    const now: any = toastNow.current
    return now && now !== before && String(now.type).toUpperCase() === String(ToastType.Error).toUpperCase() ? now.message : undefined
  }

  const failure = (printer: SavedPrinter, message: string): PrintOutcome => ({ printer, key: printerKey(printer), ok: false, message, at: Date.now() })

  const remember = async (outcomes: PrintOutcome[], test = false) => {
    await recordResults(outcomes.map(({ printer, ok, at, message }) => ({
      printer,
      result: { ok, at, ...(message && { message }), ...(test && { test }) }
    })))
  }

  /** One printer, one ticket (`printTicket` of the unchanged print path), with its reason and a timeout. */
  const printOne = async (order: any, printer: SavedPrinter): Promise<PrintOutcome> => {
    const before = toastNow.current
    let results: any[]
    try {
      results = await raceTimeout<any[]>(
        printTicket({ order, printerSettings: [printer], canvas, ctx }),
        PRINT_TIMEOUT_MS,
        () => [null]
      )
    } catch (error) {
      // The ticket could not even be prepared (the canvas failed): tell the user, as the order screen always did.
      showToast(ToastType.Error, t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed'), 3000)
      return failure(printer, t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed'))
    }
    if (results[0] === true) return { printer, key: printerKey(printer), ok: true, at: Date.now() }
    const timedOut = results[0] === null
    const reason = timedOut ? undefined : await lastError(before)
    return failure(printer, reason ?? (timedOut
      ? t('PRINTER_TIMEOUT', 'Printer timed out. Check the network and try again.')
      : t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')))
  }

  /**
   * The ticket of `order` on each printer, `copies` times (a printer that fails stops getting copies). One outcome per
   * printer. `banner` shows the "Printing ticket..." banner of `host` while it runs (an automatic print has no screen to spin on).
   */
  const print = async ({ order, printers, copies = 1, banner: withBanner = false }: { order: any, printers?: SavedPrinter[], copies?: number, banner?: boolean }): Promise<PrintOutcome[]> => {
    const targets = printers ?? state.printers
    if (!order || !targets.length) return []
    const ticket = withStatus(order)
    if (withBanner && alive.current) setBanner(true)
    try {
      if (needsBitmapCanvas(targets)) setBitmapAsked(true)
      if (needsBitmapCanvas(targets) && !(await waitForCanvas())) {
        const outcomes = targets.map((printer) => failure(printer, t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')))
        await remember(outcomes)
        return outcomes
      }
      const outcomes: PrintOutcome[] = []
      for (const printer of targets) {
        let outcome = await printOne(ticket, printer)
        for (let copy = 1; copy < Math.max(1, copies) && outcome.ok; copy++) outcome = await printOne(ticket, printer)
        outcomes.push(outcome)
      }
      await remember(outcomes)
      return outcomes
    } finally {
      if (withBanner && alive.current) setBanner(false)
    }
  }

  /**
   * After an accept: prints the order on every saved printer when the auto-print switch is on (reads the storage at the
   * call, so a switch just changed counts). Resolves `[]` when it is off or there is no printer. Shows the "Printing ticket..."
   * banner of `host` while it runs.
   */
  const printOrder = async (order: any): Promise<PrintOutcome[]> => {
    const [printers, autoPrint, copies] = await Promise.all([listPrinters(), getAutoPrint(), getCopies()])
    if (!autoPrint || !printers.length || !order) return []
    return print({ order, printers, copies, banner: true })
  }

  /** A short ticket on one printer, to check the connection. Its result is stored like an order's. */
  const testPrint = async (printer: SavedPrinter): Promise<PrintOutcome> => {
    const driver = normalizePrinterDriver(printer)
    const width = resolvePaperWidth(printer?.paperWidthMm)
    const columns = driver === 'generic' ? escPosColumnsFor(width.ticketWidth) : width.ticketWidthToShow
    const line = '-'.repeat(columns)
    const name = printer?.nickname || printer?.model
    const text = [t('TEST_TICKET_TEXT', 'Test ticket'), name, `${printer?.model} · ${width.paperWidthMm} mm`, line, new Date().toLocaleString(), line, '', ''].join('\n')
    const useTextCommands = printer?.printMode === 'append' || driver !== 'star'
    const before = toastNow.current
    let outcome: PrintOutcome
    if (!useTextCommands) setBitmapAsked(true)
    if (!useTextCommands && !(await waitForCanvas())) {
      outcome = failure(printer, t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed'))
    } else {
      const sent: boolean | null = await withTimeout<boolean | null>(
        (async () => {
          try {
            const image = useTextCommands
              ? null
              : await createBitmapFromText(text, canvas, ctx, width.fontSizeToPrint, width.ticketWidth)
            return await printButton({
              portName: printer?.portName,
              type: printer?.type,
              driver,
              deviceName: printer?.model,
              ip: printer?.ip || printer?.portName,
              image,
              commandsText: useTextCommands ? text : null,
              ticketWidth: width.ticketWidth,
              showAlert: false
            })
          } catch (error) {
            return false
          }
        })(),
        PRINT_TIMEOUT_MS,
        () => null
      )
      outcome = sent === true
        ? { printer, key: printerKey(printer), ok: true, at: Date.now() }
        : failure(printer, (sent === null ? undefined : await lastError(before)) ?? (sent === null
          ? t('PRINTER_TIMEOUT', 'Printer timed out. Check the network and try again.')
          : t('ORDER_PRINTED_FAILED', 'Order not printed, connection failed')))
    }
    await remember([outcome], true)
    return outcome
  }

  const jobName = (order: any) => `${t('ORDER_NO', 'Order No.')} ${order?.id ?? ''}`.trim()

  const exportPdf = async (order: any, options: TicketTextOptions = {}): Promise<DocumentResult> => {
    const ticket = withStatus(order)
    return sharePdf(ticketText(ticket, options), ticket, jobName(order))
  }

  const systemPrint = async (order: any, options: TicketTextOptions = {}): Promise<DocumentResult> => {
    const ticket = withStatus(order)
    return printWithSystem(ticketText(ticket, options), jobName(order))
  }

  /** Every device a brand's discovery finds over a connection, not only the first. */
  const discover = async ({ brand, connection }: { brand: PrinterDriver, connection: ConnectionType }): Promise<DiscoverResult> => {
    const none = t('NO_PRINTERS_FOUND', 'No printers found')
    try {
      const found: any = await raceTimeout<any>(discoveryPrinterPort(connection, brand) as Promise<any>, DISCOVERY_TIMEOUT_MS, () => undefined)
      const devices = readDiscovery(found, brand, connection)
      // The print paths answer a refused permission with this sentence (and Android does not ask again once it is "never ask again").
      const permissionDenied = found === t('PRINTER_PERMISSION_DENIED', 'Bluetooth permission is required to find printers.')
      return { devices, ...(!devices.length && { message: typeof found === 'string' ? found : none }), ...(permissionDenied && { permissionDenied }) }
    } catch (error: any) {
      return { devices: [], message: error?.message || none }
    }
  }

  const warm = useCallback((printers?: unknown) => {
    if (needsBitmapCanvas(printers ?? state.printers)) setBitmapAsked(true)
  }, [state.printers])

  const host = useMemo(
    () => React.createElement(PrintingHost, { canvasRef: canvas, ctxRef: ctx, bitmap: bitmapAsked, banner }),
    [banner, bitmapAsked]
  )

  return {
    loaded: state.loaded,
    printers: state.printers,
    autoPrint: state.autoPrint,
    /** The printers an accepted order prints on: every saved one. */
    autoTargets: state.autoPrint ? state.printers : [],
    options: state.options,
    copies: state.copies,
    results: state.results,
    /** The last result of a printer (`undefined` until it printed), by the key `printerKey` gives. */
    resultOf: (printer: any): LastResult | undefined => state.results[printerKey(printer)],
    hasGenericPrinter: hasGenericPrinter(state.printers),
    reload,
    ticketText,
    print,
    printOrder,
    testPrint,
    exportPdf,
    systemPrint,
    discover,
    /** A screen that is about to print on these printers asks for the canvas now, so the first ticket does not wait for it. */
    warm,
    /** Render once in a screen that prints: the canvas a Star TSP100's ticket is drawn on, and the printing banner. */
    host
  }
}

export type Printing = ReturnType<typeof usePrinting>
export { CONNECTION }
