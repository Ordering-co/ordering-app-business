import {
  DEFAULT_PAPER_WIDTH_MM,
  resolvePaperWidth
} from '../paperWidth'

describe('resolvePaperWidth', () => {
  it('keeps the existing 80 mm print values by default', () => {
    expect(DEFAULT_PAPER_WIDTH_MM).toBe(80)
    expect(resolvePaperWidth()).toEqual({
      paperWidthMm: 80,
      ticketWidth: 576,
      ticketWidthToShow: 37,
      fontSizeToPrint: 22
    })
  })

  it('returns the compact 58 mm print values', () => {
    expect(resolvePaperWidth(58)).toEqual({
      paperWidthMm: 58,
      ticketWidth: 384,
      ticketWidthToShow: 24,
      fontSizeToPrint: 16
    })
  })

  it('falls back to 80 mm for unsupported values', () => {
    expect(resolvePaperWidth(42).paperWidthMm).toBe(80)
  })
})
