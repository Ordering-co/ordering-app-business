import * as React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNetInfo } from '@react-native-community/netinfo';

import BottomNavigator from '../navigators/BottomNavigator';
import Splash from '../pages/Splash';
import { signedInScreens } from './routes';
import { SHELL_ROUTES } from './routes/shellRoutes';
import { GlobalOverlays } from './GlobalOverlays';
import { NotificationPermissionPrompt } from './NotificationPermissionPrompt';
import { SocketReconnectProvider } from '../context/SocketReconnectContext';
import { UnreadMessagesProvider } from '../context/UnreadMessagesContext';

import { useApi, useSession, useWebsocket } from '@components';

const Stack = createStackNavigator();

/**
 * The signed-in app: the tabs, then every area's stack screens (`routes/<area>.tsx`, mounted as they come).
 *
 * What belongs to the signed-in app and not to a tab lives here, once, over whatever is in front: the socket rooms,
 * the providers of the reconnect catch-up and of the Messages tab's unread count (the list reports into it), the global
 * overlays (the new-order alert, the connection pieces) and the notification explainer sheet.
 */
const HomeNavigator = () => {
  const [{ loading, user }] = useSession();
  const socket = useWebsocket();
  const netInfo = useNetInfo();
  const [ordering] = useApi()

  React.useEffect(() => {
    if (user?.id && netInfo.isConnected) {
      const ordersRoom = {
        project: ordering.project,
        room: 'orders',
        user_id: user?.id,
        role: 'manager'
      }

      socket.join(ordersRoom);
      const messagesOrdersRoom =
        user?.level === 0 ? 'messages_orders' : `messages_orders_${user?.id}`;
      socket.join(messagesOrdersRoom);
    }
  }, [socket, user?.id, netInfo.isConnected]);

  return (
    <SocketReconnectProvider>
      <UnreadMessagesProvider>
        <Stack.Navigator initialRouteName={SHELL_ROUTES.tabs} screenOptions={{ headerShown: false }}>
          {!loading ? (
            <>
              <Stack.Screen name={SHELL_ROUTES.tabs} component={BottomNavigator} />
              {signedInScreens.map(({ name, component, options }) => (
                <Stack.Screen key={name} name={name} component={component} options={options} />
              ))}
            </>
          ) : (
            <Stack.Screen name={SHELL_ROUTES.splash} component={Splash} />
          )}
        </Stack.Navigator>
        {!loading && (
          <>
            <GlobalOverlays />
            <NotificationPermissionPrompt auth loaded />
          </>
        )}
      </UnreadMessagesProvider>
    </SocketReconnectProvider>
  );
};

export default HomeNavigator;
