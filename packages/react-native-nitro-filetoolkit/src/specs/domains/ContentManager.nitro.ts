import type { HybridObject } from 'react-native-nitro-modules'

export interface ContentManager
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {}
