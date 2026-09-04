import NitroModules

enum FileToolkitError {
  static func invalidLocation(_ message: String) -> RuntimeError {
    RuntimeError("[file-toolkit/invalid-location] \(message)")
  }

  static func invalidOperation(_ message: String) -> RuntimeError {
    RuntimeError("[file-toolkit/invalid-operation] \(message)")
  }

  static func limitExceeded(_ message: String) -> RuntimeError {
    RuntimeError("[file-toolkit/resource-limit] \(message)")
  }
}
