export const DEFAULT_PAPER_WIDTH_MM = 80

export const PAPER_WIDTH_OPTIONS = [
  {
    paperWidthMm: DEFAULT_PAPER_WIDTH_MM,
    ticketWidth: 576,
    ticketWidthToShow: 37,
    fontSizeToPrint: 22
  },
  {
    paperWidthMm: 58,
    ticketWidth: 384,
    ticketWidthToShow: 24,
    fontSizeToPrint: 16
  }
] as const

export const resolvePaperWidth = (paperWidthMm?: number | string | null) =>
  PAPER_WIDTH_OPTIONS.find(({ paperWidthMm: width }) => width === Number(paperWidthMm)) ??
  PAPER_WIDTH_OPTIONS[0]
