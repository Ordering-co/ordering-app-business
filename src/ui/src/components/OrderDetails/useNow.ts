/**
 * The clock of a screen that counts (Waiting 00:42, Ready in 08:12): the one ticker of the orders list (a single
 * one-second interval shared by every subscriber), so the card of an order and its details panel, side by side on a
 * tablet's board, read the same `now` and show the same second (T3-C1: two intervals started apart were a second apart).
 * It does not tick (nor re-render) when nothing counts.
 */
export { useNow } from '../PreviousOrders/useNow'
