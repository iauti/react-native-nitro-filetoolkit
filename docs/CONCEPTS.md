# Locations and policies

[Documentation](README.md) · [Recipes](RECIPES.md) · [API](API.md)

## Choose a managed directory

A managed directory belongs to your app. Its physical path depends on the
platform and installation; store the directory name and relative path in your
application data instead of persisting a full sandbox URI.

| Root | Typical use | iOS mapping | Android mapping |
| --- | --- | --- | --- |
| `documents` | Files the app should keep | Documents | `Context.filesDir` |
| `application-support` | Internal application data | Library/Application Support | `filesDir/ApplicationSupport` |
| `cache` | Data you can recreate | Library/Caches | `Context.cacheDir` |
| `temporary` | Short-lived work files | System-provided app temporary directory | `cacheDir/Temporary` |
| `downloads` | App-owned imported/downloaded files | Documents/Downloads | `filesDir/Downloads` |

Treat cache and temporary files as disposable. The toolkit does not configure
backup, file sharing, or media-library visibility. `downloads` does not publish
files to the device's public Downloads folder. These roots need no broad Android
storage permission because they are inside app-owned storage.

Roots can overlap: clearing Android `documents` recursively also clears its
`Downloads` and `ApplicationSupport` children; clearing Android `cache`
recursively includes `Temporary`. Prefer removing a known app subdirectory.

## Locations are references, not open files

`location(directory, relativePath)` validates a path and returns a `FileLocation`.
It does not create the entry. `root(directory)` ensures the root directory exists
and returns its location. `fromUri(uri)` validates a local absolute `file://` URI.
None of these methods opens a file handle or gives access outside OS permissions.

Use `/` separators: `notes/hello.txt`. Empty paths, absolute paths, backslashes,
NUL, empty segments, `.` and `..` are rejected. Use `root()` for the directory
itself. Do not build or edit `FileLocation` objects by hand.

Managed locations validate containment, including relevant symbolic-link
resolution. URI-origin locations have no managed-root boundary and remain
subject to OS access restrictions. Neither is a permission grant.

## External sources are read-only

A `FileSource` can be inspected or imported, but cannot be passed to regular
read/write/move/remove methods. Android accepts `file://` and `content://`;
iOS accepts accessible `file://` sources. An HTTP URL is not a file source.

The usual flow is:

1. Obtain a URI from your picker or share integration.
2. Convert it with `sourceFromUri()`.
3. Optionally read its name/size with `inspectSource()`.
4. Import with `importFile()` and use the returned `FileInfo.location`.

The toolkit does not display a picker or persist/renew Android URI grants.
Import while the app has access. A provider may omit name and size, and access
can disappear between inspection and import. On iOS, an app-accessible picker
copy is the simplest integration; see the [document-picker recipe](RECIPES.md#import-a-picked-document).

Imports stream in bounded chunks, but **there is no total import size limit,
progress callback, or cancellation option**. The destination needs room for the
complete file. An optional provider-reported size is not an enforceable limit.

## Write policies

All policy fields are required; there are no implicit defaults.

| Field | Values | Meaning |
| --- | --- | --- |
| `mode` | `create-new`, `replace`, `append` | Reject an existing destination, replace contents, or add contents |
| `collision` | `fail`, `replace` | Policy when an import/copy/move destination exists |
| `missing` | `fail`, `ignore` | Policy when removing a missing entry |
| `atomicity` | `required`, `preferred`, `none` | Require atomic installation, allow fallback, or request no atomic guarantee |

Atomic installation makes the destination switch to the completed replacement.
`preferred` and `none` can remove the previous file before installation finishes;
a subsequent failure can therefore leave no destination. Atomicity does not
make multiple operations a transaction or coordinate simultaneous writers.
Serialize writes to the same destination yourself.

`writeText({ mode: 'append', ... })` writes in place; its atomicity option does
not make append atomic. `openWriter({ mode: 'append', ... })` instead copies the
existing contents into staging, then installs the combined file at commit. This
requires extra disk space and can overwrite changes made by another writer.

`create-new` writes and `importFile({ collision: 'fail', ... })` use an exclusive
installation step. Do not assume the same race protection for `copy` or `move`;
those operations check for collisions before performing the mutation.

## Bounded memory and native resources

Byte counts, offsets, and entry counts are `bigint`: write `64n * 1024n`.
Use `.toString()` for display/JSON serialization. `JSON.stringify()` cannot
serialize a raw `bigint`; converting large values to `number` can lose precision.
Counts must be non-negative and fit the native operation's platform limit.

`readText()` returns the whole decoded string, so choose a practical byte cap.
For large binary files, process one `ArrayBuffer` chunk at a time. A paginated
`list()` limits the returned page, but the current native implementation still
collects and sorts the directory listing for each request.

Readers and writers own native handles. Await each operation before closing the
handle. Use a positive chunk size; a zero-byte read does not advance a reader.
Avoid changing the source while reading it because EOF uses its size at open.

A writer's `flush()` syncs staging data without publishing it. `commit()` syncs
and installs the staging file. On failure call `abort()` to discard staging,
then close all handles in `finally`. Do not rely on garbage collection for cleanup.
See the [streaming recipe](RECIPES.md#stream-a-binary-file).
