import type { HybridObject } from 'react-native-nitro-modules'
import type { CookieStoreKind } from '../../types/CookieStoreOptions'

export interface CookieStore
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly kind: CookieStoreKind
}
