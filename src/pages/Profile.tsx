import * as React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useLanguage } from '@components';
import {
  UserProfileForm as ProfileController,
  SafeAreaContainerLayout,
  OText
} from '@ui';

const KeyboardView = styled.KeyboardAvoidingView`
  flex-grow: 1;
`;

interface Props {
  navigation: any;
  route: any;
}

const Profile = (props: Props) => {
  const theme = useTheme();
  const [, t] = useLanguage();

  const profileProps = {
    ...props,
    useSessionUser: true,
    isBusinessApp: true,
    useValidationFields: true,
    goToBack: () => props.navigation?.canGoBack() && props.navigation.goBack(),
    onNavigationRedirect: (route: string, params: any) =>
      props.navigation.navigate(route, params),
  };

  return (
    <>
      <KeyboardView
        enabled
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ backgroundColor: theme.colors.backgroundPage }}>
        <SafeAreaContainerLayout
          style={{
            backgroundColor: theme.colors.backgroundPage,
          }}>
          <ProfileController {...profileProps} />
        </SafeAreaContainerLayout>
      </KeyboardView>
    </>
  );
};

export default Profile;
