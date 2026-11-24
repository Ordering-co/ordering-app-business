module.exports = {
  root: true,
  // Official React Native config: bundles @typescript-eslint parser, react,
  // react-native and prettier rules — and matches this codebase's style
  // (semicolons, trailing commas), unlike the previous `standard` extends.
  extends: '@react-native',
  rules: {
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'no-useless-escape': 'off',
    // Legacy app patterns (hook factories, stale deps) — warn until cleaned up.
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unreachable': 'warn'
  }
}
