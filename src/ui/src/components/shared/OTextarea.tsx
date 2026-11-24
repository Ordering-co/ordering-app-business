import * as React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { nativeBoxStyle, nativeTextStyle, reservedBorder } from '@/theme/helpers';
import OText from './OText';
import { inputTint, textAreaInput } from './singleLineInput'

/**
 * A text area: the theme's input (`components.input`) with the focus state, `input.textarea_height` high
 * (90) unless the caller asks for `lines` of its text. A label goes above it, as a field's does.
 */
interface Props {
  /** A height of that many lines of the text, in place of `input.textarea_height`. */
  lines?: number;
  /** The label above the box (`field.label`). */
  label?: string;
  value?: string;
  placeholder?: string;
  onChange?: any;
  onFocus?: any;
  textTareaRef?: any;
  autoFocus?: boolean;
  testID?: string;
}

const OTextarea = (props: Props) => {
  const theme: any = useTheme();
  const [focused, setFocused] = React.useState(false)
  const input = theme.native.components.input
  const field = theme.native.components.field.base
  const styles = React.useMemo(() => {
    const text = nativeTextStyle(input.base.text)
    const lines = props.lines ?? 0
    // The same border room as a one-line field in every state: a text area's text starts where a field's does.
    const states = input.variants.default.states
    const ring = reservedBorder([input.base, states.focus, states.error, states.disabled])
    return StyleSheet.create({
      field: { width: '100%' },
      label: { ...nativeTextStyle(field.label), color: field.label_color, marginBottom: field.label_gap },
      box: {
        minHeight: props.lines ? undefined : input.base.textarea_height,
        borderRadius: input.base.radius,
        paddingHorizontal: input.base.padding_x,
        paddingVertical: input.base.icon_gap,
        ...nativeBoxStyle(input.base),
        ...ring(input.base),
      },
      focus: { ...nativeBoxStyle(states.focus), ...ring(states.focus, input.base) },
      text: { ...textAreaInput, ...text, color: input.base.text_color, minHeight: props.lines ? lines * text.lineHeight : input.base.textarea_height - (input.base.icon_gap + input.base.icon_gap) },
    })
  }, [input, field, props.lines]);
  const box = (
    <View style={[styles.box, focused && styles.focus]}>
      <TextInput
        testID={props.testID}
        ref={props.textTareaRef}
        onFocus={() => { setFocused(true); props.onFocus && props.onFocus() }}
        onBlur={() => setFocused(false)}
        onChangeText={(txt: any) => props.onChange(txt)}
        placeholder={props.placeholder}
        accessibilityLabel={props.label}
        placeholderTextColor={input.base.placeholder}
        {...inputTint(theme)}
        numberOfLines={props.lines}
        value={props.value}
        multiline={true}
        textAlignVertical='top'
        maxFontSizeMultiplier={1.3}
        autoFocus={props.autoFocus}
        style={styles.text}
      />
    </View>
  );
  return props.label
    ? <View style={styles.field}><OText style={styles.label}>{props.label}</OText>{box}</View>
    : box;
};

export default OTextarea;
