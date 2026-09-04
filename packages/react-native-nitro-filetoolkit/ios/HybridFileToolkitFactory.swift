import NitroModules

final class HybridFileToolkitFactory: HybridFileToolkitFactorySpec {
  private let fileSystem = LazyModule<any HybridFileSystemSpec> {
    HybridFileSystem()
  }

  func getFileSystem() throws -> any HybridFileSystemSpec {
    fileSystem.get()
  }
}
