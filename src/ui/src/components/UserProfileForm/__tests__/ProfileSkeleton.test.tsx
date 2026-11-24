import React from 'react'

import { defaultAppTheme } from '../../../../../theme/engine'
import { renderWithProviders } from '../../../../../../jest/helpers/renderWithProviders'
import { themeWithValues } from '../../../../../../jest/helpers/themeWithValues'
import { ProfileSkeleton, profileSkeletonMetrics } from '../ProfileSkeleton'

describe('ProfileSkeleton', () => {
  it('stands for the new layout: the photo and who the user is, then a card for the information, the account, support and log out', () => {
    const { getByTestId } = renderWithProviders(<ProfileSkeleton />)
    expect(getByTestId('profile-skeleton')).toBeTruthy()
  })

  it('draws no bone for a section the theme hides', () => {
    const all = renderWithProviders(<ProfileSkeleton />)
    const count = (view: any) => JSON.stringify(view.toJSON()).split('"borderRadius"').length
    const themeOverrides = themeWithValues((values) => {
      ;['profile_photo', 'information', 'support', 'logout'].forEach((key) => {
        values.pages.profile.sections.find((section: any) => section.key === key).visible = false
      })
    })
    const fewer = renderWithProviders(<ProfileSkeleton />, { themeOverrides })
    expect(count(fewer)).toBeLessThan(count(all))
  })

  it('sizes its pieces from the profile\'s own: the photo from profile_photo and the row from the control', () => {
    const { getByTestId } = renderWithProviders(<ProfileSkeleton />)
    expect(getByTestId('profile-skeleton')).toBeTruthy()
    const theme = defaultAppTheme()
    const m = profileSkeletonMetrics(theme)
    expect(m.photo).toBe(theme.native.components.profile_photo.base.size)
    expect(m.rowHeight).toBe(theme.native.tokens.size.lg)
  })
})
