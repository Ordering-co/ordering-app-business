import { languageLabel, languageSpoken, nativeLanguageName } from '../nativeNames'

describe('nativeLanguageName', () => {
  it('names a language by its code, in its own language', () => {
    expect(nativeLanguageName({ code: 'es', name: 'Spanish' })).toBe('Español')
    expect(nativeLanguageName({ code: 'PT', name: 'Portuguese' })).toBe('Português')
    expect(nativeLanguageName({ code: 'de', name: 'German' })).toBe('Deutsch')
    expect(nativeLanguageName({ code: 'zh-CN', name: 'Chinese Simplified' })).toBe('简体中文')
  })

  it('keeps the variants of one language apart with the server\'s qualifier', () => {
    expect(nativeLanguageName({ code: 'es-419-1', name: 'Spanish (Mexico)' })).toBe('Español (Mexico)')
    expect(nativeLanguageName({ code: 'es-419-2', name: 'Spanish (La - Guatemala)' })).toBe('Español (La - Guatemala)')
    expect(nativeLanguageName({ code: 'pt-BR', name: 'Portuguese' })).toBe('Português')
  })

  it('is null for a code it does not know or none', () => {
    expect(nativeLanguageName({ code: 'xx', name: 'Klingon' })).toBeNull()
    expect(nativeLanguageName({ name: 'English' })).toBeNull()
    expect(nativeLanguageName(null)).toBeNull()
  })
})

describe('languageLabel and languageSpoken', () => {
  it('fall back to the server\'s name, and say both names to a screen reader', () => {
    expect(languageLabel({ code: 'xx', name: 'Klingon' })).toBe('Klingon')
    expect(languageSpoken({ code: 'xx', name: 'Klingon' })).toBe('Klingon')
    expect(languageLabel({ code: 'fr', name: 'French' })).toBe('Français')
    expect(languageSpoken({ code: 'fr', name: 'French' })).toBe('Français, French')
    expect(languageSpoken({ code: 'en', name: 'English' })).toBe('English')
  })
})
