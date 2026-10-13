import { useEffect, useState } from 'react';
import { Dimensions } from 'react-native';

export const PORTRAIT = "portrait";
export const LANDSCAPE = "landscape";
export const LARGE_SCREEN_MIN_WIDTH = 768;

export const useDeviceOrientation = (): [{
  orientation: "portrait" | "landscape",
  dimensions: { width: number, height: number }
}] => {

  const { width, height } = Dimensions.get('window');

  const [dimensions, setDimensions] = useState({ width, height });
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    width < height ? PORTRAIT : LANDSCAPE
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window: { width, height } }) => {

      setDimensions({ width, height });

      if (width < height) {
        setOrientation(PORTRAIT);
      } else {
        setOrientation(LANDSCAPE);
      }

    })

    return () => subscription.remove()
  }, []);

  return [{ orientation, dimensions }];
}

export const useIsLargeScreen = (): boolean => {
  const [{ dimensions }] = useDeviceOrientation();

  return dimensions.width >= LARGE_SCREEN_MIN_WIDTH;
}

export const DeviceOrientationMethods = {
  PORTRAIT,
  LANDSCAPE,
  LARGE_SCREEN_MIN_WIDTH,
  useDeviceOrientation,
  useIsLargeScreen
}
