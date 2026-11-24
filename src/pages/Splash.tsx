import React from 'react';
import styled from 'styled-components/native';
import { themeColor } from '@/theme/helpers';

/**
 * The loading page after the native launch splash (react-native-bootsplash, `src/utils/splash.ts`): the same
 * logo, centred, at the size the native splash draws it (a build constant, not a theme value: the native splash
 * cannot change at run time), on the theme's `background`.
 *
 * It does not touch the native splash: `BusinessApp` hides it once, when the cached theme is read (and the launch
 * time limit does when the API never answers), so the first frame under the fade is the app's own.
 * The logo is `assets/bootsplash/logo-source.png` (1024 x 1024, transparent, a square mark), the one source of the
 * native splash's images: 120 pt on iOS, and 120 dp inside the 288 dp box of Android's launch theme, whose round mask
 * leaves little of a wide logotype. The Builder writes the brand's own over that file.
 */
const LAUNCH_LOGO = require('../../assets/bootsplash/logo-source.png');
const LAUNCH_LOGO_SIZE = 120;

const launchLogo = () => ({ width: LAUNCH_LOGO_SIZE, height: LAUNCH_LOGO_SIZE });

const SplashContainer = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }: any) => themeColor(theme, 'background')};
`;

const LaunchLogo = styled.Image`
  width: ${({ logo }: any) => logo.width}px;
  height: ${({ logo }: any) => logo.height}px;
`;

const Splash = () => (
  <SplashContainer testID="splash-container">
    <LaunchLogo logo={launchLogo()} source={LAUNCH_LOGO} resizeMode="contain" fadeDuration={0} />
  </SplashContainer>
);

export default Splash;
