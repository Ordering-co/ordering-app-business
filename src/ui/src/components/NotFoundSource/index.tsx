import React from 'react';
import { useTheme } from 'styled-components/native';
import { NotFoundSourceParams } from '../../types';
import { NotFound, NotFoundAction, NotFoundImage } from './styles';
import { IconTile, OButton, OText } from '../shared';
import { nativeTextStyle } from '@/theme/helpers';

/**
 * The empty or error state of a list or a screen (`components.empty_state`): a tile with a glyph in the
 * theme's color (the `tile` slot; a picture only when the caller passes one, nothing is bundled), a message,
 * an optional line under it (`text`), what the caller adds (its children) and an action (`btnTitle` and
 * `onClickButton`, the `action` slot). `icon` changes the glyph (Ionicons).
 *
 * The app's one empty state: every list or screen that has nothing to show (the orders, the stores and the menu, the
 * messages, the printers) draws this, so a theme edit of the tile, the title, the spacing or the action reaches all of them.
 * `fill` centres it in the room it is given.
 */
export const NotFoundSource = (props: NotFoundSourceParams) => {
  const { image, icon = 'file-tray-outline', content, text, btnTitle, btnDisabled = false, conditioned, onClickButton, fill, testID, actionTestID, footnote } = props;
  const theme: any = useTheme();
  const look = theme.native.components.empty_state;
  const tile = look.slots.tile;
  const action = look.slots.action;

  return (
    <NotFound fill={fill} testID={testID}>
      {image
        ? <NotFoundImage source={image} resizeMode='contain' testID='not-found-image' />
        : <IconTile icon={icon} size={tile.size} variant={tile.variant} round={tile.shape === 'round'} testID='not-found-icon' />}
      {!!content && (!conditioned || !image) && (
        <OText align='center' style={nativeTextStyle(look.base.title)}>
          {content}
        </OText>
      )}
      {!!text && (
        <OText align='center' style={{ ...nativeTextStyle(look.base.text), color: look.base.text_color }}>
          {text}
        </OText>
      )}
      {props.children}
      {onClickButton && (
        <NotFoundAction>
          <OButton
            onClick={() => onClickButton()}
            text={btnTitle}
            disabled={btnDisabled}
            size={action.size}
            appearance={action.appearance}
            color={action.color}
            testID={actionTestID}
          />
        </NotFoundAction>
      )}
      {!!footnote && <OText preset='body_sm' color='text_muted' align='center'>{footnote}</OText>}
    </NotFound>
  );
};
