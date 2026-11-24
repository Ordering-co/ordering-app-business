import React, { useEffect } from 'react'

import { Icon, ODivider, OButton, OSelect } from '../shared'
import { ProfileRow } from '../UserProfileForm/ProfileRow'
import { LanguageSelectorParams } from '../../types'
import { languageLabel, languageSpoken } from './nativeNames'

import { LanguageSelector as LanguageSelectorController, useLanguage } from '@components'

interface Props extends LanguageSelectorParams {
  /** A line over the row, for the list it ends (the account's card): it is drawn with the row or not at all. */
  divided?: boolean
  /** Tells the profile whether the row is on screen (the languages arrive late, and a project may have only one). */
  onShownChange?: (shown: boolean) => void
  /**
   * What opens the sheet: `row`, the profile's account row (the default), or `link`, the login screen's trigger (the
   * globe and the current language's name, a ghost button).
   */
  variant?: 'row' | 'link'
}

/** The code of the language the app's own texts are written in when no dictionary applies (the `t` fallbacks). */
const FALLBACK_LANGUAGE = 'en'

/**
 * The app's language: a row of the profile's account card (`ProfileRow`, the current language as its value) or the login's link; it opens the
 * languages in a sheet (`OSelect`: the sheet "Language", a check on the current one, each in its own name; choosing
 * applies it at once through the controller). Nothing while the languages load or when the project has only one.
 *
 * What it shows is the language the texts are in. The controller's `currentLanguage` is the stored choice, and a stored
 * language the project has no texts for (the device kept "Spanish", the project has no Spanish dictionary for this app)
 * leaves every `t(key, fallback)` on its English fallback: the link then read "Spanish" over an English screen. When the
 * dictionary has loaded and is empty, the texts are the fallbacks, so the English entry of the list is the one shown.
 */
const LanguageSelectorUI = (props: Props) => {
  const { languagesState, currentLanguage, handleChangeLanguage, divided, onShownChange, variant = 'row' } = props
  const [languageState, t] = useLanguage()
  const languages: any[] = languagesState?.languages ?? []
  const shown = !languagesState?.loading && languages.length > 1

  useEffect(() => {
    onShownChange?.(shown)
  }, [shown, onShownChange])

  if (!shown) return null

  // The dictionary of a language the project has no texts for arrives empty: the screen is in the fallback's language.
  const dictionary = languageState?.dictionary
  const textsAreFallbacks = !!dictionary && !languageState?.loading && Object.keys(dictionary).length === 0
  const fallback = languages.find((language: any) => language?.code === FALLBACK_LANGUAGE)
  const applied = textsAreFallbacks && fallback ? fallback.code : currentLanguage

  const options = languages.map((language: any) => ({ value: language?.code, label: languageLabel(language) }))
  const current = languages.find((language: any) => language?.code === applied)

  return (
    <>
      {divided && variant === 'row' && <ODivider />}
      <OSelect
        title={t('LANGUAGE', 'Language')}
        options={options}
        value={applied}
        onSelect={(code) => handleChangeLanguage(code)}
        renderTrigger={({ open }) => variant === 'link'
          ? (
            <OButton
              testID='language-selector'
              appearance='ghost'
              color='neutral'
              size='md'
              icon={<Icon name='globe-outline' />}
              text={current ? languageLabel(current) : undefined}
              accessibilityLabel={`${t('LANGUAGE', 'Language')}: ${current ? languageSpoken(current) : ''}`}
              onClick={open}
            />
          )
          : (
            <ProfileRow
              testID='language-selector'
              icon='globe-outline'
              title={t('LANGUAGE', 'Language')}
              value={current ? languageLabel(current) : undefined}
              onPress={open}
            />
          )}
      />
    </>
  )
}

export const LanguageSelector = (props: Props) => {
  const languageProps = {
    ...props,
    UIComponent: LanguageSelectorUI
  }

  return <LanguageSelectorController {...languageProps} />
}

/** The sheet the login screen opens: the same selector, named for what it opens. */
export const LanguageSheet = LanguageSelector
