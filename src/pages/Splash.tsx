import React from 'react';
import styled from 'styled-components/native';
import { useTheme } from 'styled-components/native';
import {
  DeviceOrientationMethods,
  SafeAreaContainer,
} from '@ui';

const { useDeviceOrientation } = DeviceOrientationMethods

const LogoSplash = styled.ImageBackground`
  width: ${({ width } : any) => `${width}px`};
  height: ${({ height } : any) => `${height}px`};
  background-color: ${(props: any) => props.theme.colors.backgroundPage};
`;

const Splash = () => {
  const [orientationState] = useDeviceOrientation();
  const WIDTH_SCREEN = orientationState?.dimensions?.width
  const HEIGHT_SCREEN = orientationState?.dimensions?.height
  const theme = useTheme();

  return (
    <SafeAreaContainer style={{ backgroundColor: theme.colors.backgroundPage }}>
      <LogoSplash
        source={theme.images.general.loadingSplash}
        resizeMode="contain"
        width={WIDTH_SCREEN}
        height={HEIGHT_SCREEN}
      />
    </SafeAreaContainer>
  );
};

export default Splash;
