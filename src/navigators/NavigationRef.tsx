import * as React from 'react';

export const navigationRef: any = React.createRef();

/**
 * Opens a screen from outside React (a push notification, the new-order alert). A screen already open in the
 * stack is gone back to, as React Navigation 6's `navigate` did: 7 pushes a second one unless it is told to `pop`.
 */
export const navigate = (name: string, params?: any) => {
  navigationRef.current?.navigate(name, params, { pop: true });
};

/** The screen in front, whatever navigator it is in (`undefined` before the navigation is ready). */
export const currentRoute = (): { name: string, params?: any } | undefined =>
  navigationRef.current?.getCurrentRoute?.();

/** The order whose chat is the screen in front, if a chat is. */
export const openChatOrderId = (): number | undefined => {
  const route = currentRoute();
  if (route?.name !== 'OrderMessage') return undefined;
  const id = Number(route.params?.orderId ?? route.params?.order?.id);
  return Number.isFinite(id) ? id : undefined;
};

/** The list the Orders tab shows (`useOrdersSplit` tabs): the new orders, the ones in progress, both together (`active`, when the server combines them) or the history. */
export type OrdersTabList = 'new' | 'progress' | 'active' | 'history';

/** The chip of New an ask can name: Pending (status 0) or Preorder (status 13). */
export type OrdersNewStage = 'pending' | 'preorder';

/**
 * Takes the business to the Orders tab and asks it to select a list, from any tab and from any screen of the stack
 * (the stack is popped to the tabs first). The tab reads the request from its route's params (`MyOrders`:
 * `route.params.tab`); `at` makes two asks for the same list two different params, so the second one is also seen.
 * `stage` is the chip of New the ask opens (the order that rang is a preorder: `preorder`); without it, Pending.
 */
export const openOrdersTab = (tab?: OrdersTabList, stage?: OrdersNewStage) => {
  navigate('BottomTab', { screen: 'Orders', params: { tab, ...(stage && { stage }), at: Date.now() } });
};

/** Takes the business to the Messages tab, from any tab and from any screen of the stack. */
export const openMessagesTab = () => {
  navigate('BottomTab', { screen: 'Messages' });
};

/** Opens an order's chat (`OrderMessage`), from outside React. */
export const openOrderChat = (orderId: number | string) => {
  navigate('OrderMessage', { orderId, isFromRoot: true });
};

/** Opens an order's details (`OrderDetails`), from outside React. */
export const openOrderDetails = (orderId: number | string) => {
  navigate('OrderDetails', { orderId, isFromRoot: true });
};
