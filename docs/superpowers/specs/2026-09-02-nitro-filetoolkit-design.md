# React Native Nitro File Toolkit Design

**Status:** Approved on 2026-09-02

## Purpose

Build `react-native-nitro-filetoolkit` as a new, type-safe Nitro Module for React Native. It replaces the behavior of `rn-file-toolkit` without preserving its API, implementation, or behavioral quirks.

The module must provide:

- sandboxed and URI-aware filesystem operations;
- bounded text and binary I/O;
- durable downloads and uploads;
- native queueing, retry, progress, cancellation, and restart recovery;
- safe ZIP creation and extraction;
- publishing to Photos or MediaStore;
- file sharing and opening;
- explicit transfer and web cookie stores;
- React adapters that observe native state without owning native work.

The upstream analysis and migration rationale are recorded in [`docs/research/rn-file-toolkit-nitro-analysis.md`](../../research/rn-file-toolkit-nitro-analysis.md).

## Non-goals

- Backward compatibility with `rn-file-toolkit`.
- A JavaScript facade that reshapes loose native objects.
- Unbounded whole-file reads or base64 conversion.
- Platform objects, raw status integers, or native dependency types in the public API.
- Public dependency-injection or transport plugin APIs in the first release.
- C++ before profiling demonstrates a worthwhile shared hot path.

## Toolchain and repository

- `react-native-nitro-modules`: `0.37.1`
- `nitrogen`: `0.37.1`
- TypeScript with strict checking
- Swift on iOS
- Kotlin and coroutines on Android
- Bun workspace with `packages/react-native-nitro-filetoolkit` and `apps/example`
- Real React Native behavior tests, supplemented by focused TypeScript tests

Only the lightweight `FileToolkitFactory` is autolinked. Every other HybridObject is returned by the factory or another HybridObject.

## Public module structure

```text
FileToolkitFactory
├── FileSystem
│   ├── FileReader
│   └── FileWriter
├── TransferManager
│   ├── TransferClient
│   ├── DownloadTask
│   └── UploadTask
├── ArchiveManager
│   └── ArchiveTask
├── ContentManager
└── CookieStore
```

The runtime export is a product name while the generated spec keeps its descriptive factory name:

```ts
export const FileToolkit =
  NitroModules.createHybridObject<FileToolkitFactory>(
    'FileToolkitFactory',
  )
```

The factory API is:

```ts
export interface FileToolkitFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getFileSystem(): FileSystem
  openTransferManager(): Promise<TransferManager>
  getArchiveManager(): ArchiveManager
  getContentManager(): ContentManager
  openCookieStore(options: CookieStoreOptions): Promise<CookieStore>
}
```

Synchronous factory methods only allocate or return cached native objects. `openTransferManager()` is asynchronous because it reconciles durable state before returning. Repeated calls return handles backed by the same process-level coordinator.

## File locations

Filesystem APIs accept a canonical location value rather than ambiguous strings:

```ts
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

export interface FileLocation {
  readonly uri: string
}
```

`FileSystem.location(directory, relativePath)` constructs managed locations. The relative path is slash-separated and normalized; empty segments, `.` and `..` segments, absolute paths, NUL characters, and platform separator escapes are rejected. A managed location cannot escape its selected root.

`FileSystem.fromUri(uri)` validates `file:` URIs and platform-owned content/document URIs where the operation and platform permit them. Remote HTTP URLs are never file locations. Nitro 0.37.1 cannot represent single string-literal discriminants inside value structs, so construction methods preserve the stronger invariant without an optional-field union at the native seam.

## Filesystem contract

`FileSystem` owns location construction and filesystem behavior:

```ts
export interface FileSystem
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  location(
    directory: ManagedDirectory,
    relativePath: string,
  ): FileLocation
  fromUri(uri: string): FileLocation

  stat(location: FileLocation): Promise<FileInfo | undefined>
  list(options: ListOptions): Promise<FilePage>

  readText(options: ReadTextOptions): Promise<string>
  writeText(options: WriteTextOptions): Promise<FileInfo>
  openReader(location: FileLocation): Promise<FileReader>
  openWriter(options: OpenWriterOptions): Promise<FileWriter>

  createDirectory(options: CreateDirectoryOptions): Promise<FileInfo>
  copy(options: CopyOptions): Promise<FileInfo>
  move(options: MoveOptions): Promise<FileInfo>
  remove(options: RemoveOptions): Promise<void>

  hash(options: HashOptions): Promise<string>
  getDiskSpace(directory: ManagedDirectory): Promise<DiskSpace>
  clearManagedDirectory(options: ClearManagedDirectoryOptions): Promise<ClearResult>
}
```

All I/O is asynchronous. Whole-value text reads require a bound and fail before allocating beyond the configured limit. Large binary access uses `FileReader` and `FileWriter` HybridObjects with bounded `ArrayBuffer` chunks. Asynchronous native writers copy JS-owned buffers before retaining them. Byte counts and offsets use Nitro's `UInt64` TypeScript brand so JavaScript uses bigint values with explicit native signedness.

Mutations declare collision behavior. Atomic replacement can be `required`, `preferred`, or `none`. A cross-volume move stages and verifies the destination before removing the source. Failure leaves the original intact and removes incomplete output.

Directory listings are paged and bounded. Symlinks are reported explicitly and are not silently followed by recursive destructive operations.

## Durable transfers

There is one durable transfer engine. Foreground and background execution are policies of the same engine, not separate APIs with different completion meanings.

```ts
export interface TransferManager
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  createClient(options: TransferClientOptions): TransferClient
  getDownloadTask(id: string): Promise<DownloadTask | undefined>
  getUploadTask(id: string): Promise<UploadTask | undefined>
  listTasks(query?: TransferQuery): Promise<TransferTaskPage>
  setQueuePolicy(policy: QueuePolicy): Promise<void>
  removeTerminalTask(id: string): Promise<void>
}

export interface TransferClient
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  enqueueDownload(request: DownloadRequest): Promise<DownloadTask>
  enqueueUpload(request: UploadRequest): Promise<UploadTask>
  close(): void
}
```

`TransferClient` replaces the upstream JavaScript-only session abstraction. It contributes serializable defaults such as headers, cookies, retry policy, and grouping. Submitted work is owned by the native coordinator and does not depend on the client, task handle, JS runtime, or React component lifetime.

A task record is durably committed before enqueue resolves. Queue order is priority descending, then enqueue sequence ascending. Concurrency counts actual running native transfers. Every state transition is committed before it is emitted.

Snapshots are discriminated unions with these states:

- `queued`
- `running`
- `paused`
- `completed`
- `failed`
- `cancelled`

Each snapshot has a monotonically increasing revision. Terminal results and failures are durable. `wait()` is repeatable and always waits for terminal completion. Closing a handle or removing a listener never cancels work. Cancellation is explicit and idempotent.

Complete normalized request configuration is persisted, including headers, retry, integrity, network policy, notification policy, destination, response capture, and upload body metadata. Unsupported required behavior rejects before persistence rather than being ignored.

## Archives

ZIP work is a separate task-oriented module:

```ts
export interface ArchiveManager
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  createArchive(request: CreateArchiveRequest): Promise<ArchiveTask>
  extractArchive(request: ExtractArchiveRequest): Promise<ArchiveTask>
}
```

Archive extraction stages into a private temporary directory. Before publishing output it validates canonical destination containment, entry count, per-entry expanded size, total expanded size, compression ratio, supported methods, and archive integrity. Failure or cancellation removes staging output.

Maintained platform archive libraries are hidden behind an internal adapter. The public contract does not expose their types or capabilities beyond a small typed capability object.

## Content and cookies

`ContentManager` owns operations that cross into OS content or UI facilities:

- publish an app-private file into Photos or MediaStore;
- share one or more files;
- open a file with an external application.

Share results remain truthful. A platform that cannot observe completion returns `launched`; other platforms may return `completed` or `cancelled`.

Cookie stores are explicit:

```ts
type CookieStoreKind = 'transfer' | 'web'
```

The API does not imply that URLSession/OkHttp cookies and browser/WebView cookies are synchronized. Platform-specific metadata availability is represented as typed basic or detailed cookie variants.

## Errors

Promise failures reject real JavaScript `Error` instances. Error messages contain a stable `[file-toolkit/<code>]` prefix because Nitro 0.37.1 does not expose a portable rich custom-error channel.

Durable task snapshots additionally expose structured failures:

```ts
export interface TransferFailure {
  readonly code: FileToolkitErrorCode
  readonly message: string
  readonly operation: string
  readonly isRetryable: boolean
  readonly httpStatusCode?: number
}
```

There are no success/error envelopes, `Object`, `AnyMap`, `any`, raw native exceptions, or raw platform status integers in the public API.

## React adapter

React support is exported from `react-native-nitro-filetoolkit/react`. Hooks use `useSyncExternalStore` over task snapshots. Cleanup removes only the listener subscription; it never cancels or closes durable work.

The imperative Nitro API remains authoritative and usable without React.

## Native architecture

Each HybridObject implementation is orchestration-only and final. Native support code is split by responsibility:

- location resolver;
- filesystem executor and atomic publisher;
- durable transfer registry;
- priority scheduler;
- foreground/background transport adapters;
- retry and integrity policies;
- archive engine and safety policy;
- content presenter;
- transfer and web cookie adapters;
- error mapper.

iOS uses Swift with owned serial queues for callback-oriented Foundation APIs. `Promise.parallel(queue)` is used for queue-owned filesystem work. Main-thread access is limited to UIKit/Photos operations that require it.

Android uses Kotlin coroutines with owned scopes and dispatchers. `Promise.async` is used for suspending I/O. WorkManager and the HTTP adapter remain behind the durable transfer seam.

C++ is deferred. It may be introduced only for a measured shared hash or archive hot path whose ownership and build complexity are justified.

## SOLID boundaries

- **Single responsibility:** scheduling, persistence, transport, integrity, archive safety, filesystem mutation, and UI presentation change independently.
- **Open/closed:** internal adapters allow platform and dependency implementations to change without changing the public contract.
- **Liskov substitution:** iOS and Android implementations obey the same observable contract and publish platform differences as capabilities or result variants.
- **Interface segregation:** callers depend on `FileSystem`, `TransferManager`, `ArchiveManager`, `ContentManager`, or `CookieStore`, not one large object.
- **Dependency inversion:** native coordinators depend on small internal ports for true external and local-substitutable systems.

These internal ports are not public extension points. The module stays deep: callers see a small stable seam while persistence, security, lifecycle, platform mismatch, cleanup, and scheduling remain hidden.

## Dependencies

Well-maintained native dependencies are allowed when they materially improve correctness and remain implementation details:

- Android HTTP: OkHttp;
- Android durable scheduling: WorkManager;
- archive support: a maintained ZIP implementation on each platform;
- Apple filesystem, transfer, media, sharing, and cookies: platform frameworks.

Dependency versions are pinned. Conformance behavior is tested through the public Nitro contract so dependencies can be replaced without changing callers.

## Delivery milestones

The full replacement is delivered as independently testable milestones:

1. Repository, generated Nitro contract, lazy root, locations, and filesystem foundation.
2. Durable transfer registry, scheduler, downloads, uploads, retry, integrity, and reattachment.
3. Safe archive tasks and hostile-archive conformance tests.
4. Content publishing, share/open, and cookie stores.
5. React adapters, example workflows, real-device lifecycle tests, documentation, and release hardening.

Every milestone leaves the repository buildable and testable. Public contract changes discovered during implementation update this design before dependent milestones proceed.
