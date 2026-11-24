import React from 'react'

import { OBottomPopup, OListRow, useConfirm } from '../shared'
import { useLanguage } from '@components'

interface Props {
  open: boolean
  onClose: () => void
  onTakePhoto: () => void
  onChooseFromGallery: () => void
  /** The user has a photo: only then is there one to remove. */
  hasPhoto?: boolean
  /** Removes the photo (the controller's `handleRemovePhoto`; without it the sheet has no such row). */
  onRemovePhoto?: () => void
}

/**
 * What the user can do with the profile photo, in the app's sheet (`OBottomPopup`): take a photo, choose one from
 * the gallery and, when there is a photo and the controller can clear it, remove it. Removing is the one choice that
 * loses something, so it asks first in the themed dialog: accepting closes the sheet and removes the photo,
 * cancelling leaves the sheet as it was.
 */
export const ProfilePhotoSheet = ({ open, onClose, onTakePhoto, onChooseFromGallery, hasPhoto, onRemovePhoto }: Props) => {
  const [, t] = useLanguage()
  const confirm = useConfirm()
  const canRemove = !!hasPhoto && typeof onRemovePhoto === 'function'

  const askToRemove = () => confirm({
    message: t('QUESTION_REMOVE_PHOTO', 'Are you sure that you want to remove your photo?'),
    acceptText: t('REMOVE', 'Remove'),
    destructive: true,
    onAccept: () => {
      onClose()
      onRemovePhoto?.()
    }
  })

  return (
    <OBottomPopup open={open} onClose={onClose} title={t('PROFILE_PHOTO', 'Profile photo')} closeIcon padded transparent animationType='slide' testID='profile-photo-sheet'>
      <OListRow plain testID='photo-take' icon='camera-outline' title={t('TAKE_PHOTO', 'Take a photo')} chevron={false} onPress={onTakePhoto} />
      <OListRow plain testID='photo-gallery' icon='image-outline' title={t('CHOOSE_FROM_GALLERY', 'Choose from the gallery')} chevron={false} last={!canRemove} onPress={onChooseFromGallery} />
      {canRemove && (
        <OListRow plain testID='photo-remove' icon='trash-outline' title={t('REMOVE_PHOTO', 'Remove photo')} danger chevron={false} last onPress={askToRemove} />
      )}
    </OBottomPopup>
  )
}
