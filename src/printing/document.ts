/**
 * The ticket as a document: a PDF to share and the system's print dialog. Both print the ticket's own text in a
 * fixed pitch (what the preview shows), through the libraries the order summary used (`react-native-html-to-pdf` on
 * iOS, `react-native-print`). They need no printer saved. Android has no PDF library: its build leaves
 * `react-native-html-to-pdf` out (`react-native.config.js`), the system dialog draws the HTML and saves the PDF.
 */
import { Platform, Share } from 'react-native'
import RNPrint from 'react-native-print'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const ticketHtml = (text: string) =>
  `<html><head><meta charset="utf-8"/></head><body style="margin:24px"><pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(text)}</pre></body></html>`

export const pdfFileName = (order: any) => `order_${String(order?.id ?? 'ticket').replace(/[^\w.-]/g, '_')}`

export type DocumentResult = { ok: boolean, message?: string }

/** Opens the system's print dialog with the ticket. */
export const printWithSystem = async (text: string, jobName: string): Promise<DocumentResult> => {
  try {
    await RNPrint.print({ html: ticketHtml(text), jobName })
    return { ok: true }
  } catch (error: any) {
    return { ok: false, message: error?.message }
  }
}

/**
 * Hands the ticket over as a PDF: the share sheet with a generated file on iOS; on Android the system print dialog
 * with the ticket's HTML, whose "Save as PDF" writes the file (the same dialog the PDF path ended in before, without
 * the extra rendering step).
 */
export const sharePdf = async (text: string, order: any, jobName: string): Promise<DocumentResult> => {
  try {
    if (Platform.OS !== 'ios') {
      await RNPrint.print({ html: ticketHtml(text), jobName })
      return { ok: true }
    }
    // Required here, not imported at the top: its module is not linked on Android and `TurboModuleRegistry.getEnforcing` throws on load.
    const { generatePDF } = require('react-native-html-to-pdf')
    const result = await generatePDF({ html: ticketHtml(text), fileName: pdfFileName(order), base64: false })
    const filePath = result?.filePath || ''
    if (!filePath) return { ok: false }
    await Share.share({ title: jobName, url: filePath.startsWith('file://') ? filePath : `file://${filePath}` })
    return { ok: true }
  } catch (error: any) {
    return { ok: false, message: error?.message }
  }
}
