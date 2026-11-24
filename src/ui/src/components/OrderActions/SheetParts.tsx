import React from 'react'
import { View } from 'react-native'

import { FieldError, Icon, OText, SectionTitle } from '../shared'

/**
 * The heading of a block of a sheet ("Preparation time", "Why are you rejecting it?"): the app's group heading, the
 * overline (`SectionTitle`, harmony H14), with, when the block has one, a line under it. The block's own gap sits under it.
 */
export const SheetLabel = ({ children, description, testID }: { children: React.ReactNode, description?: React.ReactNode, testID?: string }) => (
  <SectionTitle description={description} style={{ marginBottom: 0 }} testID={testID}>{children}</SectionTitle>
)

/** A line of metadata with a glyph before it. */
export const SheetNote = ({ icon, children, noteStyle, textStyle, testID }: { icon: string, children: React.ReactNode, noteStyle: any, textStyle: any, testID?: string }) => (
  <View style={noteStyle} testID={testID}>
    <Icon name={icon} color='text_muted' />
    <OText preset='body_sm' color='text_muted' style={textStyle}>{children}</OText>
  </View>
)

/** What a failed request said, under the sheet's action. */
export const SheetError = ({ children }: { children?: React.ReactNode }) =>
  children ? <FieldError testID='order-action-error'>{children}</FieldError> : null
