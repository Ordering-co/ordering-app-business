import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import Ionicons from '@react-native-vector-icons/ionicons/static';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons/static';
import { themeColor, themeIconSize, type IconLevel } from '@/theme/helpers';
import { canonicalGlyph } from './glyphs';

/**
 * The app's icon (decision D5): a glyph of Ionicons (`set='ion'`, the default)
 * or the Material Design Icons (`set='mci'`, the former MaterialCommunityIcons), at an icon size of the theme and in
 * a color role. A size or color the theme does not name is legacy and is
 * painted as given while the call sites are converted.
 *
 *   <Icon name='close' />
 *   <Icon set='mci' name='map-marker' size='sm' color='text_muted' />
 *   <Icon name={GLYPH.search} />   // the function's own glyph (shared/glyphs.ts): one per function
 */
export type IconSet = 'ion' | 'mci';

interface Props {
  name: string;
  set?: IconSet;
  size?: IconLevel | number;
  color?: string;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

const SETS: Record<IconSet, React.ComponentType<any>> = { ion: Ionicons, mci: MaterialCommunityIcons };

// `set: iconSet`, not the shorthand `set = 'ion'`: newer Hermes fails to
// compile a shorthand `set`/`get` with a default value.
const Icon = ({ name, set: iconSet = 'ion', size = 'md', color = 'text', style, testID }: Props): React.ReactElement => {
  const theme: any = useTheme();
  // One glyph per function: a name another screen picked for the same function is brought to the canonical one (glyphs.ts).
  const glyph = canonicalGlyph(iconSet, name);
  const Glyph = SETS[glyph.set];
  const pt = typeof size === 'number' ? size : themeIconSize(theme, size);
  const paint = theme.native.tokens.color[color] !== undefined ? themeColor(theme, color) : color;
  return <Glyph name={glyph.name} size={pt} color={paint} style={style} testID={testID} />;
};

export default Icon;
