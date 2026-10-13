import * as React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNetInfo } from '@react-native-community/netinfo';

import BottomNavigator from '../navigators/BottomNavigator';
import OrderDetails from '../pages/OrderDetails';
import AcceptOrRejectOrder from '../pages/AcceptOrRejectOrder';
import OrderSummary from '../pages/OrderSummary';
import OrderMessage from '../pages/OrderMessage';
import BusinessProductListing from '../pages/BusinessProductListing';
import ProductOptions from '../pages/ProductOptions';
import Splash from '../pages/Splash';
import Sessions from '../pages/Sessions';
import PrinterSetup from '../pages/PrinterSetup';
import PrinterConfigure from '../pages/PrinterConfigure';
import TicketPreview from '../pages/TicketPreview';

import { useApi, useSession, useWebsocket } from '@components';

const Stack = createStackNavigator();

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
    <Stack.Navigator>
      {!loading ? (
        <>
          <Stack.Screen
            name="BottomTab"
            component={BottomNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrderDetails"
            component={OrderDetails}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AcceptOrRejectOrder"
            component={AcceptOrRejectOrder}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrderSummary"
            component={OrderSummary}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrderMessage"
            component={OrderMessage}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="BusinessProductListing"
            component={BusinessProductListing}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductOptions"
            component={ProductOptions}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Sessions"
            component={Sessions}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PrinterSetup"
            component={PrinterSetup}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PrinterConfigure"
            component={PrinterConfigure}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketPreview"
            component={TicketPreview}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Splash"
          component={Splash}
          options={{ headerShown: false }}
        />
      )}
    </Stack.Navigator>
  );
};

export default HomeNavigator;
