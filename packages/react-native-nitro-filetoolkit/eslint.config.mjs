import reactNativeConfig from '@react-native/eslint-config/flat'

export default [
  ...reactNativeConfig,
  {
    ignores: [
      'android/**',
      'ios/**',
      'lib/**',
      'nitrogen/generated/**',
      'node_modules/**',
    ],
  },
]
