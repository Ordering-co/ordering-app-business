import styled from 'styled-components/native';
import { radiusCss } from '@/theme/helpers';

// `components.empty_state`: the box, the tile (or the caller's picture) over the message, and the action under it.
const look = (theme: any) => theme.native.components.empty_state.base;
const tile = (theme: any) => theme.native.components.icon_tile.sizes[theme.native.components.empty_state.slots.tile.size].size;
const px = (value: number) => `${value}px`;

export const NotFound = styled.View<{ fill?: boolean }>`
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  ${({ fill }: any) => (fill ? 'flex: 1;' : '')}
  gap: ${({ theme }: any) => px(look(theme).gap)};
  min-height: ${({ theme }: any) => px(look(theme).min_height)};
  padding-vertical: ${({ theme }: any) => px(look(theme).padding_y)};
  padding-horizontal: ${({ theme }: any) => px(look(theme).padding_x)};
`;

// A picture the caller passes: twice the tile's box, rounded as a dialog (`lg`, whatever Identity's level is).
export const NotFoundImage = styled.Image`
  width: ${({ theme }: any) => px(tile(theme) * 2)};
  height: ${({ theme }: any) => px(tile(theme) * 2)};
  border-radius: ${({ theme }: any) => radiusCss(theme, 'lg', { fixed: true })};
`;

// The action is as wide as its label, centered under the text (the kit: at most one soft 44 button).
export const NotFoundAction = styled.View`
  align-self: center;
  margin-top: ${({ theme }: any) => px(look(theme).actions_gap)};
`;
