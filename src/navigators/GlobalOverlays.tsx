import React from 'react'
import { uiPiece } from './uiPiece'

/**
 * The pieces that live over the whole signed-in app, whatever tab or stack screen is in front, mounted once
 * (a modal opened from a tab that is not focused is not shown on iOS). Each is a component exported from `@ui`
 * under the name listed here, taking no props and drawing nothing while it has nothing to say:
 *
 * - `OrderActionsHost`: the one host of the order action sheets, the map and the review (area `orderActions`);
 * - `NewOrderAlert`: the alert of the new orders, ringing until they are opened or accepted (area `ordersLive`);
 * - `ConnectionHost`: the connection and offline pieces that are not a screen's own (area `ordersLive`).
 *
 * A name the barrel does not export yet is skipped: `<GlobalOverlays />` is a no-op until the areas ship theirs.
 * Add a name to the list and its piece is mounted, in this order, under the shell's own overlays.
 */
export const GLOBAL_OVERLAY_NAMES = ['OrderActionsHost', 'NewOrderAlert', 'ConnectionHost'] as const

export const GlobalOverlays = ({ names = GLOBAL_OVERLAY_NAMES }: { names?: readonly string[] }) => (
  <>
    {names.map((name) => {
      const Piece = uiPiece(name)
      return Piece ? <Piece key={name} /> : null
    })}
  </>
)

export default GlobalOverlays
