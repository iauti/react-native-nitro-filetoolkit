import NitroModules

final class HybridFileToolkitFactory: HybridFileToolkitFactorySpec {
  private let fileSystem = LazyModule<any HybridFileSystemSpec> {
    HybridFileSystem()
  }
  private let transferManager = LazyModule<any HybridTransferManagerSpec> {
    HybridTransferManager()
  }
  private let archiveManager = LazyModule<any HybridArchiveManagerSpec> {
    HybridArchiveManager()
  }
  private let contentManager = LazyModule<any HybridContentManagerSpec> {
    HybridContentManager()
  }

  func getFileSystem() throws -> any HybridFileSystemSpec {
    fileSystem.get()
  }

  func openTransferManager() throws -> Promise<any HybridTransferManagerSpec> {
    Promise.resolved(withResult: transferManager.get())
  }

  func getArchiveManager() throws -> any HybridArchiveManagerSpec {
    archiveManager.get()
  }

  func getContentManager() throws -> any HybridContentManagerSpec {
    contentManager.get()
  }

  func openCookieStore(options: CookieStoreOptions) throws -> Promise<any HybridCookieStoreSpec> {
    Promise.resolved(withResult: HybridCookieStore(kind: options.kind))
  }
}
