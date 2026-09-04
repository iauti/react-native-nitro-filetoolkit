import Foundation

final class LazyModule<Value> {
  private let lock = NSLock()
  private let create: () -> Value
  private var value: Value?

  init(create: @escaping () -> Value) {
    self.create = create
  }

  func get() -> Value {
    lock.lock()
    defer { lock.unlock() }
    if let value {
      return value
    }
    let value = create()
    self.value = value
    return value
  }
}
