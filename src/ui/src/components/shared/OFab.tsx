import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import OButton from './OButton';
import Icon from './Icon';
import { nativeShadowStyle, themeColor } from '@/theme/helpers';

/**
 * A round button floating over a map or a photo, as MapTracking.dc.html draws it: a white (`color.surface`) disc of
 * 44 (the `md` icon button), its glyph in the text color, with the map's floating shadow (`map_marker.shadow`), which
 * Identity does not take away (a shadow needs the opaque disc under it). The disc is the wrapper's; the button over
 * it is the theme's ghost icon button, so it keeps the press feedback and the 44 pt touch target.
 */
interface Props {
  iconName: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** The glyph is MaterialCommunityIcons' (Ionicons' otherwise). */
  materialIcon?: boolean
  accessibilityLabel?: string
}
const OFab = ({ iconName, materialIcon, onPress, style, accessibilityLabel }: Props) => {
  const theme: any = useTheme();
  const disc = useMemo(() => ({
    backgroundColor: themeColor(theme, 'surface'),
    borderRadius: theme.native.tokens.radius.full,
    ...nativeShadowStyle(theme.native.components.map_marker.base.shadow)
  }), [theme]);
  return (
    <View style={style}>
      <View style={disc}>
      <OButton
        iconOnly
        round
        appearance='ghost'
        color='neutral'
        size='md'
        icon={<Icon set={materialIcon ? 'mci' : 'ion'} name={iconName} size='md' />}
        onClick={onPress}
        accessibilityLabel={accessibilityLabel ?? iconName}
      />
      </View>
    </View>
  );
};

export default OFab;
