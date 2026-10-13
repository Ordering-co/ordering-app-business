import React from 'react';
import { useTheme } from 'styled-components/native';
import {
  SafeAreaContainer,
  NetworkError as NetworkErrorScreen,
} from '@ui';

const NetworkError = () => {
  const theme = useTheme();

  return (
    <SafeAreaContainer style={{ backgroundColor: theme.colors.white }}>
      <NetworkErrorScreen />
    </SafeAreaContainer>
  );
};

export default NetworkError;
