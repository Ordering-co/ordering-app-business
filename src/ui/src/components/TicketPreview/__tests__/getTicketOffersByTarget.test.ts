import {
  TICKET_OFFER_TARGET,
  getTicketOffersByTarget
} from '../getTicketOffersByTarget'

const productOffer = {
  name: 'Product Promo',
  target: TICKET_OFFER_TARGET.product,
  summary: { discount: 2 }
}

const deliveryOffer = {
  name: 'Free Delivery',
  target: TICKET_OFFER_TARGET.delivery,
  summary: { discount: 5 }
}

const serviceFeeOffer = {
  name: 'Fee Discount',
  target: TICKET_OFFER_TARGET.serviceFee,
  summary: { discount: 1 }
}

const mixedOffers = [productOffer, deliveryOffer, serviceFeeOffer]

describe('getTicketOffersByTarget', () => {
  it('returns an empty list when offers are missing', () => {
    expect(getTicketOffersByTarget(null, TICKET_OFFER_TARGET.delivery)).toEqual([])
    expect(getTicketOffersByTarget(undefined, TICKET_OFFER_TARGET.product)).toEqual([])
  })

  it('returns delivery offers without product discounts', () => {
    expect(getTicketOffersByTarget(mixedOffers, TICKET_OFFER_TARGET.delivery)).toEqual([
      deliveryOffer
    ])
  })

  it('returns product offers without delivery discounts', () => {
    expect(getTicketOffersByTarget(mixedOffers, TICKET_OFFER_TARGET.product)).toEqual([
      productOffer
    ])
  })

  it('returns service fee offers without substituting other targets', () => {
    expect(getTicketOffersByTarget(mixedOffers, TICKET_OFFER_TARGET.serviceFee)).toEqual([
      serviceFeeOffer
    ])
  })
})
