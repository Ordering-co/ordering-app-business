import React, { forwardRef, useImperativeHandle } from 'react'
import { ScrollView, ScrollViewProps } from 'react-native'
import { useTheme } from 'styled-components/native'
import { useRevealFocused } from '@/hooks/useRevealFocused'
import { themeSpace } from '@/theme/helpers'

/**
 * The scroll of a screen or a sheet that holds fields, inside a `KeyboardScreen` (or an `OBottomPopup`): it keeps the
 * focused field in sight over the keyboard (`useRevealFocused`, `md` of air under it), taps on a button while the
 * keyboard is up go through (`keyboardShouldPersistTaps='handled'`) and dragging the content closes the keyboard.
 * Any other `ScrollView` prop is kept; `onScroll`, `onLayout` and `onContentSizeChange` of the caller still run.
 */
interface Props extends ScrollViewProps {
  /**
   * The screen's main action is in the last stretch of the content (a form that is its own page: the login): with a field
   * focused the scroll goes on toward the end as far as the field's top stays in sight, so the action under the field is
   * over the keyboard with it (a short window, a tablet turned sideways). A drag does not close the keyboard on such a
   * screen (`keyboardDismissMode='none'`), so the user can scroll to the action by hand when it does not fit with the field.
   */
  keepEndInSight?: boolean
}

export const KeyboardScrollView = forwardRef<ScrollView, Props>(
  ({ onScroll, onScrollBeginDrag, onLayout, onContentSizeChange, onTouchEnd, keepEndInSight = false, ...rest }, forwarded) => {
    const theme: any = useTheme()
    const reveal = useRevealFocused(themeSpace(theme, 'md'), keepEndInSight)
    useImperativeHandle(forwarded, () => reveal.ref.current as ScrollView)
    return (
      <ScrollView
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode={keepEndInSight ? 'none' : 'on-drag'}
        scrollEventThrottle={16}
        {...rest}
        ref={reveal.ref}
        onScroll={(event) => { reveal.onScroll(event); onScroll?.(event) }}
        onScrollBeginDrag={(event) => { reveal.onScrollBeginDrag(); onScrollBeginDrag?.(event) }}
        onLayout={(event) => { reveal.onLayout(event); onLayout?.(event) }}
        onContentSizeChange={(width, height) => { reveal.onContentSizeChange(width, height); onContentSizeChange?.(width, height) }}
        onTouchEnd={(event) => { reveal.onTouchEnd(); onTouchEnd?.(event) }}
      />
    )
  }
)

export default KeyboardScrollView
