import Foundation

final class FileLocationResolver {
  private static let allowedFileURIBytes = Set(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&'()*+,;=:@/".utf8
  )

  private let fileManager: FileManager

  init(fileManager: FileManager = .default) {
    self.fileManager = fileManager
  }

  func location(directory: ManagedDirectory, relativePath: String) throws -> FileLocation {
    guard !relativePath.isEmpty else {
      throw FileToolkitError.invalidLocation("relativePath must not be empty")
    }
    guard !relativePath.hasPrefix("/"), !relativePath.contains("\\"), !relativePath.contains("\0") else {
      throw FileToolkitError.invalidLocation("relativePath must be a portable relative path")
    }

    let components = relativePath.split(separator: "/", omittingEmptySubsequences: false)
    guard components.allSatisfy({ !$0.isEmpty && $0 != "." && $0 != ".." }) else {
      throw FileToolkitError.invalidLocation("relativePath cannot contain empty, '.' or '..' segments")
    }

    let root = try rootURL(for: directory).standardizedFileURL
    let candidate = root.appendingPathComponent(relativePath, isDirectory: false).standardizedFileURL
    guard try isContainedByRoot(root, candidate: candidate) else {
      throw FileToolkitError.invalidLocation("relativePath escapes its managed directory")
    }
    return location(for: candidate, origin: .managed)
  }

  // Identity resolution preserves the final directory entry for lstat, link copies, moves, and removal.
  func url(from location: FileLocation) throws -> URL {
    let url = try url(fromUri: location.uri)
    if location.origin == .managed {
      let contained = try managedRootURLs().contains { root in
        try isContainedByRoot(root, candidate: url)
      }
      guard contained else {
        throw FileToolkitError.invalidLocation("managed location is outside all managed directories")
      }
    }
    return url
  }

  // Access resolution follows an existing leaf link and re-checks where managed access lands.
  func urlForAccess(from location: FileLocation) throws -> URL {
    let url = try url(from: location)
    guard location.origin == .managed, isSymbolicLink(url) else { return url }
    let resolved = url.resolvingSymlinksInPath().standardizedFileURL
    let contained = try managedRootURLs().contains { root in
      try isContainedByRoot(root, candidate: resolved)
    }
    guard contained else {
      throw FileToolkitError.invalidLocation(
        "managed symbolic link target is outside all managed directories"
      )
    }
    return resolved
  }

  func fromUri(_ uri: String) throws -> FileLocation {
    location(for: try url(fromUri: uri), origin: .uri)
  }

  func root(_ directory: ManagedDirectory) throws -> FileLocation {
    let url = try safeRootURL(for: directory)
    do {
      try fileManager.createDirectory(at: url, withIntermediateDirectories: true)
      let attributes = try fileManager.attributesOfItem(atPath: url.path)
      guard attributes[.type] as? FileAttributeType == .typeDirectory else {
        throw FileToolkitError.invalidOperation("managed directory is unavailable")
      }
    } catch {
      throw FileToolkitError.invalidOperation("managed directory is unavailable: \(error.localizedDescription)")
    }
    return location(for: url, origin: .managed)
  }

  func safeRootURL(for directory: ManagedDirectory) throws -> URL {
    let root = try rootURL(for: directory).standardizedFileURL
    guard !isSymbolicLink(root) else {
      throw FileToolkitError.invalidLocation("managed directory cannot be a symbolic link")
    }
    return root
  }

  func existingRootOrAncestor(for directory: ManagedDirectory) throws -> URL {
    let root = try rootURL(for: directory).standardizedFileURL
    guard let boundary = managedRootBoundary(root) else {
      throw FileToolkitError.invalidLocation("managed directory cannot be a symbolic link")
    }
    return boundary
  }

  func rootURL(for directory: ManagedDirectory) throws -> URL {
    switch directory {
    case .cache:
      return try requiredURL(for: .cachesDirectory)
    case .documents:
      return try requiredURL(for: .documentDirectory)
    case .downloads:
      return try requiredURL(for: .documentDirectory).appendingPathComponent("Downloads", isDirectory: true)
    case .temporary:
      return fileManager.temporaryDirectory
    case .applicationSupport:
      return try requiredURL(for: .applicationSupportDirectory)
    }
  }

  private func url(fromUri uri: String) throws -> URL {
    guard hasValidFileURICharacters(uri) else {
      throw FileToolkitError.invalidLocation("URI is malformed")
    }
    guard let url = URL(string: uri), url.isFileURL, url.scheme == "file", url.host == nil else {
      throw FileToolkitError.invalidLocation("only absolute file:// URIs are accepted")
    }
    guard url.path.hasPrefix("/") else {
      throw FileToolkitError.invalidLocation("file URI must contain an absolute path")
    }
    return url.standardizedFileURL
  }

  private func hasValidFileURICharacters(_ value: String) -> Bool {
    let bytes = Array(value.utf8)
    var decodedBytes: [UInt8] = []
    decodedBytes.reserveCapacity(bytes.count)
    var index = 0
    while index < bytes.count {
      if bytes[index] == 0x25 {
        guard index + 2 < bytes.count,
              let high = hexValue(bytes[index + 1]),
              let low = hexValue(bytes[index + 2]) else {
          return false
        }
        let decoded = high * 16 + low
        guard decoded != 0x2F, decoded != 0x5C, decoded != 0 else {
          return false
        }
        decodedBytes.append(decoded)
        index += 3
      } else {
        guard Self.allowedFileURIBytes.contains(bytes[index]) else {
          return false
        }
        decodedBytes.append(bytes[index])
        index += 1
      }
    }
    return String(bytes: decodedBytes, encoding: .utf8) != nil
  }

  private func hexValue(_ byte: UInt8) -> UInt8? {
    switch byte {
    case 0x30...0x39: return byte - 0x30
    case 0x41...0x46: return byte - 0x41 + 10
    case 0x61...0x66: return byte - 0x61 + 10
    default: return nil
    }
  }

  private func managedRootURLs() throws -> [URL] {
    try [
      ManagedDirectory.cache,
      .documents,
      .downloads,
      .temporary,
      .applicationSupport,
    ].map { try rootURL(for: $0).standardizedFileURL }
  }

  private func isContainedByRoot(_ root: URL, candidate: URL) throws -> Bool {
    guard contains(root, candidate: candidate) else { return false }
    guard let boundary = managedRootBoundary(root) else { return false }
    if candidate == root { return true }
    let parent = candidate.deletingLastPathComponent()
    let resolvedParent = nearestExistingAncestor(parent).resolvingSymlinksInPath().standardizedFileURL
    return contains(boundary, candidate: resolvedParent)
  }

  private func managedRootBoundary(_ root: URL) -> URL? {
    guard !isSymbolicLink(root) else { return nil }
    return nearestExistingAncestor(root).resolvingSymlinksInPath().standardizedFileURL
  }

  private func nearestExistingAncestor(_ url: URL) -> URL {
    var current = url.standardizedFileURL
    while !pathEntryExists(current) && current.path != "/" {
      current.deleteLastPathComponent()
    }
    return current
  }

  private func pathEntryExists(_ url: URL) -> Bool {
    (try? fileManager.attributesOfItem(atPath: url.path)) != nil
  }

  private func isSymbolicLink(_ url: URL) -> Bool {
    let attributes = try? fileManager.attributesOfItem(atPath: url.path)
    return attributes?[.type] as? FileAttributeType == .typeSymbolicLink
  }

  private func contains(_ root: URL, candidate: URL) -> Bool {
    let prefix = root.path == "/" ? "/" : root.path + "/"
    return candidate == root || candidate.path.hasPrefix(prefix)
  }

  private func location(for url: URL, origin: FileLocationOrigin) -> FileLocation {
    let canonicalURL = URL(fileURLWithPath: url.standardizedFileURL.path)
    return FileLocation(origin: origin, uri: canonicalURL.absoluteString)
  }

  private func requiredURL(for directory: FileManager.SearchPathDirectory) throws -> URL {
    guard let url = fileManager.urls(for: directory, in: .userDomainMask).first else {
      throw FileToolkitError.invalidOperation("managed directory is unavailable")
    }
    return url
  }
}
