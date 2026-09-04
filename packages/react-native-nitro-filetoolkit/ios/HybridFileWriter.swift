import Foundation
import NitroModules

final class HybridFileWriter: HybridFileWriterSpec {
  let destination: FileLocation

  private let queue = DispatchQueue(label: "com.margelo.nitro.filetoolkit.writer", qos: .utility)
  private let lock = NSLock()
  private let destinationURL: URL
  private let stagingURL: URL
  private let mode: WriteMode
  private let atomicity: Atomicity
  private let fileManager: FileManager
  private let metadata: FileMetadataMapper
  private let handle: FileHandle
  private var currentPosition: UInt64
  private var isClosed = false
  private var isFinished = false

  var position: UInt64 {
    lock.lock()
    defer { lock.unlock() }
    return currentPosition
  }

  init(
    destination: FileLocation,
    destinationURL: URL,
    mode: WriteMode,
    atomicity: Atomicity,
    fileManager: FileManager,
    metadata: FileMetadataMapper
  ) throws {
    self.destination = destination
    self.destinationURL = destinationURL
    self.mode = mode
    self.atomicity = atomicity
    self.fileManager = fileManager
    self.metadata = metadata
    stagingURL = FileOperations.siblingStagingURL(for: destinationURL)

    if mode == .createNew && fileManager.fileExists(atPath: destinationURL.path) {
      throw FileToolkitError.invalidOperation("destination already exists")
    }
    if mode == .append && fileManager.fileExists(atPath: destinationURL.path) {
      try fileManager.copyItem(at: destinationURL, to: stagingURL)
    } else {
      guard fileManager.createFile(atPath: stagingURL.path, contents: nil) else {
        throw FileToolkitError.invalidOperation("cannot create staging file")
      }
    }

    handle = try FileHandle(forWritingTo: stagingURL)
    if mode == .append {
      currentPosition = try handle.seekToEnd()
    } else {
      currentPosition = 0
    }
    super.init()
  }

  func write(data: ArrayBuffer) throws -> Promise<Void> {
    let ownedData = data.toData(copyIfNeeded: true)
    return Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      try requireWritable()
      try handle.write(contentsOf: ownedData)
      currentPosition += UInt64(ownedData.count)
    }
  }

  func flush() throws -> Promise<Void> {
    Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      try requireWritable()
      try handle.synchronize()
    }
  }

  func commit() throws -> Promise<FileInfo> {
    Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      try requireWritable()
      try handle.synchronize()
      try handle.close()
      isClosed = true

      if mode == .createNew && fileManager.fileExists(atPath: destinationURL.path) {
        try? fileManager.removeItem(at: stagingURL)
        isFinished = true
        throw FileToolkitError.invalidOperation("destination already exists")
      }
      if mode == .createNew {
        try FileOperations.installNewStagingItem(
          stagingURL,
          destination: destinationURL,
          fileManager: fileManager
        )
      } else {
        try FileOperations.replaceStagingItem(
          stagingURL,
          destination: destinationURL,
          atomicity: atomicity,
          fileManager: fileManager
        )
      }
      isFinished = true
      return try metadata.info(for: destinationURL)
    }
  }

  func abort() throws -> Promise<Void> {
    Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      if !isClosed {
        try handle.close()
        isClosed = true
      }
      if !isFinished && fileManager.fileExists(atPath: stagingURL.path) {
        try fileManager.removeItem(at: stagingURL)
      }
      isFinished = true
    }
  }

  func close() throws {
    lock.lock()
    defer { lock.unlock() }
    guard !isClosed else { return }
    try handle.close()
    isClosed = true
    if !isFinished && fileManager.fileExists(atPath: stagingURL.path) {
      try? fileManager.removeItem(at: stagingURL)
    }
    isFinished = true
  }

  private func requireWritable() throws {
    if isClosed || isFinished {
      throw FileToolkitError.invalidOperation("writer is closed")
    }
  }

  deinit {
    try? handle.close()
    if !isFinished {
      try? fileManager.removeItem(at: stagingURL)
    }
  }
}
