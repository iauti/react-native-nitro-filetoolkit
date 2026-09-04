# Filesystem API

The package exports one runtime value, `FileToolkit`, plus TypeScript interfaces
and option types. `FileToolkit.getFileSystem()` lazily creates the native
filesystem and returns the cached instance on subsequent calls.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

const files = FileToolkit.getFileSystem()
```

All byte counts and offsets are Nitro `UInt64` values and therefore TypeScript
`bigint` values. Use `1024n`, not `1024`.

## Locations

`FileLocation` identifies a writable local filesystem path and contains
`origin: 'managed' | 'uri'` plus a canonical `file://` URI. Construct locations
with the methods below instead of hand-authoring them.

### `root(directory)`

Returns the canonical app-owned root for `cache`, `documents`, `downloads`,
`temporary`, or `application-support`.

### `location(directory, relativePath)`

Creates a validated `FileLocation` below an app-owned root.

```ts
const thumbnail = files.location('cache', 'images/thumbnail.jpg')
```

`ManagedDirectory` is one of `cache`, `documents`, `downloads`, `temporary`, or
`application-support`. The returned URI is platform-specific; persist the
managed directory and relative path when an item must survive app restoration.

Relative paths must use `/` separators and cannot be empty, absolute, or
contain NUL bytes, backslashes, empty segments, `.` segments, or `..` segments.

### `fromUri(uri)`

Validates and normalizes an absolute `file://` URI into a URI-origin location.
It never accepts Android `content://` values.

## External sources

`FileSource` is a read-only capability with `scheme: 'file' | 'content'` and a
validated URI. It is intentionally incompatible with `FileLocation`, so it
cannot be passed to write, move, or remove APIs.

### `sourceFromUri(uri)`

Validates a picker/share URI. Android accepts absolute `file://` and
`content://` URIs. iOS accepts absolute `file://` URIs only.

### `inspectSource(source)`

Returns `SourceInfo | undefined`. `undefined` means the source is unavailable;
permission and provider failures reject. `name` and `byteCount` are optional
because content providers are not required to report them.

```ts
const info = await files.inspectSource(source)
if (info === undefined) throw new Error('The selected file is unavailable')

if (info.byteCount === undefined) {
  // Import first, then use the returned local FileInfo.byteCount.
}
```

### `importFile(options)`

Streams a `FileSource` into a local destination through a sibling staging file
and returns the destination `FileInfo` after installation.

```ts
await files.importFile({
  source,
  destination: files.location('documents', 'imports/selected-file'),
  collision: 'fail',
  atomicity: 'preferred',
})
```

`collision` is `fail` or `replace`. With `fail`, rejection preserves an existing
destination through a race-safe install-new primitive. With `replace`, use
`atomicity: 'required'` when the old destination must survive any failed
installation; `preferred` and `none` may use a non-atomic fallback. `atomicity`
also accepts `preferred` or `none`. Imports are bounded and do not load the
entire source into JavaScript or native memory.

Android `content://` access uses the grant currently held by the app. The
toolkit does not persist or renew grants; inspect and import while access is
valid.

## Metadata and listing

### `stat(location)`

Returns `FileInfo` or `undefined` when the entry does not exist. `FileInfo`
contains its `kind`, `location`, `name`, optional `byteCount`, optional symbolic
link target, and optional creation/modification dates.

### `list(options)`

Returns a deterministic page of visible entries. Hidden dot-files are skipped.
Set `recursive` to include descendants and `maxEntryCount` to a positive
`bigint`. If `nextCursor` is present, pass it unchanged into the next request.

```ts
let cursor: string | undefined

do {
  const page = await files.list({
    directory: files.location('documents', 'reports'),
    cursor,
    maxEntryCount: 50n,
    recursive: false,
  })
  cursor = page.nextCursor
} while (cursor !== undefined)
```

Cursors encode an offset into the current sorted listing. If the directory
changes during pagination, restart without a cursor for a consistent result.

## Text I/O

### `readText(options)`

Reads a whole file only when its encoded size does not exceed `maxByteCount`.
Supported encodings are `utf-8`, `utf-16le`, and `utf-16be`. Invalid text and
oversized files reject the promise.

### `writeText(options)`

Writes text and returns destination metadata.

- `mode`: `create-new`, `replace`, or `append`
- `atomicity`: `required`, `preferred`, or `none`
- `createParentDirectories`: create missing parents when `true`

`create-new` rejects an existing destination. `append` appends to an existing
file or creates a new one. Atomicity applies to replacement/installation;
appending is an in-place operation.

## Streaming I/O

### `openReader(location)`

Opens a reader with `location`, `position`, `read(maxByteCount)`, `seek(offset)`,
and `close()`. `read()` returns `{ data, offset, isEndOfFile }`. Close readers
when finished; methods reject after close.

### `openWriter(options)`

Opens a staged writer with `destination`, `position`, `write(data)`, `flush()`,
`commit()`, `abort()`, and `close()`.

- `commit()` synchronizes the staging file and installs it at the destination.
- `abort()` discards the staging file.
- `close()` without a successful commit also discards the staging file.
- Further writes reject after commit, abort, or close.

## Directory and file operations

### `createDirectory(options)`

Creates a directory and returns its metadata. Set
`createParentDirectories: true` to create missing ancestors.

### `copy(options)`

Copies a file or directory to a destination. Parents are created automatically.
`collision` is `fail` or `replace`; `followSymbolicLinks` controls whether a
symbolic-link source is resolved before copying.

### `move(options)`

Moves a file or directory. Parents are created automatically. With
`atomicity: 'required'`, a cross-volume or otherwise non-atomic move rejects.
`preferred` permits the Android implementation to fall back to copy/delete.

### `remove(options)`

Removes a file or directory. Non-empty directories require `recursive: true`.
Set `missing: 'ignore'` for idempotent cleanup or `missing: 'fail'` to reject a
missing location.

## Utilities

### `hash(options)`

Returns a lowercase hexadecimal digest. Algorithms are `md5`, `sha-1`,
`sha-256`, and `sha-512`.

### `getDiskSpace(directory)`

Returns `availableByteCount` and `totalByteCount` for the volume containing the
managed directory.

### `clearManagedDirectory(options)`

Removes entries inside a managed directory without removing the root. With
`recursive: false`, child directories are skipped. The result contains
`removedEntryCount` and `reclaimedByteCount`.

This is intentionally a broad operation. Prefer removing known locations in
normal application flows and reserve managed-directory clearing for explicit
cache/reset actions.

## Errors

Native failures reject with messages prefixed by one of:

- `[file-toolkit/invalid-location]` for malformed or unsafe paths/URIs
- `[file-toolkit/invalid-operation]` for filesystem state or policy failures
- `[file-toolkit/resource-limit]` when a byte count or offset exceeds a bound

The initial API does not expose a platform-independent error class. Match the
stable prefix only when application behavior must branch by category, and show
the remaining message for diagnostics.
