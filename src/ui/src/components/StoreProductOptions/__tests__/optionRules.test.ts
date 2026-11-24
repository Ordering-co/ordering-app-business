import { optionRule } from '../optionRules'

const t = (_key: string, fallback: string) => fallback

describe('optionRule', () => {
  it.each([
    [{ min: 1, max: 1 }, 'Choose 1'],
    [{ min: 0, max: 3 }, 'Up to 3'],
    [{ min: '0', max: '2' }, 'Up to 2'],
    [{ min: 2, max: 2 }, 'Choose 2'],
    [{ min: 1, max: 3 }, 'Choose 1-3'],
    [{ min: 2, max: 0 }, 'Choose at least 2'],
    [{ min: 0, max: 0 }, null],
    [{}, null],
    [null, null],
  ])('%j reads %p', (option, expected) => {
    expect(optionRule(option as any, t)).toBe(expected)
  })
})
