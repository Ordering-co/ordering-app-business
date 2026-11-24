import React, { useState, useEffect, useMemo } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';

import settings from '../config.json';
import { isProjectOnboardingEnabled } from '../onboarding/prepareProjectStorage';
import { isLocalSimulatorMode } from '../onboarding/ios-local-mode';
import * as RootNavigation from '../navigators/NavigationRef';
import { SHELL_DEFAULTS, ShellContext } from '../context/ShellContext';
import { hideSplash } from '../utils/splash';

import {
  ToastType,
  useSession,
  useOrder,
  useWebsocket,
  useLanguage,
  useToast
} from '@components';

import HomeNavigator from './HomeNavigator';
import Home from '../pages/Home';
import Splash from '../pages/Splash';
import { getPushOpenOrderPlan } from './getPushOpenOrderPlan'
import { subscribeOrdersRegisterVibration } from './subscribeOrdersRegisterVibration'
import { usePushSetup } from './usePushSetup'
import { LAUNCH_NOTICE_MS, useLaunchTimeLimit } from './useLaunchTimeLimit'
import { signedOutScreens } from './routes'
import { FIRST_SIGNED_OUT_ROUTE, SHELL_ROUTES } from './routes/shellRoutes'
import { withShellProps } from './withShellProps'

const Stack = createStackNavigator();

/**
 * The root of the app: the launch (loading page, push setup, time limit), then the signed-out screens (Login first;
 * the project step before it only when the build asks, `use_root_point`) or the signed-in app (`HomeNavigator`).
 * It knows what the screens below need and cannot know themselves (the push state, whether the project changed,
 * the system's notification prompt): `ShellContext`.
 */
const RootNavigator = () => {
  const useProjectPicker = settings.use_root_point && !isProjectOnboardingEnabled(settings, __DEV__, isLocalSimulatorMode());
  const [, t] = useLanguage();
  const [{ auth, loading: sessionLoading, token, user }] = useSession();
  const [orderStatus] = useOrder();
  const socket = useWebsocket()
  const [, { showToast }] = useToast()
  const [loaded, setLoaded] = useState(false);
  const [projectChanged, setProjectChanged] = useState(false)
  const { isPushLoading, oneSignalState, openedPush, clearOpenedPush, requestNotificationPermission } = usePushSetup()

  useEffect(() => {
    if (!loaded && !orderStatus.loading && !isPushLoading.loading) {
      setLoaded(true);
    }
  }, [orderStatus, isPushLoading]);

  useEffect(() => {
    if (!sessionLoading && !isPushLoading.loading && !auth) {
      setLoaded(!auth);
    }
  }, [sessionLoading, isPushLoading]);

  // A push the business tapped: the chat for a message, the order's details for everything else (OQ-21), once the
  // app has loaded and someone is signed in (it waits for the login otherwise).
  useEffect(() => {
    const plan = getPushOpenOrderPlan({ loaded, auth, orderId: openedPush?.orderId, type: openedPush?.type })
    if (!plan.shouldOpen) return

    if (plan.screen === 'OrderMessage') {
      RootNavigation.openOrderChat(plan.pendingOrderId as any)
    } else {
      RootNavigation.openOrderDetails(plan.pendingOrderId as any)
    }

    clearOpenedPush()
  }, [loaded, openedPush, auth])

  useEffect(() => {
    if (!token) return

    return subscribeOrdersRegisterVibration(socket)
  }, [socket, user])

  // The project step changed the project (`change_project`): the login that follows saves the session and restarts.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('change_project', (newState: any) => {
      setProjectChanged(!!newState?.changed)
    })
    return () => subscription.remove()
  }, [])

  // A launch the API never answers goes on with what is cached after the limit: the app (or the login without a
  // session) in place of the loading page, the native splash gone and one notice. What waits for an answer runs
  // when it comes (useLaunchTimeLimit).
  const launched = useLaunchTimeLimit({
    loaded,
    sessionLoading,
    onLimit: ({ loaded: answered }) => {
      hideSplash()
      // Only a launch the API did not answer is a network problem.
      if (!answered) showToast(ToastType.Error, t('NETWORK_ERROR', 'Network Error'), LAUNCH_NOTICE_MS)
    }
  })

  const shell = useMemo(() => ({
    ...SHELL_DEFAULTS,
    projectChanged,
    notificationState: oneSignalState,
    requestNotificationPermission
  }), [projectChanged, oneSignalState, requestNotificationPermission])

  // Only the loading page is registered until the launch ends: naming a later screen then makes React Navigation
  // throw ("Couldn't find a screen named 'Login'"), seen on the three devices on 2026-11-19.
  const firstRouteName = auth ? SHELL_ROUTES.app : useProjectPicker ? SHELL_ROUTES.project : FIRST_SIGNED_OUT_ROUTE
  const initialRouteName = launched ? firstRouteName : SHELL_ROUTES.splash

  return (
    <ShellContext.Provider value={shell}>
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
        {!launched && (
          <Stack.Screen name={SHELL_ROUTES.splash} component={Splash} />
        )}
        {launched && (
          auth ? (
            <Stack.Screen name={SHELL_ROUTES.app} component={HomeNavigator} />
          ) : (
            <>
              {useProjectPicker && <Stack.Screen name={SHELL_ROUTES.project} component={Home} />}
              {signedOutScreens.map(({ name, component, options }) => (
                <Stack.Screen key={name} name={name} component={withShellProps(component)} options={options} />
              ))}
            </>
          )
        )}
      </Stack.Navigator>
    </ShellContext.Provider>
  );
};

export default RootNavigator;
