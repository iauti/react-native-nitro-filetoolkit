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

Validates and normalizes an absolute `file://` URI. Android `content://` URIs
are not supported in the filesystem-only release.

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
