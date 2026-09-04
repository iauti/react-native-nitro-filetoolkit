import Foundation
import NitroModules

final class HybridFileReader: HybridFileReaderSpec {
  let location: FileLocation

  private let queue = DispatchQueue(label: "com.margelo.nitro.filetoolkit.reader", qos: .utility)
  private let lock = NSLock()
  private let handle: FileHandle
  private let byteCount: UInt64
  private var currentPosition: UInt64 = 0
  private var isClosed = false

  var position: UInt64 {
    lock.lock()
    defer { lock.unlock() }
    return currentPosition
  }

  init(location: FileLocation, url: URL) throws {
    self.location = location
    handle = try FileHandle(forReadingFrom: url)
    let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
    byteCount = (attributes[.size] as? NSNumber)?.uint64Value ?? 0
    super.init()
  }

  func read(maxByteCount: UInt64) throws -> Promise<ReadChunk> {
    guard maxByteCount <= UInt64(Int.max) else {
      throw FileToolkitError.limitExceeded("maxByteCount exceeds the platform limit")
    }
    return Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      try requireOpen()
      let offset = currentPosition
      let data = try handle.read(upToCount: Int(maxByteCount)) ?? Data()
      currentPosition += UInt64(data.count)
      return ReadChunk(
        data: try ArrayBuffer.copy(data: data),
        offset: offset,
        isEndOfFile: currentPosition >= byteCount
      )
    }
  }

  func seek(offset: UInt64) throws -> Promise<Void> {
    Promise.parallel(queue) { [self] in
      lock.lock()
      defer { lock.unlock() }
      try requireOpen()
      try handle.seek(toOffset: offset)
      currentPosition = offset
    }
  }

  func close() throws {
    lock.lock()
    defer { lock.unlock() }
    guard !isClosed else { return }
    try handle.close()
    isClosed = true
  }

  private func requireOpen() throws {
    if isClosed {
      throw FileToolkitError.invalidOperation("reader is closed")
    }
  }

  deinit {
    try? handle.close()
  }
}
