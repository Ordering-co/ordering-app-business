import React, { useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import OneSignal from 'react-native-onesignal';
import {
  getMessaging,
  getToken,
  getInitialNotification,
  onNotificationOpenedApp,
  onMessage,
  onTokenRefresh
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { requestNotifications } from 'react-native-permissions';
import NetInfo from '@react-native-community/netinfo';

dayjs.extend(isSameOrAfter);
dayjs.extend(utc);

import settings from '../config.json';
import * as RootNavigation from '../navigators/NavigationRef';

import { useSession, useConfig, useOrder, useWebsocket, useApi } from '@components';
import { StoreMethods } from '@ui';

import HomeNavigator from './HomeNavigator';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Forgot from '../pages/ForgotPassword';
import Splash from '../pages/Splash';
import { getPushOpenOrderPlan } from './getPushOpenOrderPlan'
import { getOneSignalSetupPlan, shouldRegisterPushToken } from './getOneSignalSetupPlan'
import { getFirebasePushSetupPlan, getOpenedPushOrderId, isFirebasePushEnabled } from './getFirebasePushSetupPlan'
import { subscribeOrdersRegisterVibration } from './subscribeOrdersRegisterVibration'

const Stack = createStackNavigator();
const { _retrieveStoreData, _setStoreData } = StoreMethods

const RootNavigator = () => {
  const [{ auth, loading: sessionLoading, token, user }] = useSession();
  const [orderId, setOrderId] = useState(null);
  const [orderStatus] = useOrder();
  const socket = useWebsocket()
  const [ordering] = useApi();
  const [{ configs, loading: configsLoading }] = useConfig();
  const [loaded, setLoaded] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState({ loading: true });
  const [oneSignalState, setOneSignalState] = useState<any>({
    notification_app: settings.notification_app,
  });
  const [generalProjectState, setGeneralProjectState] = useState<{ changed: boolean, setted: boolean }>({ changed: false, setted: false })

  const [connectionState, setConnectionState] = useState<{
    connection_status: boolean;
  } | null>(null);
  const firebaseUnsubscribersRef = useRef<Array<() => void>>([])

  const firebaseEnabled = isFirebasePushEnabled(configs)

  const firebasePushSetup = async () => {
    setIsPushLoading({ loading: true });
    const messaging = getMessaging()

    requestNotifications(['alert', 'sound', 'badge']).catch((error) => {
      console.log('Firebase push permission error:', error)
    })

    let fcmToken: string | null = null
    try {
      fcmToken = await getToken(messaging)
    } catch (error) {
      console.log('Firebase push token error:', error)
    }

    const nextState = {
      ...oneSignalState,
      notification_token: fcmToken,
      notification_provider: 'fcm'
    }
    setOneSignalState(nextState);

    if (fcmToken) {
      _setStoreData('notification_state', nextState);
    }

    firebaseUnsubscribersRef.current.forEach(unsubscribe => {
      try {
        unsubscribe()
      } catch (error) {
        console.log('Firebase push unsubscribe error:', error)
      }
    })
    firebaseUnsubscribersRef.current = [
      onNotificationOpenedApp(messaging, (remoteMessage: any) => {
        const openedOrderId = getOpenedPushOrderId(remoteMessage?.data)
        if (openedOrderId) {
          setOrderId(openedOrderId)
        }
      }),
      onMessage(messaging, async (remoteMessage: any) => {
        if (Platform.OS !== 'android' || !remoteMessage?.notification) {
          return
        }
        try {
          await notifee.displayNotification({
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data || {},
            android: {
              channelId: 'new_order_alarm',
              smallIcon: 'ic_launcher',
              pressAction: { id: 'default' },
              importance: AndroidImportance.HIGH
            }
          })
        } catch (error) {
          console.log('Firebase foreground display error:', error)
        }
      }),
      notifee.onForegroundEvent(({ type, detail }: any) => {
        if (type === EventType.PRESS) {
          const openedOrderId = getOpenedPushOrderId(detail?.notification?.data)
          if (openedOrderId) {
            setOrderId(openedOrderId)
          }
        }
      }),
      onTokenRefresh(messaging, (newToken: string) => {
        const refreshedState = {
          ...oneSignalState,
          notification_token: newToken,
          notification_provider: 'fcm'
        }
        setOneSignalState(refreshedState);
        _setStoreData('notification_state', refreshedState);
      })
    ]

    getInitialNotification(messaging)
      .then((remoteMessage: any) => {
        const openedOrderId = getOpenedPushOrderId(remoteMessage?.data)
        if (openedOrderId) {
          setOrderId(openedOrderId)
        }
      })
      .catch((error: any) => {
        console.log('Firebase initial notification error:', error)
      })

    setIsPushLoading({ loading: false });
  };

  const oneSignalSetup = async () => {
    setIsPushLoading({ loading: true });
    const data = {
      appId: configs?.onesignal_businessapp_id?.value,
      externalId: `${ordering?.project}-${user?.id}`,
      email: user?.email,
      cellphone: user?.cellphone
        ? user?.country_phone_code
          ? `+${user?.country_phone_code} ${user?.cellphone}`
          : user?.cellphone
        : ''
    }
    OneSignal.setLogLevel(6, 0);
    OneSignal.setAppId(data.appId);

    OneSignal.setNotificationOpenedHandler(({ notification }: any) => {
      if (notification?.additionalData?.order_id) {
        setOrderId(notification?.additionalData?.order_id);
      }
    });

    OneSignal.addSubscriptionObserver((event: any) => {
      if (event?.to?.userId) {
        setOneSignalState({
          ...oneSignalState,
          notification_token: event?.to?.userId,
        });
        _setStoreData('notification_state', {
          ...oneSignalState,
          notification_token: event?.to?.userId,
        });
      }
      if (!event.to?.isSubscribed) {
        OneSignal.addTrigger('prompt_ios', 'true');
      }
    });

    try {
      if (data.email) {
        OneSignal.setEmail(data.email);
      }

      if (data.cellphone) {
        OneSignal.setSMSNumber(data.cellphone);
      }

      if (data.externalId) {
        OneSignal.setExternalUserId(data.externalId);
      }
    } catch (error) {
      console.log('OneSignal setup error:', error);
    }

    OneSignal.promptForPushNotificationsWithUserResponse(async (response: any) => {
      console.log('Prompt response:', response);
    });

    const deviceState: any = await OneSignal.getDeviceState();
    setOneSignalState({
      ...oneSignalState,
      notification_token: deviceState?.userId,
    });

    if (deviceState?.userId) {
      _setStoreData('notification_state', {
        ...oneSignalState,
        notification_token: deviceState?.userId,
      });
    }

    setIsPushLoading({ loading: false });
  };

  useEffect(() => {
    if (!loaded && !orderStatus.loading && !isPushLoading.loading) {
      setLoaded(true);
    }
  }, [orderStatus, isPushLoading]);

  useEffect(() => {
    const plan = getPushOpenOrderPlan({ loaded, auth, orderId })
    if (!plan.shouldOpen) return

    RootNavigation.navigate('OrderDetails', {
      orderId: plan.pendingOrderId,
      isFromRoot: true,
    })

    setOrderId(null)
  }, [loaded, orderId, auth])

  useEffect(() => {
    if (!sessionLoading && !isPushLoading.loading && !auth) {
      setLoaded(!auth);
    }
  }, [sessionLoading, isPushLoading]);

  useEffect(() => {
    const plan = getOneSignalSetupPlan({
      configsLoading,
      onesignalAppId: firebaseEnabled ? null : configs?.onesignal_businessapp_id?.value,
      auth
    })
    if (plan.shouldSetup) {
      oneSignalSetup()
    }
    if (plan.shouldClearPushLoading && !firebaseEnabled) {
      setIsPushLoading({ loading: false })
    }
  }, [configsLoading, configs?.onesignal_businessapp_id?.value, auth])

  useEffect(() => {
    const plan = getFirebasePushSetupPlan({
      configsLoading,
      enabled: firebaseEnabled,
      auth
    })
    if (plan.shouldSetup) {
      firebasePushSetup()
    }
    if (!plan.shouldSetup && !configsLoading && firebaseEnabled) {
      setIsPushLoading({ loading: false })
    }
  }, [configsLoading, configs?.firebase_push_enabled?.value, auth])

  const subscribePushNotifications = async () => {
    if (!shouldRegisterPushToken({
      auth,
      notificationToken: oneSignalState.notification_token
    })) return

    setIsPushLoading({ loading: true });
    try {
      const url = `${ordering.root}/users/${user.id}/notification_tokens`
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          token: oneSignalState.notification_token,
          user_id: user.id,
          app: oneSignalState.notification_app,
          ...(oneSignalState.notification_provider
            ? { provider: oneSignalState.notification_provider }
            : {})
        })
      })
      setIsPushLoading({ loading: false });
    } catch (err) {
      setIsPushLoading({ loading: false });
    }
  }

  useEffect(() => {
    if (shouldRegisterPushToken({
      auth,
      notificationToken: oneSignalState.notification_token
    })) {
      subscribePushNotifications()
    }
  }, [oneSignalState.notification_token, auth])

  let netInfoSuscription: any = null;
  useEffect(() => {
    netInfoSuscription = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      netInfoSuscription && netInfoSuscription();
    };
  }, []);

  const handleConnectivityChange = (state: any) => {
    setConnectionState({ connection_status: state.isConnected });
  };

  useEffect(() => {
    if (!token) return

    return subscribeOrdersRegisterVibration(socket)
  }, [socket, user])

  useEffect(() => {
    const getProjectName = async () => {
      const data = await _retrieveStoreData('project_name');
      if (data) {
        setGeneralProjectState((prevState) => ({ ...prevState, setted: true }))
      }
    }
    getProjectName()
  }, [ordering.project])

  useEffect(() => {
    DeviceEventEmitter.addListener('change_project', (newState: any) => {
      setGeneralProjectState(() => newState)
    })
    return () => {
      DeviceEventEmitter.removeAllListeners('change_project')
    }
  }, [])

  return (
    <Stack.Navigator>
      {!loaded && (
        <Stack.Screen
          name="Splash"
          component={Splash}
          options={{ headerShown: false }}
        />
      )}
      {loaded && (
        <>
          {!auth ? (
            <>
              <Stack.Screen
                name="Home"
                component={Home}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Login"
                options={{ headerShown: false }}
                initialParams={{ notification_state: oneSignalState, }}
              >
                {props => <Login {...props} projectChanged={generalProjectState.changed} />}
              </Stack.Screen>
              <Stack.Screen
                name="Forgot"
                component={Forgot}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="MyAccount"
                component={HomeNavigator}
                options={{ headerShown: false }}
              />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator;
