import React from 'react';
import { Platform } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { Container, LoginForm } from '@ui';
import RNRestart from 'react-native-restart'

import { useSession } from '@components'

const KeyboardView = styled.KeyboardAvoidingView`
  flex: 1;
`;

const LoginPropsAreEqual = (prevProps: any, nextProps: any) => {
  return prevProps.projectChanged === nextProps.projectChanged
    && prevProps.navigation === nextProps.navigation
    && prevProps.route === nextProps.route
}

export const Login = ({ navigation, route, projectChanged }: any) => {
  const theme = useTheme();
  const [, { login: loginMethod }] = useSession()

  const loginProps = {
    navigation,
    useLoginByCellphone: true,
    useLoginByEmail: true,
    allowedLevels: [0, 2],
    handleSuccessLogin: async (user: any) => {
      if (projectChanged) {
        await loginMethod({ user, token: user.session?.access_token })
        RNRestart.restart()
      }
    },
    onNavigationRedirect: (page: string) => {
      if (!page) return;
      navigation.navigate(page);
    },
    notificationState: route?.params?.notification_state,
    // useRootPoint: settings.use_root_point
  };

  return (
    <KeyboardView
      enabled
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Container style={{ backgroundColor: theme.colors.white }}>
        <LoginForm {...loginProps} />
      </Container>
    </KeyboardView>
  );
};

export default Login;
