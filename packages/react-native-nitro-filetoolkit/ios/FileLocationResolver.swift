import Foundation

final class FileLocationResolver {
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
    guard candidate.path.hasPrefix(root.path + "/") else {
      throw FileToolkitError.invalidLocation("relativePath escapes its managed directory")
    }
    return location(for: candidate, origin: .managed)
  }

  func url(from location: FileLocation) throws -> URL {
    let url = try url(fromUri: location.uri)
    if location.origin == .managed {
      let contained = try managedRootURLs().contains { root in
        url == root || url.path.hasPrefix(root.path + "/")
      }
      guard contained else {
        throw FileToolkitError.invalidLocation("managed location is outside all managed directories")
      }
    }
    return url
  }

  func fromUri(_ uri: String) throws -> FileLocation {
    location(for: try url(fromUri: uri), origin: .uri)
  }

  func root(_ directory: ManagedDirectory) throws -> FileLocation {
    let url = try rootURL(for: directory)
    do {
      try fileManager.createDirectory(at: url, withIntermediateDirectories: true)
    } catch {
      throw FileToolkitError.invalidOperation("managed directory is unavailable: \(error.localizedDescription)")
    }
    return location(for: url, origin: .managed)
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
    guard let url = URL(string: uri), url.isFileURL, url.scheme == "file", url.host == nil else {
      throw FileToolkitError.invalidLocation("only absolute file:// URIs are accepted")
    }
    guard url.path.hasPrefix("/") else {
      throw FileToolkitError.invalidLocation("file URI must contain an absolute path")
    }
    return url.standardizedFileURL
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
