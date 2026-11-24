const ESC = 0x1B
const GS = 0x1D

const INIT = [ESC, 0x40]
const TOP_MARGIN = [ESC, 0x64, 0x02]
const FEED_LINES = [ESC, 0x64, 0x04]
const PARTIAL_CUT = [GS, 0x56, 0x42, 0x00]

const ESC_POS_DOTS_PER_COLUMN = 12

export const escPosColumnsFor = (ticketWidth: number) =>
  Math.floor(ticketWidth / ESC_POS_DOTS_PER_COLUMN)

const BASE64_ALPHABET ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const stripDiacritics = (text: string) =>
  typeof text.normalize === 'function'
    ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : text

export const sanitizeEscPosText = (text: string): string =>
  stripDiacritics(text.replace(/\r\n?/g, '\n'))
    .replace(/[^\x20-\x7E\n\t]/gu, '?')

const centerBlock = (text: string, columns?: number) => {
  if (!columns) return text
  const lines = text.split('\n')
  const widest = Math.max(0, ...lines.map((line) => line.length))
  const padding = Math.floor((columns - widest) / 2)
  if (padding <= 0) return text
  const margin = ' '.repeat(padding)
  return lines.map((line) => (line.length ? `${margin}${line}` : line)).join('\n')
}

export const buildEscPosReceipt = (
  text: string,
  { columns }: { columns?: number } = {}
): Uint8Array => {
  const body = centerBlock(sanitizeEscPosText(text), columns)
  const bodyBytes = Array.from(body, (char) => char.charCodeAt(0))
  return Uint8Array.from([...INIT, ...TOP_MARGIN, ...bodyBytes, ...FEED_LINES, ...PARTIAL_CUT])
}

export const chunkBytes = (bytes: Uint8Array, size: number): Uint8Array[] => {
  const step = Math.max(1, Math.floor(size))
  const chunks: Uint8Array[] = []
  for (let start = 0; start < bytes.length; start += step) {
    chunks.push(bytes.slice(start, start + step))
  }
  return chunks
}

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let output = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i]
    const second = bytes[i + 1]
    const third = bytes[i + 2]
    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0)
    output += BASE64_ALPHABET[(triplet >> 18) & 63]
    output += BASE64_ALPHABET[(triplet >> 12) & 63]
    output += second === undefined ? '=' : BASE64_ALPHABET[(triplet >> 6) & 63]
    output += third === undefined ? '=' : BASE64_ALPHABET[triplet & 63]
  }
  return output
}
