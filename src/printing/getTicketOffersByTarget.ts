export const TICKET_OFFER_TARGET = {
  product: 1,
  serviceFee: 2,
  delivery: 3
} as const

export function getTicketOffersByTarget (offers: unknown, target: number) {
  if (!Array.isArray(offers)) return []
  return offers.filter((offer: any) => offer?.target === target)
}
