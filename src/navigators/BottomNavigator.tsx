import React from 'react';
import { View, Platform, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components/native';
import IconFA from 'react-native-vector-icons/FontAwesome5'
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@components';
import { OIcon, OText } from '@ui';

import Profile from '../pages/Profile';
import MyOrders from '../pages/MyOrders';
import Stores from '../pages/Stores';
import Messages from '../pages/Messages';

const Tab = createBottomTabNavigator();

const BottomNavigator = () => {
  const [, t] = useLanguage();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isIos = Platform.OS === 'ios';
  const windowHeight = Dimensions.get('window').height;

  const styles = StyleSheet.create({
    bottomTabs: {
      backgroundColor: theme.colors.white,
      borderTopWidth: 1,
      borderTopColor: theme.colors.tabBar,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.36,
      shadowRadius: 6.87,
      elevation: 11,
      paddingBottom: isIos ? (windowHeight < 845 ? 20 : 30) : insets.bottom,
      height: isIos ? (windowHeight < 845 ? 80 : 90) : (60 + insets.bottom),
      paddingTop: isIos ? 0 : 10,
    },
    tabIconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      paddingTop: 10
    },
    iconStyle: {
      marginBottom: 2
    }
  });

  const TabIcon = ({ focused, color, name, source, label, isFontAwesome }: any) => (
    <View style={styles.tabIconContainer}>
      {isFontAwesome ? (
        <IconFA
          name={name}
          size={24}
          color={color}
          style={styles.iconStyle}
        />
      ) : (
        <OIcon
          color={color}
          src={source}
          width={24}
          height={24}
          style={styles.iconStyle}
        />
      )}
      <OText
        color={focused ? theme.colors.textGray : color}
        size={12}>
        {label}
      </OText>
    </View>
  );

  return (
    <Tab.Navigator
      initialRouteName="BusinessList"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondaryLightColor,
        tabBarStyle: styles.bottomTabs,
        tabBarShowLabel: false,
        tabBarLabelPosition: 'below-icon'
      }}>
      <Tab.Screen
        name="Orders"
        component={MyOrders}
        options={{
          tabBarIcon: ({ focused, color }: any) => (
            <TabIcon
              focused={focused}
              color={color}
              name='list-alt'
              isFontAwesome={true}
              label={t('ORDERS', 'Orders')}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Messages"
        component={Messages}
        options={{
          tabBarIcon: ({ focused, color }: any) => (
            <TabIcon
              focused={focused}
              color={color}
              source={theme.images.general.messages}
              label={t('MESSAGES', 'Messages')}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Stores"
        component={Stores}
        options={{
          tabBarIcon: ({ focused, color }: any) => (
            <TabIcon
              focused={focused}
              color={color}
              source={theme.images.general.stores}
              label={t('BUSINESSES', 'Businesses')}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          tabBarIcon: ({ focused, color }: any) => (
            <TabIcon
              focused={focused}
              color={color}
              source={theme.images.general.profile}
              label={t('PROFILE', 'Profile')}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
