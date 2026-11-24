import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';

import { SkeletonBone, ONavbar, ODivider } from '../shared';
import { chatStyles } from '../Chat/styles';
import { quickMessagesOf } from '../Chat/quickMessages';
import { useLanguage, useSession } from '@components';
import {
  themeColor,
  themeControlHeight,
  themeRadius,
  themeGutter,
  themeMotion,
  themePart,
  themeSpace,
  themeVisible,
} from '@/theme/helpers';

/**
 * The chat screen while its order loads: bones (`components.skeleton`) with the sizes of what they stand for,
 * read from the same places of the theme as the real pieces: the top bar (the app's `ONavbar` with its back
 * arrow, the `header` title and subtitle and the two icon buttons at its end), the bubbles (`chat_bubble`: padding
 * and radius around a line of body text, with the time inside at its end when the theme shows it) and the composer,
 * drawn with the chat's own styles (`chatStyles`): "Send to" with its chips, the quick messages, and the row of
 * the image button, the `md` input and the send button of `chat_bubble.slots.send`. Only the bubbles' widths are
 * the skeleton's own.
 */
type BubbleProps = {
  mine?: boolean
  /** The bubble's share of the row. */
  width: `${number}%`
  delay: number
  styles: ReturnType<typeof skeletonStyles>
  height: number
  radius: number
}

const BubbleBone = ({ mine, width, delay, styles, height, radius }: BubbleProps) => (
  <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
    <SkeletonBone width={width} height={height} borderRadius={radius} delay={delay} />
  </View>
)

const skeletonStyles = (theme: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: themeColor(theme, 'background') },
  thread: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingTop: themeSpace(theme, 'md'),
    paddingBottom: themeSpace(theme, 'xs'),
    paddingHorizontal: themeGutter(theme),
  },
  row: { marginVertical: themeSpace(theme, 'xs') },
  rowMine: { alignItems: 'flex-end', paddingLeft: themeSpace(theme, 'xxxl') },
  rowTheirs: { alignItems: 'flex-start', paddingRight: themeSpace(theme, 'xxxl') },
  // A scroll's content runs sideways: its skeleton is a row.
  sideways: { flexDirection: 'row' },
})

export const ChatMessageSkeleton = ({ onBack }: { onBack?: () => void }) => {
  const theme: any = useTheme();
  const [, t] = useLanguage();
  const [{ user }] = useSession();
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => skeletonStyles(theme), [theme]);
  // The composer is the chat's own: the same styles, so it loads at its size.
  const chat = useMemo(() => chatStyles(theme, bottom), [theme, bottom]);

  const typography = theme.native.tokens.typography
  const bubble = theme.native.components.chat_bubble.base
  const header = theme.native.components.header.base
  const input = theme.native.components.input
  const chip = theme.native.components.chip
  const chipSize = theme.native.components.chat_bubble.slots.recipient.size
  const send = themePart(theme, 'button', `sizes.${theme.native.components.chat_bubble.slots.send.size}.height`)
  const buttonRadius = themePart(theme, 'button', 'shapes.icon.radius')
  // The send button's shape (`chat_bubble.slots.send.shape`): a round one is a disc.
  const sendRadius = theme.native.components.chat_bubble.slots.send.shape === 'round' ? themeRadius(theme, 'full', { fixed: true }) : buttonRadius
  const icon = themePart(theme, 'button', 'sizes.md.height')
  // A bubble: its padding around the text's lines, and the time under them, inside it, when it shows.
  const time = themeVisible(theme, 'messages.time') ? themeSpace(theme, 'xxs') + (bubble.meta.lineHeight as number) : 0
  const bubbleHeight = (lines: number) => 2 * bubble.padding_y + lines * typography.body.lineHeight + time
  // The bones light up one after another, a short step apart.
  const step = themeMotion(theme, 'fast').duration / 2
  // The quick messages' row, when the chat will draw one: the theme shows it and the project has texts for it.
  const showQuick = themeVisible(theme, 'messages.quick_messages') && quickMessagesOf(user?.level, t).length > 0

  return (
    <View style={styles.root} testID="chat-message-skeleton">
      <ONavbar
        onBack={onBack}
        rightButtons
        right={[0, 1].map((index) => (
          <SkeletonBone key={index} width={icon} height={icon} borderRadius={buttonRadius} delay={(2 + index) * step} />
        ))}
      >
        {/* The bar's own texts, one under the other with nothing between them, as the loaded bar draws them. */}
        <SkeletonBone width="48%" height={header.title.lineHeight} delay={step} />
        <SkeletonBone width="40%" height={typography.body_sm.lineHeight} delay={3 * step} />
      </ONavbar>
      <ODivider />

      <View style={styles.thread}>
        <BubbleBone width="64%" delay={6 * step} styles={styles} height={bubbleHeight(1)} radius={bubble.radius} />
        <BubbleBone mine width="46%" delay={7 * step} styles={styles} height={bubbleHeight(1)} radius={bubble.radius} />
        <BubbleBone width="72%" delay={8 * step} styles={styles} height={bubbleHeight(2)} radius={bubble.radius} />
        <BubbleBone mine width="58%" delay={9 * step} styles={styles} height={bubbleHeight(1)} radius={bubble.radius} />
      </View>

      <ODivider />
      <View style={[chat.toolbar, chat.toolbarInset]} testID='chat-message-skeleton-composer'>
        {/* Who receives the message: "Send to" and the chips, as the chat draws them. */}
        <View style={[chat.row, styles.sideways, chat.recipients]}>
          <SkeletonBone width={themeControlHeight(theme, 'md')} height={typography.body_sm.lineHeight} delay={4 * step} />
          {[0, 1].map((index) => (
            <SkeletonBone key={index} width={2 * themeControlHeight(theme, 'lg')} height={chip.sizes[chipSize].height} borderRadius={chip.base.radius} delay={(5 + index) * step} />
          ))}
        </View>
        {showQuick && (
          <View style={[chat.row, styles.sideways, chat.quickMessages]}>
            {[2, 3, 1].map((share) => share * themeControlHeight(theme, 'lg')).map((width, index) => (
              <SkeletonBone key={width} width={width} height={chip.sizes[chipSize].height} borderRadius={chip.base.radius} delay={(10 + index) * step} />
            ))}
          </View>
        )}
        <View style={chat.primary}>
          <SkeletonBone width={icon} height={icon} borderRadius={buttonRadius} delay={12 * step} />
          <View style={chat.field}>
            <SkeletonBone height={input.sizes.md.height} borderRadius={input.base.radius} delay={13 * step} />
          </View>
          <SkeletonBone width={send} height={send} borderRadius={sendRadius} delay={14 * step} />
        </View>
      </View>
    </View>
  );
};
