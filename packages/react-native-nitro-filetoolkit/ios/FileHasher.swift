import CryptoKit
import Foundation

enum FileHasher {
  static func hash(url: URL, algorithm: HashAlgorithm) throws -> String {
    switch algorithm {
    case .md5:
      return try digest(url: url, using: Insecure.MD5.self)
    case .sha1:
      return try digest(url: url, using: Insecure.SHA1.self)
    case .sha256:
      return try digest(url: url, using: SHA256.self)
    case .sha512:
      return try digest(url: url, using: SHA512.self)
    }
  }

  private static func digest<Hasher: HashFunction>(
    url: URL,
    using _: Hasher.Type
  ) throws -> String {
    let handle = try FileHandle(forReadingFrom: url)
    defer { try? handle.close() }
    var hasher = Hasher()
    while true {
      let data = try handle.read(upToCount: 64 * 1024) ?? Data()
      if data.isEmpty { break }
      hasher.update(data: data)
    }
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }
}
