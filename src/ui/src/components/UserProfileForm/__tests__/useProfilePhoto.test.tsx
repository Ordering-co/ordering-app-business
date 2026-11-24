import { renderHook } from '@testing-library/react-native'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker'

import { useToast } from '@components'
import { useProfilePhoto } from '../useProfilePhoto'

jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }))

const answer = (picker: jest.Mock, response: any) =>
  picker.mockImplementation((_options: any, callback: any) => callback(response))

describe('useProfilePhoto', () => {
  const setup = () => {
    const onPicked = jest.fn()
    const onDone = jest.fn()
    const { result } = renderHook(() => useProfilePhoto({ onPicked, onDone }))
    const { showToast } = (useToast as jest.Mock)()[1]
    return { result, onPicked, onDone, showToast }
  }

  it('hands the picture over as the data URL the save takes, and says it is done', () => {
    const { result, onPicked, onDone, showToast } = setup()
    answer(launchImageLibrary as jest.Mock, { assets: [{ uri: 'file://a.jpg', type: 'image/jpeg', base64: 'QUJD' }] })
    result.current.chooseFromGallery()
    expect(onPicked).toHaveBeenCalledWith('data:image/jpeg;base64,QUJD')
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(showToast).not.toHaveBeenCalled()
  })

  it('asks the gallery and the camera for a small picture with its data', () => {
    const { result } = setup()
    answer(launchImageLibrary as jest.Mock, { didCancel: true })
    answer(launchCamera as jest.Mock, { didCancel: true })
    result.current.chooseFromGallery()
    result.current.takePhoto()
    expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', includeBase64: true, maxWidth: 200, maxHeight: 200 }), expect.any(Function))
    expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', includeBase64: true, cameraType: 'front' }), expect.any(Function))
  })

  it('says nothing when the user cancels the picker (the cancel is at the response\'s root, not in an asset)', () => {
    const { result, onPicked, onDone, showToast } = setup()
    answer(launchImageLibrary as jest.Mock, { didCancel: true })
    result.current.chooseFromGallery()
    answer(launchCamera as jest.Mock, { didCancel: true, assets: undefined })
    result.current.takePhoto()
    expect(onPicked).not.toHaveBeenCalled()
    expect(showToast).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('shows the picker\'s own error', () => {
    const { result, onPicked, showToast } = setup()
    answer(launchCamera as jest.Mock, { errorCode: 'camera_unavailable', errorMessage: 'Camera not available on device' })
    result.current.takePhoto()
    expect(showToast).toHaveBeenCalledWith('error', 'Camera not available on device')
    expect(onPicked).not.toHaveBeenCalled()
  })

  it('says "Image not found" when the picker gives no picture', () => {
    const { result, onPicked, showToast } = setup()
    answer(launchImageLibrary as jest.Mock, { assets: [{}] })
    result.current.chooseFromGallery()
    expect(showToast).toHaveBeenCalledWith('error', 'Image not found')
    expect(onPicked).not.toHaveBeenCalled()
  })
})
