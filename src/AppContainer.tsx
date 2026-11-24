import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useTheme } from 'styled-components/native';
import RootNavigator from './navigators/RootNavigator';
import { navigationRef } from './navigators/NavigationRef';
import { navigationThemeOf } from './theme/navigation';

/**
 * The navigation container, painted in the theme: what React Navigation draws by itself (the card under a screen
 * during a transition, the frame of the bars) takes the theme's colors and font (`navigationThemeOf`). The one
 * status bar is mounted above it, by `BusinessApp`.
 */
const AppContainer = () => {
  const theme = useTheme();
  const navigationTheme = useMemo(() => navigationThemeOf(theme), [theme]);
  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default AppContainer;
