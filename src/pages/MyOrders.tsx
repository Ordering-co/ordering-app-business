import React from 'react';
import { StyleSheet, Platform, PlatformIOSStatic } from 'react-native';
import { useTheme } from 'styled-components/native';
import DeviceInfo from 'react-native-device-info';
import { useConfig } from '@components';
import {
  OrdersOption,
  OrdersListManager,
  SafeAreaContainerLayout,
  DeviceOrientationMethods,
  isManualDriverAssignmentEnabled
} from '@ui';

const { useDeviceOrientation } = DeviceOrientationMethods

const MyOrders = (props: any) => {
  const theme = useTheme();
  const { navigation, route } = props;
  const [orientationState] = useDeviceOrientation();
  const [{ configs }] = useConfig();

  const isPortrait = orientationState.orientation === 'portrait'
  const WIDTH_SCREEN = orientationState?.dimensions?.width

  const platformIOS = Platform as PlatformIOSStatic
  const isIpad = platformIOS.isPad
  const isTablet = DeviceInfo.isTablet();

  const MyOrderProps = {
    navigation,
    onNavigationRedirect: (page: string, params: any) => {
      if (!page) return;
      navigation.navigate(page, params);
    },
    paginationSettings: {
      initialPage: 1,
      pageSize: 50,
      controlType: 'infinity'
    },
    isBusinessApp: true,
    useDefualtSessionManager: true,
    orderDetailsProps: {
      navigation,
      driverAndBusinessId: true,
      isFetchDrivers: isManualDriverAssignmentEnabled(configs),
      isBusiness: true,
      isDisabledOrdersRoom: true,
      actions: { accept: 'acceptByBusiness', reject: 'rejectByBusiness', forceStatus: 'forceStatus' },
      orderTitle: {
        accept: { key: 'PREPARATION_TIME', text: 'Preparation time', btnKey: 'ACCEPT', btnText: 'Accept' },
        reject: { key: 'REJECT_ORDER', text: 'Reject Order', btnKey: 'REJECT', btnText: 'Reject' },
        forceStatus: { key: 'REASON_REQUIRED', text: 'Reason required', btnKey: 'CONFIRM', btnText: 'Confirm' }
      },
      appTitle: { key: 'BUSINESS_APP', text: 'Business App' }
    },
    checkNotification: true
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.backgroundPage,
    },
  });

  return (
    <SafeAreaContainerLayout style={styles.container}>
      {(isIpad || isTablet) && (!isPortrait || WIDTH_SCREEN >= 950) ? (
        <OrdersListManager {...MyOrderProps} />
      ) : (
        <OrdersOption {...MyOrderProps} />
      )}
    </SafeAreaContainerLayout>
  );
};

export default MyOrders;
