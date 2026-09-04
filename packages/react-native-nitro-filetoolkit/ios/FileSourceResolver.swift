import Foundation

final class FileSourceResolver {
  private let fileManager: FileManager
  private let locations: FileLocationResolver

  init(
    fileManager: FileManager = .default,
    locations: FileLocationResolver? = nil
  ) {
    self.fileManager = fileManager
    self.locations = locations ?? FileLocationResolver(fileManager: fileManager)
  }

  func sourceFromUri(_ value: String) throws -> FileSource {
    let location = try locations.fromUri(value)
    return FileSource(uri: location.uri, scheme: .file)
  }

  func inspect(_ source: FileSource) throws -> SourceInfo? {
    let validated = try validate(source)
    let sourceURL = try url(from: validated)
    do {
      let attributes = try fileManager.attributesOfItem(atPath: sourceURL.path)
      let byteCount: UInt64?
      if let size = attributes[.size] as? NSNumber {
        guard size.int64Value >= 0 else {
          throw FileToolkitError.invalidOperation("source byte count must not be negative")
        }
        byteCount = size.uint64Value
      } else {
        byteCount = nil
      }
      return SourceInfo(
        source: validated,
        name: sourceURL.lastPathComponent,
        byteCount: byteCount
      )
    } catch let error as NSError where error.domain == NSCocoaErrorDomain &&
      (error.code == NSFileNoSuchFileError || error.code == NSFileReadNoSuchFileError) {
      return nil
    } catch {
      throw FileToolkitError.invalidOperation(
        "source metadata cannot be read: \(error.localizedDescription)"
      )
    }
  }

  func url(from source: FileSource) throws -> URL {
    let validated = try validate(source)
    let location = try locations.fromUri(validated.uri)
    return try locations.url(from: location)
  }

  private func validate(_ source: FileSource) throws -> FileSource {
    guard source.scheme == .file else {
      throw FileToolkitError.invalidLocation("source scheme does not match its URI")
    }
    return try sourceFromUri(source.uri)
  }
}
