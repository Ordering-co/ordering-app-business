import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { ODivider, SkeletonBone } from '../shared';
import { messageListStyles } from './styles';
import { themeControlHeight, themeMotion, themePart, themeRadius } from '@/theme/helpers';

type MessageListSkeletonProps = {
  count?: number;
};

/**
 * The Messages list while it loads: `count` placeholder rows, laid out with the list's own styles
 * (`messageListStyles`: the row, its lines) with the app's line between rows, and the row's own pieces: the
 * customer's disc, the name and the time, the order's type and timer and the status badge, each as tall as the
 * piece it stands for, so a row has the size and the pitch of a real one. The count of unread messages is not
 * drawn: a row without any would not have it.
 */
export const MessageListSkeleton = ({ count = 5 }: MessageListSkeletonProps) => {
  const theme: any = useTheme();
  const styles = useMemo(() => messageListStyles(theme), [theme]);
  const row = theme.native.components.conversation_row;
  const avatar = themePart(theme, 'avatar', `sizes.${row.slots.avatar.size}.size`);
  const badge = themePart(theme, 'badge', 'sizes.sm.height');
  const badgeRadius = themePart(theme, 'badge', 'base.radius');
  const name = row.base.name.lineHeight as number;
  const meta = row.base.meta.lineHeight as number;
  const step = themeMotion(theme, 'fast').duration / 4;
  // The bones' own widths: a placeholder's room, from the size scale.
  const statusWidth = themeControlHeight(theme, 'xl');
  const timeWidth = themeControlHeight(theme, 'md');

  return (
    <View testID='message-list-skeleton'>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ODivider />}
          <View style={styles.row} testID='message-row-skeleton'>
            <SkeletonBone width={avatar} height={avatar} borderRadius={themeRadius(theme, 'full', { fixed: true })} delay={index * step * 2} />
            <View style={styles.info}>
              <View style={styles.head}>
                <SkeletonBone width='46%' height={name} delay={index * step * 2 + step} />
                <View style={styles.spacer} />
                <SkeletonBone width={timeWidth} height={meta} delay={index * step * 2 + step * 2} />
              </View>
              <View style={styles.line}>
                <SkeletonBone width='30%' height={meta} delay={index * step * 2 + step * 2} />
                <View style={styles.spacer} />
                <SkeletonBone width={timeWidth} height={meta} delay={index * step * 2 + step * 2} />
              </View>
              <View style={styles.line}>
                <SkeletonBone width={statusWidth} height={badge} borderRadius={badgeRadius} delay={index * step * 2 + step * 3} />
              </View>
            </View>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
};
