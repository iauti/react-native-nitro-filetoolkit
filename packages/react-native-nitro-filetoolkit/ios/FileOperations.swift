import Darwin
import Foundation
import NitroModules

enum FileOperations {
  static func prepareParent(of url: URL, create: Bool, fileManager: FileManager) throws {
    let parent = url.deletingLastPathComponent()
    if create {
      try fileManager.createDirectory(at: parent, withIntermediateDirectories: true)
    } else if !fileManager.fileExists(atPath: parent.path) {
      throw FileToolkitError.invalidOperation("parent directory does not exist")
    }
  }

  static func checkCollision(
    at url: URL,
    policy: CollisionPolicy,
    fileManager: FileManager
  ) throws {
    if policy == .fail && fileManager.fileExists(atPath: url.path) {
      throw FileToolkitError.invalidOperation("destination already exists")
    }
  }

  static func siblingStagingURL(for destination: URL) -> URL {
    destination.deletingLastPathComponent()
      .appendingPathComponent(".nitro-filetoolkit-\(UUID().uuidString).tmp")
  }

  static func replaceStagingItem(
    _ staging: URL,
    destination: URL,
    atomicity: Atomicity,
    fileManager: FileManager
  ) throws {
    if atomicity == .none {
      if fileManager.fileExists(atPath: destination.path) {
        try fileManager.removeItem(at: destination)
      }
      try fileManager.moveItem(at: staging, to: destination)
      return
    }

    do {
      if fileManager.fileExists(atPath: destination.path) {
        _ = try fileManager.replaceItemAt(destination, withItemAt: staging)
      } else {
        try fileManager.moveItem(at: staging, to: destination)
      }
    } catch {
      guard atomicity == .preferred else {
        throw FileToolkitError.invalidOperation("atomic replacement is unavailable: \(error)")
      }
      if fileManager.fileExists(atPath: destination.path) {
        try fileManager.removeItem(at: destination)
      }
      try fileManager.moveItem(at: staging, to: destination)
    }
  }

  static func installNewStagingItem(
    _ staging: URL,
    destination: URL,
    fileManager: FileManager
  ) throws {
    guard Darwin.link(staging.path, destination.path) == 0 else {
      if errno == EEXIST {
        throw FileToolkitError.invalidOperation("destination already exists")
      }
      let linkError = POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
      throw FileToolkitError.invalidOperation("cannot create destination: \(linkError)")
    }
    try? fileManager.removeItem(at: staging)
  }

  static func move(
    _ source: URL,
    destination: URL,
    atomicity: Atomicity,
    fileManager: FileManager
  ) throws {
    if atomicity != .none {
      if Darwin.rename(source.path, destination.path) == 0 { return }
      let renameError = POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
      guard atomicity == .preferred else {
        throw FileToolkitError.invalidOperation("atomic move is unavailable: \(renameError)")
      }
    }

    if fileManager.fileExists(atPath: destination.path) {
      try fileManager.removeItem(at: destination)
    }
    try fileManager.moveItem(at: source, to: destination)
  }
}
