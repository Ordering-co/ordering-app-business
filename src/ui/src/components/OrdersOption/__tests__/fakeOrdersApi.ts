/**
 * A stand-in for the SDK's `orders` request (`ordering.setAccessToken(token).orders().asDashboard().get(options)`): it keeps a list of
 * orders and answers as the API does for the `where` the app writes (status, store, "older than" an id), newest first, with the
 * pagination's total. `requests` holds every request it received.
 */
export interface Asked { statuses: number[], business?: string, beforeId?: number, page: number, pageSize: number }

export const fakeOrdersApi = (initial: any[]) => {
  const state = { orders: initial.slice(), failing: false, requests: [] as Asked[] }
  const get = jest.fn(async (options: any) => {
    const { page, page_size: pageSize, where } = options.query
    const status = where.find((item: any) => item.attribute === 'status')?.value ?? []
    const business = where.find((item: any) => item.attribute === 'business_id')?.value
    const before = where.find((item: any) => item.attribute === 'id')?.value?.value
    state.requests.push({ statuses: status, business, beforeId: before, page, pageSize })
    if (state.failing) throw new Error('Network request failed')
    const matching = state.orders
      .filter((order) => status.includes(order.status))
      .filter((order) => business === undefined || String(order.business_id) === String(business))
      .filter((order) => before === undefined || order.id < before)
      .sort((a, b) => b.id - a.id)
    const result = matching.slice((page - 1) * pageSize, page * pageSize)
    return { content: { error: false, result, pagination: { current_page: page, page_size: pageSize, total: matching.length, total_pages: Math.ceil(matching.length / pageSize) } } }
  })
  const ordering = { setAccessToken: () => ({ orders: () => ({ asDashboard: () => ({ get }) }) }) }
  return { ordering, state, get }
}
