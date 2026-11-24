import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { ThemeProvider } from 'styled-components/native'
import { usePageSections } from '../sections'
import { themeWithValues } from '../../../jest/helpers/themeWithValues'

const Login = () => {
  const { render: renderSections, isVisible, sections } = usePageSections('login')
  return (
    <>
      <Text testID='keys'>{sections.map((s) => `${s.key}:${s.visible}`).join(',')}</Text>
      <Text testID='title-visible'>{String(isVisible('title'))}</Text>
      {renderSections({ logo: () => <Text>logo</Text>, title: () => <Text>title</Text>, form: () => <Text>form</Text> })}
    </>
  )
}

const texts = (view: any) => view.UNSAFE_getAllByType(Text).map((node: any) => node.props.children).filter((child: any) => ['logo', 'title', 'form'].includes(child))

describe('usePageSections', () => {
  it('renders the page\'s sections in the theme\'s order, each as the page gives it', () => {
    const theme = themeWithValues(() => {})
    const view = render(<ThemeProvider theme={theme}><Login /></ThemeProvider>)
    expect(view.getByTestId('keys').props.children).toBe('logo:true,title:true,form:true')
    expect(texts(view)).toEqual(['logo', 'title', 'form'])
  })

  it('follows a theme that moves and hides sections', () => {
    const theme = themeWithValues((values) => {
      values.pages.login.sections = [{ key: 'form', visible: true }, { key: 'title', visible: false }, { key: 'logo', visible: true }]
    })
    const view = render(<ThemeProvider theme={theme}><Login /></ThemeProvider>)
    expect(texts(view)).toEqual(['form', 'logo'])
    expect(view.getByTestId('title-visible').props.children).toBe('false')
  })
})
