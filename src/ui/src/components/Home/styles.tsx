import styled from 'styled-components/native'
import { spaceCss, themeColor } from '@/theme/helpers'

/** The project step looks like the login: a column on the page's background, a field and one button. */
export const Screen = styled.View`
  flex: 1;
  background-color: ${({ theme }: any) => themeColor(theme, 'background')};
`

/** The title and its line, close together. */
export const Texts = styled.View`
  gap: ${({ theme }: any) => spaceCss(theme, 'xs')};
`

/** The field, its error and the button. */
export const Form = styled.View`
  gap: ${({ theme }: any) => spaceCss(theme, 'md')};
`

/** The store's logo, as wide as the login's (a 4:1 box). */
export const Logo = styled.Image<{ box: { width: number, height: number } }>`
  width: ${({ box }: any) => box.width}px;
  height: ${({ box }: any) => box.height}px;
`

/** Without a logo in the theme: the store's glyph on its tile, at the logo's place. */
export const LogoFallback = styled.View`
  align-self: flex-start;
`
