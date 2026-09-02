export type CookieStoreKind = 'transfer' | 'web'

export interface CookieStoreOptions {
  readonly kind: CookieStoreKind
}
