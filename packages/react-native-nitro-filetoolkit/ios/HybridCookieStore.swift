final class HybridCookieStore: HybridCookieStoreSpec {
  let kind: CookieStoreKind

  init(kind: CookieStoreKind) {
    self.kind = kind
    super.init()
  }
}
