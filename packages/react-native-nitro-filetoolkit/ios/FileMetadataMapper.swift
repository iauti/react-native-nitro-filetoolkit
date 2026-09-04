import Foundation

final class FileMetadataMapper {
  private let fileManager: FileManager

  init(fileManager: FileManager = .default) {
    self.fileManager = fileManager
  }

  func exists(at url: URL) -> Bool {
    (try? fileManager.attributesOfItem(atPath: url.path)) != nil
  }

  func isDirectory(at url: URL) -> Bool {
    let attributes = try? fileManager.attributesOfItem(atPath: url.path)
    return attributes?[.type] as? FileAttributeType == .typeDirectory
  }

  func info(for url: URL) throws -> FileInfo {
    let attributes = try fileManager.attributesOfItem(atPath: url.path)
    let type = attributes[.type] as? FileAttributeType
    let kind: FileKind
    let byteCount: UInt64?
    let symbolicLinkTarget: FileLocation?

    switch type {
    case .typeDirectory:
      kind = .directory
      byteCount = nil
      symbolicLinkTarget = nil
    case .typeSymbolicLink:
      kind = .symbolicLink
      byteCount = nil
      let target = try fileManager.destinationOfSymbolicLink(atPath: url.path)
      let targetURL = target.hasPrefix("/")
        ? URL(fileURLWithPath: target)
        : url.deletingLastPathComponent().appendingPathComponent(target)
      symbolicLinkTarget = FileLocation(
        origin: .uri,
        uri: URL(fileURLWithPath: targetURL.standardizedFileURL.path).absoluteString
      )
    default:
      kind = .file
      byteCount = (attributes[.size] as? NSNumber)?.uint64Value
      symbolicLinkTarget = nil
    }

    return FileInfo(
      kind: kind,
      location: FileLocation(
        origin: .uri,
        uri: URL(fileURLWithPath: url.standardizedFileURL.path).absoluteString
      ),
      name: url.lastPathComponent,
      byteCount: byteCount,
      symbolicLinkTarget: symbolicLinkTarget,
      createdAt: attributes[.creationDate] as? Date,
      modifiedAt: attributes[.modificationDate] as? Date
    )
  }
}
