import Foundation
import NitroModules

final class HybridFileSystem: HybridFileSystemSpec {
  private static let ioQueue = DispatchQueue(
    label: "com.margelo.nitro.filetoolkit.filesystem",
    qos: .utility
  )

  private let fileManager: FileManager
  private let resolver: FileLocationResolver
  private let metadata: FileMetadataMapper

  override init() {
    let fileManager = FileManager.default
    self.fileManager = fileManager
    resolver = FileLocationResolver(fileManager: fileManager)
    metadata = FileMetadataMapper(fileManager: fileManager)
    super.init()
  }

  func location(directory: ManagedDirectory, relativePath: String) throws -> FileLocation {
    try resolver.location(directory: directory, relativePath: relativePath)
  }

  func fromUri(uri: String) throws -> FileLocation {
    try resolver.fromUri(uri)
  }

  func root(directory: ManagedDirectory) throws -> FileLocation {
    try resolver.root(directory)
  }

  func stat(location: FileLocation) throws -> Promise<FileInfo?> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata] in
      let url = try resolver.url(from: location)
      guard metadata.exists(at: url) else { return nil }
      return try metadata.info(for: url)
    }
  }

  func list(options: ListOptions) throws -> Promise<FilePage> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let directory = try resolver.url(from: options.directory)
      guard metadata.isDirectory(at: directory) else {
        throw FileToolkitError.invalidOperation("location is not a directory")
      }
      let limit = try Self.checkedInt(options.maxEntryCount, name: "maxEntryCount")
      guard limit > 0 else {
        throw FileToolkitError.invalidOperation("maxEntryCount must be greater than zero")
      }

      let urls: [URL]
      if options.recursive {
        guard let enumerator = fileManager.enumerator(
          at: directory,
          includingPropertiesForKeys: [.isDirectoryKey],
          options: [.skipsHiddenFiles]
        ) else {
          throw FileToolkitError.invalidOperation("cannot enumerate \(directory.path)")
        }
        urls = enumerator.compactMap { $0 as? URL }
      } else {
        urls = try fileManager.contentsOfDirectory(
          at: directory,
          includingPropertiesForKeys: nil,
          options: [.skipsHiddenFiles]
        )
      }

      let sorted = urls.sorted { $0.path.localizedStandardCompare($1.path) == .orderedAscending }
      let start = try Self.decodeCursor(options.cursor)
      guard start <= sorted.count else {
        throw FileToolkitError.invalidOperation("cursor is outside the current directory listing")
      }
      let end = min(start + limit, sorted.count)
      let items = try sorted[start..<end].map { try metadata.info(for: $0) }
      let nextCursor = end < sorted.count ? Self.encodeCursor(end) : nil
      return FilePage(items: items, nextCursor: nextCursor)
    }
  }

  func readText(options: ReadTextOptions) throws -> Promise<String> {
    Promise.parallel(Self.ioQueue) { [resolver] in
      let url = try resolver.url(from: options.source)
      let limit = try Self.checkedInt(options.maxByteCount, name: "maxByteCount")
      let handle = try FileHandle(forReadingFrom: url)
      defer { try? handle.close() }
      let data = try handle.read(upToCount: limit + 1) ?? Data()
      guard data.count <= limit else {
        throw FileToolkitError.limitExceeded("file exceeds maxByteCount")
      }
      guard let text = String(data: data, encoding: Self.stringEncoding(options.encoding)) else {
        throw FileToolkitError.invalidOperation("file is not valid \(options.encoding.stringValue) text")
      }
      return text
    }
  }

  func writeText(options: WriteTextOptions) throws -> Promise<FileInfo> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let destination = try resolver.url(from: options.destination)
      guard let data = options.text.data(using: Self.stringEncoding(options.encoding)) else {
        throw FileToolkitError.invalidOperation("text cannot be encoded as \(options.encoding.stringValue)")
      }
      try FileOperations.prepareParent(
        of: destination,
        create: options.createParentDirectories,
        fileManager: fileManager
      )
      try Self.write(
        data: data,
        to: destination,
        mode: options.mode,
        atomicity: options.atomicity,
        fileManager: fileManager
      )
      return try metadata.info(for: destination)
    }
  }

  func openReader(location: FileLocation) throws -> Promise<any HybridFileReaderSpec> {
    Promise.parallel(Self.ioQueue) { [resolver] in
      let url = try resolver.url(from: location)
      return try HybridFileReader(location: location, url: url)
    }
  }

  func openWriter(options: OpenWriterOptions) throws -> Promise<any HybridFileWriterSpec> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let destination = try resolver.url(from: options.destination)
      try FileOperations.prepareParent(
        of: destination,
        create: options.createParentDirectories,
        fileManager: fileManager
      )
      return try HybridFileWriter(
        destination: options.destination,
        destinationURL: destination,
        mode: options.mode,
        atomicity: options.atomicity,
        fileManager: fileManager,
        metadata: metadata
      )
    }
  }

  func createDirectory(options: CreateDirectoryOptions) throws -> Promise<FileInfo> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let url = try resolver.url(from: options.location)
      try fileManager.createDirectory(
        at: url,
        withIntermediateDirectories: options.createParentDirectories
      )
      return try metadata.info(for: url)
    }
  }

  func copy(options: CopyOptions) throws -> Promise<FileInfo> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      var source = try resolver.url(from: options.source)
      let destination = try resolver.url(from: options.destination)
      if options.followSymbolicLinks {
        source = source.resolvingSymlinksInPath()
      }
      try FileOperations.checkCollision(
        at: destination,
        policy: options.collision,
        fileManager: fileManager
      )
      try FileOperations.prepareParent(of: destination, create: true, fileManager: fileManager)
      let staging = FileOperations.siblingStagingURL(for: destination)
      do {
        try fileManager.copyItem(at: source, to: staging)
        try FileOperations.replaceStagingItem(
          staging,
          destination: destination,
          atomicity: options.atomicity,
          fileManager: fileManager
        )
      } catch {
        try? fileManager.removeItem(at: staging)
        throw error
      }
      return try metadata.info(for: destination)
    }
  }

  func move(options: MoveOptions) throws -> Promise<FileInfo> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let source = try resolver.url(from: options.source)
      let destination = try resolver.url(from: options.destination)
      try FileOperations.checkCollision(
        at: destination,
        policy: options.collision,
        fileManager: fileManager
      )
      try FileOperations.prepareParent(of: destination, create: true, fileManager: fileManager)
      try FileOperations.move(
        source,
        destination: destination,
        atomicity: options.atomicity,
        fileManager: fileManager
      )
      return try metadata.info(for: destination)
    }
  }

  func remove(options: RemoveOptions) throws -> Promise<Void> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let url = try resolver.url(from: options.location)
      guard metadata.exists(at: url) else {
        if options.missing == .ignore { return }
        throw FileToolkitError.invalidOperation("location does not exist")
      }
      if metadata.isDirectory(at: url) && !options.recursive {
        let entries = try fileManager.contentsOfDirectory(atPath: url.path)
        guard entries.isEmpty else {
          throw FileToolkitError.invalidOperation("directory is not empty; set recursive to true")
        }
      }
      try fileManager.removeItem(at: url)
    }
  }

  func hash(options: HashOptions) throws -> Promise<String> {
    Promise.parallel(Self.ioQueue) { [resolver] in
      try FileHasher.hash(url: resolver.url(from: options.source), algorithm: options.algorithm)
    }
  }

  func getDiskSpace(directory: ManagedDirectory) throws -> Promise<DiskSpace> {
    Promise.parallel(Self.ioQueue) { [resolver] in
      let root = try resolver.existingRootOrAncestor(for: directory)
      let values = try root.resourceValues(forKeys: [
        .volumeAvailableCapacityForImportantUsageKey,
        .volumeTotalCapacityKey,
      ])
      let available = UInt64(max(0, values.volumeAvailableCapacityForImportantUsage ?? 0))
      let total = UInt64(max(0, values.volumeTotalCapacity ?? 0))
      return DiskSpace(availableByteCount: available, totalByteCount: total)
    }
  }

  func clearManagedDirectory(options: ClearManagedDirectoryOptions) throws -> Promise<ClearResult> {
    Promise.parallel(Self.ioQueue) { [resolver, metadata, fileManager] in
      let root = try resolver.safeRootURL(for: options.directory)
      guard metadata.exists(at: root) else {
        return ClearResult(removedEntryCount: 0, reclaimedByteCount: 0)
      }
      let entries = try fileManager.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)
      var removed: UInt64 = 0
      var reclaimed: UInt64 = 0
      for entry in entries {
        var isDirectory: ObjCBool = false
        _ = fileManager.fileExists(atPath: entry.path, isDirectory: &isDirectory)
        if isDirectory.boolValue && !options.recursive { continue }
        let measurement = Self.measure(entry, fileManager: fileManager)
        try fileManager.removeItem(at: entry)
        removed += measurement.count
        reclaimed += measurement.bytes
      }
      return ClearResult(removedEntryCount: removed, reclaimedByteCount: reclaimed)
    }
  }

  private static func write(
    data: Data,
    to url: URL,
    mode: WriteMode,
    atomicity: Atomicity,
    fileManager: FileManager
  ) throws {
    switch mode {
    case .createNew:
      guard !fileManager.fileExists(atPath: url.path) else {
        throw FileToolkitError.invalidOperation("destination already exists")
      }
      let staging = FileOperations.siblingStagingURL(for: url)
      defer { try? fileManager.removeItem(at: staging) }
      try data.write(to: staging)
      try FileOperations.installNewStagingItem(
        staging,
        destination: url,
        fileManager: fileManager
      )
    case .replace:
      try writeReplacing(data: data, to: url, atomicity: atomicity, fileManager: fileManager)
    case .append:
      if !fileManager.fileExists(atPath: url.path) {
        try data.write(to: url, options: [])
        return
      }
      let handle = try FileHandle(forWritingTo: url)
      defer { try? handle.close() }
      try handle.seekToEnd()
      try handle.write(contentsOf: data)
      try handle.synchronize()
    }
  }

  private static func writeReplacing(
    data: Data,
    to destination: URL,
    atomicity: Atomicity,
    fileManager: FileManager
  ) throws {
    guard atomicity != .none else {
      try data.write(to: destination)
      return
    }
    let staging = FileOperations.siblingStagingURL(for: destination)
    defer { try? fileManager.removeItem(at: staging) }
    try data.write(to: staging)
    try FileOperations.replaceStagingItem(
      staging,
      destination: destination,
      atomicity: atomicity,
      fileManager: fileManager
    )
  }

  private static func stringEncoding(_ encoding: TextEncoding) -> String.Encoding {
    switch encoding {
    case .utf8: return .utf8
    case .utf16le: return .utf16LittleEndian
    case .utf16be: return .utf16BigEndian
    }
  }

  private static func checkedInt(_ value: UInt64, name: String) throws -> Int {
    guard value <= UInt64(Int.max) else {
      throw FileToolkitError.limitExceeded("\(name) exceeds the platform limit")
    }
    return Int(value)
  }

  private static func encodeCursor(_ offset: Int) -> String {
    Data("v1:\(offset)".utf8).base64EncodedString()
  }

  private static func decodeCursor(_ cursor: String?) throws -> Int {
    guard let cursor else { return 0 }
    guard
      let data = Data(base64Encoded: cursor),
      let value = String(data: data, encoding: .utf8),
      value.hasPrefix("v1:"),
      let offset = Int(value.dropFirst(3)),
      offset >= 0
    else {
      throw FileToolkitError.invalidOperation("invalid list cursor")
    }
    return offset
  }

  private static func measure(_ url: URL, fileManager: FileManager) -> (count: UInt64, bytes: UInt64) {
    var count: UInt64 = 1
    let attributes = try? fileManager.attributesOfItem(atPath: url.path)
    var bytes = (attributes?[.size] as? NSNumber)?.uint64Value ?? 0
    if attributes?[.type] as? FileAttributeType == .typeDirectory,
       let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: nil) {
      for case let child as URL in enumerator {
        count += 1
        let childAttributes = try? fileManager.attributesOfItem(atPath: child.path)
        bytes += (childAttributes?[.size] as? NSNumber)?.uint64Value ?? 0
      }
    }
    return (count, bytes)
  }
}
