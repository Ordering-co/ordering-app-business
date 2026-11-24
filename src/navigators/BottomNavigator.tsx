import React from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';

import { AppTabBar } from '../ui/src/components/AppShell';
import { useLayout } from '../theme/platform';
import { themeColor, themeVisible } from '../theme/helpers';

import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import Stores from '../pages/Stores';
import Messages from '../pages/Messages';

const Tab = createBottomTabNavigator();

/** The navigator's bar, declared once: a function built inside the component would be a new type each render. */
const renderTabBar = (props: BottomTabBarProps) => <AppTabBar {...props} />;

/**
 * The four tabs. `AppTabBar` draws the bar (phone and a tablet held upright) or the rail (a tablet held sideways);
 * the navigator only has to put it on the right side: `tabBarPosition`. The tab names are the contract:
 * `Orders`, `Messages`, `Stores`, `Profile` (the first one opens first).
 *
 * The tabs are lazy: a screen is built the first time its tab opens. The Messages tab is the one exception: its
 * list is what the tab's unread count comes from, so it is built at launch (and, kept in the tree, follows the
 * socket), and the count is there before the business opens the tab. When the theme hides the tab there is no
 * count to feed, so it stays lazy and costs no call.
 */
const BottomNavigator = () => {
  const theme: any = useTheme();
  const { rail } = useLayout();
  const messagesVisible = themeVisible(theme, 'bottom_nav.messages');

  return (
    <Tab.Navigator
      initialRouteName="Orders"
      tabBar={renderTabBar}
      screenOptions={{
        headerShown: false,
        tabBarPosition: rail ? 'left' : 'bottom',
        sceneStyle: { backgroundColor: themeColor(theme, 'background') }
      }}>
      <Tab.Screen name="Orders" component={MyOrders} />
      <Tab.Screen name="Messages" component={Messages} options={{ lazy: !messagesVisible }} />
      <Tab.Screen name="Stores" component={Stores} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
