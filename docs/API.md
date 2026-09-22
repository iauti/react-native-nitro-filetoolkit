# Filesystem API reference

[Documentation](README.md) · [Quick start](../README.md) · [Recipes](RECIPES.md)

The runtime export is `FileToolkit`. Call `FileToolkit.getFileSystem(): FileSystem`
to obtain the cached native filesystem. The factory is created when the module
is imported; the filesystem is created lazily on first use. Import it only in
a native React Native environment.

Public types are exported from `react-native-nitro-filetoolkit`. The authoritative
contracts are the [Nitro specs](../packages/react-native-nitro-filetoolkit/src/specs/FileSystem.nitro.ts)
and [option types](../packages/react-native-nitro-filetoolkit/src/types/FileOptions.ts).
Fields are required unless marked `?`. `UInt64` is represented by `bigint` below.
Promise-returning operations run filesystem work on native worker queues;
constructors and `close()` are synchronous and can throw.

## Locations and external sources

| Method | Result | Behavior |
| --- | --- | --- |
| `location(directory: ManagedDirectory, relativePath: string)` | `FileLocation` | Validate a reference below a managed root; does not create the file |
| `root(directory: ManagedDirectory)` | `FileLocation` | Ensure the root exists and return its reference |
| `fromUri(uri: string)` | `FileLocation` | Validate an absolute local `file://` URI |
| `sourceFromUri(uri: string)` | `FileSource` | Validate a read-only external URI; Android supports file/content, iOS file only |
| `inspectSource(source: FileSource)` | `Promise<SourceInfo \| undefined>` | Return source metadata, or `undefined` if unavailable; permission/provider failures can reject |
| `importFile(options: ImportFileOptions)` | `Promise<FileInfo>` | Stream source through a sibling staging file and install at destination; create parents |

`ManagedDirectory`: `cache`, `documents`, `downloads`, `temporary`, or
`application-support`. See [platform mappings and path rules](CONCEPTS.md).
Construct locations/sources through the factory methods instead of object literals.
`fromUri()` does not accept raw filesystem paths, `content://`, or HTTP URLs.

| Type | Fields |
| --- | --- |
| `FileLocation` | `origin: FileLocationOrigin`, `uri: string` |
| `FileLocationOrigin` | `managed` or `uri` |
| `FileSource` | `scheme: FileSourceScheme`, `uri: string` |
| `FileSourceScheme` | `file` or `content` |
| `SourceInfo` | `source: FileSource`, `name?: string`, `byteCount?: bigint` |
| `ImportFileOptions` | `source: FileSource`, `destination: FileLocation`, `collision: CollisionPolicy`, `atomicity: Atomicity` |

`inspectSource()` does not reserve access. Name and size may be absent. Import
while the app holds the provider grant; the toolkit does not persist or renew it.
Imports use bounded memory, but do not expose a total-size cap or cancellation.
With `collision: 'fail'`, installation rejects an existing destination without
replacing it, including a competing creation at installation time.

## Metadata and listing

| Method | Result | Behavior |
| --- | --- | --- |
| `stat(location: FileLocation)` | `Promise<FileInfo \| undefined>` | Inspect an entry; missing entries return `undefined` |
| `list(options: ListOptions)` | `Promise<FilePage>` | Return a sorted page of visible entries in an existing directory |

| Type | Fields |
| --- | --- |
| `FileInfo` | `kind: FileKind`, `location: FileLocation`, `name: string`, `byteCount?: bigint`, `symbolicLinkTarget?: FileLocation`, `createdAt?: Date`, `modifiedAt?: Date` |
| `FileKind` | `file`, `directory`, or `symbolic-link` |
| `ListOptions` | `directory: FileLocation`, `cursor?: string`, `maxEntryCount: bigint`, `recursive: boolean` |
| `FilePage` | `items: FileInfo[]`, `nextCursor?: string` |

`byteCount` is file size, not a recursive directory size; it is absent for
directories and symbolic links. Timestamps are JavaScript `Date` values when
available. Metadata locations currently have `origin: 'uri'`, including results
for managed inputs. Keep your original managed directory/path for persistence.

`maxEntryCount` must be positive and fit platform limits. Hidden dot-files are
excluded; iOS also respects its hidden-file flag. `recursive: true` includes
descendants. Ordering uses native platform sorting and need not match between
iOS and Android. A page limits returned entries, not native enumeration memory.

Pass `nextCursor` unchanged into the next request with the same directory and
recursion settings. It encodes an offset, not a snapshot; mutations can shift
entries or invalidate the cursor. Restart from an omitted cursor after changes.

## Text I/O

| Method | Result | Behavior |
| --- | --- | --- |
| `readText(options: ReadTextOptions)` | `Promise<string>` | Read/decode the entire file within the byte cap |
| `writeText(options: WriteTextOptions)` | `Promise<FileInfo>` | Write text and return destination metadata |

| Type | Fields |
| --- | --- |
| `ReadTextOptions` | `source: FileLocation`, `encoding: TextEncoding`, `maxByteCount: bigint` |
| `WriteTextOptions` | `destination: FileLocation`, `text: string`, `encoding: TextEncoding`, `mode: WriteMode`, `atomicity: Atomicity`, `createParentDirectories: boolean` |
| `TextEncoding` | `utf-8`, `utf-16le`, or `utf-16be` |

`maxByteCount` bounds encoded bytes, not characters. Oversized files, unsupported
platform bounds, and invalid encoded text fail. The decoded string still occupies
JavaScript memory; use a reader for large binary files.

`create-new` rejects an existing destination and uses exclusive installation.
`replace` replaces contents (or creates a file); `atomicity: 'none'` writes
directly. `append` creates a missing file or adds to an existing file **in place**;
its atomicity option does not provide atomic append. Parents must exist unless
`createParentDirectories` is `true`.

## Streaming readers

`openReader(location: FileLocation): Promise<FileReader>` opens an existing file.

| Member | Type/result | Meaning |
| --- | --- | --- |
| `location` | readonly `FileLocation` | Opened location |
| `position` | readonly `bigint` | Current byte offset, initially zero |
| `read(maxByteCount: bigint)` | `Promise<ReadChunk>` | Read up to the requested byte count and advance position |
| `seek(offset: bigint)` | `Promise<void>` | Set the absolute byte offset |
| `close()` | `void` | Release the handle; repeated close is allowed |

`ReadChunk` has `data: ArrayBuffer`, `offset: bigint` (the starting offset), and
`isEndOfFile: boolean`. A chunk may be shorter than requested. Use a positive
chunk size such as `64n * 1024n`; zero does not advance. EOF is based on file size
at open, so avoid modifying the source during reading. Calls after close fail.
Counts/offsets must be non-negative and fit platform limits.

## Streaming writers

`openWriter(options: OpenWriterOptions): Promise<FileWriter>` creates a sibling
staging file. `OpenWriterOptions` has `destination: FileLocation`,
`mode: WriteMode`, `atomicity: Atomicity`, and `createParentDirectories: boolean`.

| Member | Type/result | Meaning |
| --- | --- | --- |
| `destination` | readonly `FileLocation` | Destination reference |
| `position` | readonly `bigint` | Current staging offset; starts at existing size for append, otherwise zero |
| `write(data: ArrayBuffer)` | `Promise<void>` | Write bytes and advance position |
| `flush()` | `Promise<void>` | Sync staging data without installing it |
| `commit()` | `Promise<FileInfo>` | Sync, close, and install staging; return destination metadata |
| `abort()` | `Promise<void>` | Close/discard unfinished staging |
| `close()` | `void` | Close the handle; discards staging for an uncommitted open writer |

All write modes stage data. Streaming append first copies existing contents into
staging, requiring space for that copy. Destination installation happens during
commit. After commit/abort/close, writes, flush, and another commit fail. A failed
commit must be followed by `abort()` for staging cleanup; do not depend on
`close()` alone after a commit failure. Await operations sequentially and release
resources in `finally`; see the [complete streaming recipe](RECIPES.md#stream-a-binary-file).

## Directory and file operations

| Method | Result | Behavior |
| --- | --- | --- |
| `createDirectory(options: CreateDirectoryOptions)` | `Promise<FileInfo>` | Create a directory, optionally creating ancestors |
| `copy(options: CopyOptions)` | `Promise<FileInfo>` | Copy an entry to destination through staging; create parents |
| `move(options: MoveOptions)` | `Promise<FileInfo>` | Move an entry to destination; create parents |
| `remove(options: RemoveOptions)` | `Promise<void>` | Remove an entry according to recursive/missing policies |

| Type | Fields |
| --- | --- |
| `CreateDirectoryOptions` | `location: FileLocation`, `createParentDirectories: boolean` |
| `CopyOptions` | `source: FileLocation`, `destination: FileLocation`, `collision: CollisionPolicy`, `atomicity: Atomicity`, `followSymbolicLinks: boolean` |
| `MoveOptions` | `source: FileLocation`, `destination: FileLocation`, `collision: CollisionPolicy`, `atomicity: Atomicity` |
| `RemoveOptions` | `location: FileLocation`, `recursive: boolean`, `missing: MissingPolicy` |

For `copy()`, `followSymbolicLinks` selects whether to resolve the source link
before copying. `move()` with required atomicity rejects cross-volume/non-atomic
moves; preferred permits platform fallback (including Android copy/delete).
Copy/move collision checks do not lock the destination against concurrent writes.
Use distinct source/destination paths and coordinate mutations in your app.

A non-empty directory requires `remove({ recursive: true, ... })`.
`missing: 'ignore'` makes removing a missing entry succeed. Recursive removal
can delete a whole subtree; choose an app-specific directory.

## Utilities

| Method | Result | Behavior |
| --- | --- | --- |
| `hash(options: HashOptions)` | `Promise<string>` | Lowercase hexadecimal file digest |
| `getDiskSpace(directory: ManagedDirectory)` | `Promise<DiskSpace>` | Capacity of the volume containing the root, not a per-folder quota |
| `clearManagedDirectory(options: ClearManagedDirectoryOptions)` | `Promise<ClearResult>` | Remove root contents without removing the root itself |

| Type | Fields |
| --- | --- |
| `HashOptions` | `source: FileLocation`, `algorithm: HashAlgorithm` |
| `HashAlgorithm` | `md5`, `sha-1`, `sha-256`, or `sha-512` |
| `DiskSpace` | `availableByteCount: bigint`, `totalByteCount: bigint` |
| `ClearManagedDirectoryOptions` | `directory: ManagedDirectory`, `recursive: boolean` |
| `ClearResult` | `removedEntryCount: bigint`, `reclaimedByteCount: bigint` |

Clearing with `recursive: false` skips child directories. Unlike `list()`, clearing
also considers hidden entries. A missing root returns zero counts. The reclaimed
byte count is measured entry size, not a guarantee about the change in volume
free space. Clearing is broad and not transactional; failure can follow partial
removal. See [overlapping roots](CONCEPTS.md#choose-a-managed-directory).

## Policy types

| Type | Values |
| --- | --- |
| `WriteMode` | `create-new`, `replace`, `append` |
| `CollisionPolicy` | `fail`, `replace` |
| `MissingPolicy` | `fail`, `ignore` |
| `Atomicity` | `required`, `preferred`, `none` |

Required atomicity rejects if the requested atomic installation is unavailable.
Preferred permits non-atomic fallback, which can remove an existing destination
before installation completes. None requests no atomic guarantee. Text append is
an in-place operation regardless of this field. See [policy details](CONCEPTS.md#write-policies).

## Errors

Catch both synchronous calls and awaited operations with `try`/`catch`. Toolkit
validation failures use these message prefixes:

| Prefix | Typical cause |
| --- | --- |
| `[file-toolkit/invalid-location]` | Unsafe path, malformed URI, unsupported source scheme, or managed-root escape |
| `[file-toolkit/invalid-operation]` | Collision, missing parent, closed handle, unavailable atomic operation, or invalid cursor |
| `[file-toolkit/resource-limit]` | Text exceeds its byte cap, or count/offset exceeds platform bounds |

There is no exported cross-platform error class or error-code property. Native
OS/provider errors can also propagate without those prefixes, so always handle
an unknown category. Missing entries are special results for `stat()` and
`inspectSource()`; other operations can fail when their input disappears.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function readOptionalNote(): Promise<string | undefined> {
  try {
    const files = FileToolkit.getFileSystem()
    const source = files.location('documents', 'notes/hello.txt')
    if (await files.stat(source) === undefined) return undefined
    return await files.readText({
      source,
      encoding: 'utf-8',
      maxByteCount: 64n * 1024n,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Could not read note:', message)
    throw error
  }
}
```

The existence check is only a convenience: the file may disappear before the
read. Do not treat every read failure as a missing file.

## Other exported interfaces

`FileToolkitFactory` describes `getFileSystem(): FileSystem`; the `FileToolkit`
runtime value implements it. `FileSystem`, `FileReader`, and `FileWriter` extend
Nitro `HybridObject` interfaces. Use the documented resource methods for cleanup.

`ListenerSubscription` is a type with `remove(): void`. No current filesystem
method returns it; there is no event subscription or watcher API in this release.
