import { useCallback, useEffect, useRef } from 'react'
import { Keyboard, KeyboardEvent, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, TextInput } from 'react-native'

import { keyboardTakesRoom } from '@/hooks/useKeyboardVisible'

/**
 * Where a scroll must go to show a field: `null` when the field is in sight already. `top` and `bottom` are the
 * field's edges in the scroll's content (`gap` of air included), `offset` the scroll's position and `room` the height
 * it shows. A field taller than the room (a text area that grows as it is typed in) shows its end, where the typing is.
 */
export const revealOffset = ({ top, bottom, offset, room, end }: { top: number, bottom: number, offset: number, room: number, end?: number }) => {
  let next = offset
  if (bottom > offset + room) next = bottom - room
  else if (top < offset) next = top
  // `end`: the content's height, when the screen's main action is in the last stretch of it (a form that is its own page).
  // The action is under the field and under whatever follows it (a divider, a second button, the version line), so the
  // end of the content is usually further than a strip over the keyboard can show together with the field. The scroll
  // goes on toward the end as far as the field's top stays in sight: the field first, then as much of what follows it
  // (the action) as the strip holds. A field the end can be reached with (a short form) ends at the content's end.
  if (end !== undefined && end > room) {
    const reach = Math.min(end - room, top)
    if (reach > next) next = reach
  }
  next = Math.max(0, next)
  return next === offset ? null : next
}

/**
 * Keeps the focused field of a scroll in sight over the keyboard: the third part of the app's keyboard rule (the
 * screen's `KeyboardScreen` lifts the room, `OBottomBar` sits its padding over the keyboard). Used by
 * `KeyboardScrollView`; a screen does not call it.
 *
 * The field is the one the system says has the focus (`TextInput.State`), measured against the scroll's content, so
 * no field has to be wired. The room the scroll shows is final only once the keyboard's avoiding view has finished, so
 * the reveal is repeated each time something it depends on settles: the keyboard's show / frame events, the scroll's
 * layout (its room), the content's size (the field growing as it is typed in) and a touch on the scroll (a field
 * tapped while the keyboard is up takes the focus after the touch ends).
 */
export const useRevealFocused = (gap: number, keepEnd = false) => {
  const ref = useRef<any>(null)
  const measures = useRef({ offset: 0, room: 0, content: 0 })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // A touch that scrolled the content is the user's own scroll (to the button, with the keyboard still up): it is
  // not a tap on a field, so it must not pull the scroll back to the field.
  const dragged = useRef(false)

  const reveal = useCallback(() => {
    const scroll = ref.current
    const input: any = TextInput.State?.currentlyFocusedInput?.()
    const content = scroll?.getInnerViewRef?.()
    if (!scroll || !input?.measureLayout || !content || !measures.current.room) return
    input.measureLayout(
      content,
      (_x: number, y: number, _width: number, height: number) => {
        const { offset, room, content: contentHeight } = measures.current
        const next = revealOffset({ top: y - gap, bottom: y + height + gap, offset, room, end: keepEnd && contentHeight ? contentHeight : undefined })
        if (next !== null) scroll.scrollTo({ x: 0, y: next, animated: true })
      },
      () => {} // a field outside this scroll (a composer pinned under it) is not this scroll's to reveal
    )
  }, [gap, keepEnd])

  useEffect(() => {
    // `keyboardDidChangeFrame` is iOS's: the keyboard changing its height (the suggestions bar, another keyboard).
    // A keyboard that takes no room (a floating Gboard) covers nothing: its events do not move the scroll.
    const subscriptions = ['keyboardDidShow', 'keyboardDidChangeFrame'].map((event) =>
      Keyboard.addListener(event as any, (frame?: KeyboardEvent) => (!frame?.endCoordinates || keyboardTakesRoom(frame.endCoordinates)) && reveal()))
    return () => {
      subscriptions.forEach((subscription) => subscription.remove())
      if (timer.current) clearTimeout(timer.current)
    }
  }, [reveal])

  return {
    ref,
    reveal,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => { measures.current.offset = event.nativeEvent.contentOffset.y },
    onLayout: (event: LayoutChangeEvent) => { measures.current.room = event.nativeEvent.layout.height; reveal() },
    onContentSizeChange: (_width?: number, height?: number) => { if (height !== undefined) measures.current.content = height; reveal() },
    onScrollBeginDrag: () => { dragged.current = true },
    onTouchEnd: () => {
      if (timer.current) clearTimeout(timer.current)
      if (dragged.current) { dragged.current = false; return }
      timer.current = setTimeout(reveal, 0)
    }
  }
}
