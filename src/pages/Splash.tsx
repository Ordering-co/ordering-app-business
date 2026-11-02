import React from 'react';
import { Dimensions, Platform, StatusBar, useWindowDimensions } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import styled, { useTheme } from 'styled-components/native';

const LAUNCH_SCREEN = { width: 393, height: 852 };
const LAUNCH_SCREEN_IMAGE = { x: 76, y: 362, width: 250, height: 80 };
const NATIVE_SPLASH_MAX_DURATION = 5000;

const hideNativeSplash = () => SplashScreen.hide();

const SplashContainer = styled.View`
  flex: 1;
  background-color: ${(props: any) => props.theme.colors.backgroundPage};
`;

const LaunchScreenImage = styled.Image`
  position: absolute;
  left: ${({ frame }: any) => frame.left}px;
  top: ${({ frame }: any) => frame.top}px;
  width: ${({ frame }: any) => frame.width}px;
  height: ${({ frame }: any) => frame.height}px;
`;

const FullScreenImage = styled.Image`
  position: absolute;
  left: 0;
  bottom: ${({ bottom }: any) => bottom}px;
  width: ${({ screen }: any) => screen.width}px;
  height: ${({ screen }: any) => screen.height}px;
`;

const Splash = () => {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const screen = Dimensions.get('screen');
  const containerRef = React.useRef<any>(null);
  const [imageBottom, setImageBottom] = React.useState(0);

  const measureContainer = () => {
    containerRef.current?.measureInWindow((_x: number, y: number, _width: number, containerHeight: number) => {
      setImageBottom(y + (StatusBar.currentHeight ?? 0) + containerHeight - screen.height);
    });
  };

  React.useEffect(() => {
    const timeout = setTimeout(hideNativeSplash, NATIVE_SPLASH_MAX_DURATION);
    return () => clearTimeout(timeout);
  }, []);

  if (Platform.OS === 'ios') {
    const frame = {
      left: width * LAUNCH_SCREEN_IMAGE.x / LAUNCH_SCREEN.width,
      top: height * LAUNCH_SCREEN_IMAGE.y / LAUNCH_SCREEN.height,
      width: width * LAUNCH_SCREEN_IMAGE.width / LAUNCH_SCREEN.width,
      height: height * LAUNCH_SCREEN_IMAGE.height / LAUNCH_SCREEN.height
    };

    return (
      <SplashContainer testID="splash-container">
        <LaunchScreenImage
          source={theme.images.general.loadingSplash}
          resizeMode="contain"
          frame={frame}
          onLoad={hideNativeSplash}
          onError={hideNativeSplash}
        />
      </SplashContainer>
    );
  }

  return (
    <SplashContainer
      testID="splash-container"
      ref={containerRef}
      onLayout={measureContainer}
    >
      <FullScreenImage
        source={theme.images.general.loadingSplash}
        resizeMode="cover"
        fadeDuration={0}
        bottom={imageBottom}
        screen={screen}
        onLoad={hideNativeSplash}
        onError={hideNativeSplash}
      />
    </SplashContainer>
  );
};

export default Splash;
