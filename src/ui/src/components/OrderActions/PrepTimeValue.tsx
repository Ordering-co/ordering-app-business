import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Keyboard, Pressable, StyleSheet, View } from 'react-native'
import { useTheme } from 'styled-components/native'

import { useLanguage } from '@components'
import { nativeTextStyle, themeOpacity } from '@/theme/helpers'
import { FieldError, OInput, OText } from '../shared'

/**
 * What the sheet learns when it asks the value to settle (`flush`): `value` is the minutes typed and accepted (null when
 * nothing was being typed, or the typing was empty and the previous value stays), `corrected` is true when the typed
 * number was outside the rule and was brought to the nearest limit instead (the sheet shows the corrected time and
 * waits for the next tap, so a mistyped "500" never goes out as 180 without being seen).
 */
export interface PrepTimeFlush { value: number | null, corrected: boolean }

export interface PrepTimeValueHandle {
  /** Ends the typing as the keyboard's Done would, and says what came of it. Used by the sheet's own buttons. */
  flush: () => PrepTimeFlush
}

interface Props {
  /** The minutes now (what the sheet would send). */
  minutes: number
  /** What the big figure shows at rest: `20 min`, or a time of day. */
  text: string
  /** The line under the figure at rest ("Ready by 12:50 PM", "New promised time"). */
  caption?: string | null
  /** The caption's test id, when it has had one before (`prep-ready-by`). */
  captionTestID?: string
  /** The inclusive limits of what can be typed. When `min > max` nothing can be typed and the figure is plain. */
  min: number
  max: number
  disabled?: boolean
  /** The line under the field while typing, `_min_` and `_max_` replaced; the default says "Minutes, from _min_ to _max_". */
  hint?: string
  /** What a screen reader says for the figure at rest, `_min_` replaced; the default names the preparation time. */
  spoken?: string
  /** Called with the minutes the typing ended on (already inside the rule). */
  onCommit: (minutes: number) => void
  /**
   * Called while typing with the number in the field when it is inside the rule, and with null when it is not, when the
   * field is empty and when the typing ends: what the sheet's own texts (its main button, the selected preset) follow.
   */
  onTyping?: (minutes: number | null) => void
  /** The figure's id; the button around it is `<id>-edit`, the field `<id>-input`, the caption `<id>-caption`. */
  testID: string
}

/** The digits of what was typed: no sign, no point, no letters, three at most (the rule's maximum has three). */
export const digitsOnly = (value: string): string => String(value ?? '').replace(/\D/g, '').slice(0, 3)

/**
 * The height of the stepper's line: the field's (`input.sizes.md`) or the stepper buttons' (`button.sizes.md`), the taller.
 * The figure's button, the field and the boxes of the sheet's minus and plus all take it.
 */
export const prepLineHeight = (theme: any): number =>
  Math.max(theme.native.components.input.sizes.md.height, theme.native.components.button.sizes.md.height)

const fill = (text: string, min: number, max: number) => text.replace('_min_', String(min)).replace('_max_', String(max))

/**
 * The preparation time as a figure that can be typed over (the accept and adjust-time sheets). At rest it is the big
 * figure of the stepper, in a button with the pressed state that says "Tap to type a value" to a screen reader: no
 * glyph beside it, tapping the number is the way in (the owner's choice, 2026-11-23). Tapped, it becomes a field of the
 * app's own `OInput` (the numbers keyboard, digits only) holding the minutes, with the unit after them and no button of
 * its own. Return / Done on the keyboard, leaving the field, putting the keyboard away and the sheet's own buttons
 * (Accept, the presets, the stepper) all end the typing: an empty field restores the previous value, a number outside
 * `min`..`max` is brought to the nearest limit (and said while typed). Any change of `minutes` from outside (a preset,
 * the stepper) ends the typing too: the last tap wins.
 *
 * The figure's button and the field are one line of the same height (`prepLineHeight`: the taller of the field and of the
 * stepper's buttons), so the sheet's minus and plus, each centred in a box of that height, stay level with the number
 * at rest and with the field while typing, and nothing moves when the typing starts.
 */
export const PrepTimeValue = forwardRef<PrepTimeValueHandle, Props>(({
  minutes, text, caption, captionTestID, min, max, disabled = false, hint, spoken, onCommit, onTyping, testID
}, ref) => {
  const theme: any = useTheme()
  const [, t] = useLanguage()
  const stepper = theme.native.components.stepper
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const editingRef = useRef(false)
  const draftRef = useRef('')
  const canType = !disabled && min <= max

  const styles = useMemo(() => StyleSheet.create({
    column: { alignItems: 'center', alignSelf: 'stretch' },
    // The target is the stepper's line (never under the smallest touch target), whatever the figure's own height.
    press: { minHeight: prepLineHeight(theme), flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: themeOpacity(theme, 'pressed') },
    figure: { ...nativeTextStyle(stepper.sizes.lg.value), color: stepper.base.value_color, textAlign: 'center' },
    // The typed digits are the same figure, in the field's box.
    typed: { ...nativeTextStyle(stepper.sizes.lg.value), color: stepper.base.value_color, textAlign: 'center' },
    unit: { alignSelf: 'center' }
  }), [theme, stepper])

  const setEditingNow = useCallback((on: boolean) => {
    editingRef.current = on
    setEditing(on)
    if (!on) onTyping?.(null)
  }, [onTyping])

  const settle = useCallback((): PrepTimeFlush => {
    if (!editingRef.current) return { value: null, corrected: false }
    const typed = draftRef.current
    setEditingNow(false)
    // Empty: nothing to say, the previous value stays.
    if (typed === '') return { value: null, corrected: false }
    const wanted = Number(typed)
    const inside = Math.min(max, Math.max(min, wanted))
    onCommit(inside)
    return { value: inside, corrected: inside !== wanted }
  }, [max, min, onCommit, setEditingNow])

  useImperativeHandle(ref, () => ({ flush: settle }), [settle])

  // A change that did not come from this field (a preset, the stepper) wins over what was being typed.
  useEffect(() => { if (editingRef.current) setEditingNow(false) }, [minutes, setEditingNow])

  // Putting the keyboard away ends the typing too, as leaving the field does: Android's back key and the iPad's "hide
  // keyboard" close the keyboard without taking the focus from the field, so no blur tells the field it is done.
  useEffect(() => {
    if (!editing) return undefined
    const hidden = Keyboard.addListener('keyboardDidHide', () => { settle() })
    return () => hidden.remove()
  }, [editing, settle])

  const begin = () => {
    draftRef.current = String(minutes)
    setDraft(draftRef.current)
    setEditingNow(true)
  }
  const type = (value: string) => {
    draftRef.current = digitsOnly(value)
    setDraft(draftRef.current)
    const typed = draftRef.current === '' ? null : Number(draftRef.current)
    onTyping?.(typed !== null && typed >= min && typed <= max ? typed : null)
  }

  const outside = draft !== '' && (Number(draft) < min || Number(draft) > max)
  const unit = t('MINUTES_UNIT', 'min')
  const label = (spoken ?? t('PREP_TIME_TAP_TO_TYPE', 'Preparation time, _min_ minutes. Tap to type a value')).replace('_min_', String(minutes))

  if (!editing) {
    return (
      <View style={styles.column}>
        <Pressable
          style={({ pressed }) => [styles.press, pressed && canType && styles.pressed]}
          onPress={canType ? begin : undefined}
          disabled={!canType}
          accessibilityRole={canType ? 'button' : 'text'}
          accessibilityLabel={canType ? label : undefined}
          testID={`${testID}-edit`}
        >
          <OText style={styles.figure} testID={testID}>{text}</OText>
        </Pressable>
        {!!caption && <OText preset='body_sm' color='text_muted' testID={captionTestID ?? `${testID}-caption`}>{caption}</OText>}
      </View>
    )
  }

  return (
    <View style={styles.column}>
      <OInput
        autoFocus
        isValueSync
        value={draft}
        onChange={type}
        type='number-pad'
        keyboardType='number-pad'
        returnKeyType='done'
        maxLength={3}
        hasError={outside}
        inputStyle={styles.typed}
        accessibilityLabel={t('PREP_TIME_FIELD', 'Preparation time in minutes')}
        onSubmitEditing={settle}
        onBlur={settle}
        iconCustomRight={<OText preset='body' color='text_muted' style={styles.unit}>{unit}</OText>}
        testID={`${testID}-input`}
      />
      {outside
        ? <FieldError testID={`${testID}-error`}>{fill(t('PREP_TIME_RANGE_ERROR', 'Enter a time from _min_ to _max_ minutes'), min, max)}</FieldError>
        : <OText preset='body_sm' color='text_muted' testID={`${testID}-caption`}>{fill(hint ?? t('PREP_TIME_TYPE_HINT', 'Minutes, from _min_ to _max_'), min, max)}</OText>}
    </View>
  )
})

PrepTimeValue.displayName = 'PrepTimeValue'

export default PrepTimeValue
