import React from 'react';
import { LoginForm } from '@ui';
import RNRestart from 'react-native-restart'

import { useSession } from '@components'
import { getProjectLoginSuccessPlan } from '../navigators/getProjectSwitchPlan'

/** The business app lets in the administrator (0) and the business owner (2): never a driver (4). */
export const ALLOWED_LEVELS = [0, 2]

export const Login = ({ navigation, route, projectChanged }: any) => {
  const [, { login: loginMethod }] = useSession()

  const loginProps = {
    navigation,
    allowedLevels: ALLOWED_LEVELS,
    handleSuccessLogin: async (user: any) => {
      const plan = getProjectLoginSuccessPlan({ projectChanged, user })
      if (!plan.shouldPersistSessionAndRestart) return
      await loginMethod(plan.session)
      RNRestart.restart()
    },
    onNavigationRedirect: (page: string) => {
      if (!page) return;
      navigation.navigate(page);
    },
    notificationState: route?.params?.notification_state,
  };

  // The form lays its own screen: its bar, its scroll and the buttons, all above the keyboard.
  return <LoginForm {...loginProps} />;
};

export default Login;
