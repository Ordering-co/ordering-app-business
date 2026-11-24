import OrderMessage from '../../pages/OrderMessage';
import type { AppScreen } from './types';

/**
 * The stack screens of the messages area (the shell mounts them in the home stack). The Messages tab itself
 * (`pages/Messages`) is a tab of the bottom navigator, not a stack screen.
 *
 * `OrderMessage` params: `{ orderId }` (what the details' message button, a conversation's row and a message
 * push pass; `isFromRoot` from a push is ignored).
 */
export const messagesScreens: AppScreen[] = [
  { name: 'OrderMessage', component: OrderMessage, options: { headerShown: false } },
];
