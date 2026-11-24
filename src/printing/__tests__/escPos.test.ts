import {
  sanitizeEscPosText,
  buildEscPosReceipt,
  chunkBytes,
  bytesToBase64
} from '../escPos'

describe('escPos', () => {
  describe('sanitizeEscPosText', () => {
    it('strips diacritics, replaces non-ASCII with ? and normalizes CRLF', () => {
      expect(sanitizeEscPosText('Señor Café à €\r\nok')).toBe('Senor Cafe a ?\nok')
    })

    it('keeps tabs and newlines', () => {
      expect(sanitizeEscPosText('a\tb\nc')).toBe('a\tb\nc')
    })
  })

  describe('buildEscPosReceipt', () => {
    const bodyOf = (bytes: Uint8Array) =>
      String.fromCharCode(...Array.from(bytes.slice(5, bytes.length - 7)))

    it('wraps the text with init, top margin, feed and partial cut commands', () => {
      expect(Array.from(buildEscPosReceipt('A\n'))).toEqual([
        0x1B, 0x40,
        0x1B, 0x64, 0x02,
        0x41, 0x0A,
        0x1B, 0x64, 0x04,
        0x1D, 0x56, 0x42, 0x00
      ])
    })

    it('centers the whole block on the paper using the widest line', () => {
      const bytes = buildEscPosReceipt('ab\nabcd\n\n', { columns: 8 })

      expect(bodyOf(bytes)).toBe('  ab\n  abcd\n\n')
    })

    it('does not pad when the widest line already fills the paper', () => {
      const bytes = buildEscPosReceipt('ab\nabcdefgh\n', { columns: 8 })

      expect(bodyOf(bytes)).toBe('ab\nabcdefgh\n')
    })

    it('does not pad when the printer columns are unknown', () => {
      expect(bodyOf(buildEscPosReceipt('ab\n'))).toBe('ab\n')
    })

    it('never emits bytes above 0x7F', () => {
      const bytes = buildEscPosReceipt('Ñandú 🍕 ¿ok?')
      expect(Array.from(bytes).every((byte) => byte <= 0x7F)).toBe(true)
    })
  })

  describe('chunkBytes', () => {
    it('splits into chunks of the given size preserving order', () => {
      const bytes = Uint8Array.from({ length: 45 }, (_, i) => i)
      const chunks = chunkBytes(bytes, 20)
      expect(chunks.map((chunk) => chunk.length)).toEqual([20, 20, 5])
      expect(chunks.flatMap((chunk) => Array.from(chunk))).toEqual(Array.from(bytes))
    })

    it('treats sizes below 1 as 1', () => {
      expect(chunkBytes(new Uint8Array([1, 2]), 0).map((chunk) => chunk.length)).toEqual([1, 1])
    })
  })

  describe('bytesToBase64', () => {
    it('encodes bytes as base64', () => {
      expect(bytesToBase64(new Uint8Array([0x1B, 0x40, 0x41]))).toBe('G0BB')
      expect(bytesToBase64(new Uint8Array([0x41, 0x42]))).toBe('QUI=')
      expect(bytesToBase64(new Uint8Array([0x41]))).toBe('QQ==')
    })

    it('returns an empty string for no bytes', () => {
      expect(bytesToBase64(new Uint8Array([]))).toBe('')
    })
  })
})
