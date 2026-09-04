# External File Sources and Managed Roots

**Status:** Approved for implementation  
**Date:** 2026-09-04  
**Branch:** `codex/external-file-sources`

## Objective

Allow applications to inspect and import files selected outside their managed
filesystem, including Android Storage Access Framework `content://` resources,
without treating those resources as writable local paths. Also expose managed
directory roots and make the Android `documents` root consistent with the
standard React Native and Expo app files directory.

The first consumer is Onemimir. Its Android document picker deliberately avoids
an eager cache copy for large files, then inspects and imports the returned
`content://` URI while the temporary read grant remains valid.

## Scope

This change is package-only and intentionally breaking. It includes:

- A read-only `FileSource` abstraction for `file:` and Android `content:` URIs.
- Source inspection and streamed import into a local `FileLocation`.
- A first-class managed-directory root location.
- Standardized Android Documents-root and file-URI behavior.
- Native implementations, generated Nitrogen bindings, documentation, example
  coverage, and tests.

It excludes client integration, persistent Android URI grants, upload/download
transfers, arbitrary raw-path APIs, and compatibility with Nitro 0.35.

## Public API

### Local locations

`FileLocation` continues to represent a local filesystem location that may be
used by local read, write, move, copy, hash, and removal operations.

```ts
export type FileLocationOrigin = 'managed' | 'uri'

export interface FileLocation {
  readonly origin: FileLocationOrigin
  readonly uri: string
}
```

The filesystem exposes three ways to obtain one:

```ts
root(directory: ManagedDirectory): FileLocation
location(directory: ManagedDirectory, relativePath: string): FileLocation
fromUri(uri: string): FileLocation
```

- `root()` returns the selected managed root itself with `origin: 'managed'`.
- `location()` returns `origin: 'managed'` and retains its strict non-empty
  portable-relative-path validation.
- `fromUri()` returns `origin: 'uri'`, remains file-only, and rejects
  `content:`, network, and relative URIs. This is needed for writable local
  files produced by native libraries, such as compressor output.

### Read-only sources

`FileSource` represents a readable URI that is not necessarily a normal local
file. Its scheme is resolved and validated natively.

```ts
export type FileSourceScheme = 'file' | 'content'

export interface FileSource {
  readonly uri: string
  readonly scheme: FileSourceScheme
}

export interface SourceInfo {
  readonly source: FileSource
  readonly name?: string
  readonly byteCount?: UInt64
}
```

The filesystem adds:

```ts
sourceFromUri(uri: string): FileSource
inspectSource(source: FileSource): Promise<SourceInfo | undefined>
importFile(options: ImportFileOptions): Promise<FileInfo>
```

`sourceFromUri()` accepts absolute `file:` URIs on both platforms and
`content:` URIs on Android. iOS rejects `content:` immediately because the
platform has no equivalent URI scheme. Unknown schemes are rejected on both
platforms. The required `origin` field on `FileLocation` and `scheme` field on
`FileSource` make the types structurally incompatible in TypeScript while using
meaningful unions supported by Nitrogen 0.37.1. Native code still revalidates
every received URI, location origin, and declared source scheme because
JavaScript objects can be forged at runtime.

`inspectSource()` returns `undefined` when the source is unavailable. A present
source may still have an unknown `name` or `byteCount`; Android content
providers are allowed to omit those metadata columns. Inspection must not read
an entire source merely to calculate a missing size.

```ts
export interface ImportFileOptions {
  readonly source: FileSource
  readonly destination: FileLocation
  readonly collision: CollisionPolicy
  readonly atomicity: Atomicity
}
```

`importFile()` copies source bytes into a local destination and returns the
destination `FileInfo`. The destination parent is created automatically, which
matches existing `copy()` behavior. Sources remain read-only: they cannot be
passed to `move()`, `remove()`, `writeText()`, `openWriter()`, or any other
mutating API.

### Why this shape

Adding `statUri()` and `copyFromUri()` would expose transport details through
method names and make it easy to attempt invalid mutations later. Keeping
`FileSource` separate from `FileLocation` models the stable capability boundary:
a source can be inspected and imported; a location is a local filesystem target.

No new HybridObject is required. Sources have no owned lifecycle or persistent
native state, so plain Nitro structs on the existing lazy `FileSystem`
HybridObject are sufficient.

## Native behavior

### Android

Managed roots resolve as follows:

| Managed directory | Android location |
|---|---|
| `documents` | `Context.filesDir` |
| `cache` | `Context.cacheDir` |
| `downloads` | `Context.filesDir/Downloads` |
| `temporary` | `Context.cacheDir/Temporary` |
| `application-support` | `Context.filesDir/ApplicationSupport` |

This changes `documents` from `Context.filesDir/Documents` to
`Context.filesDir`, matching Expo FileSystem and react-native-blob-util. The
package has not released a stable version, so no migration for the old mapping
is provided.

Local locations are emitted through Android URI APIs as canonical
`file:///absolute/path` strings rather than Java `File.toURI()`'s commonly
observed `file:/absolute/path` spelling. `root()` and `location()` emit
`origin: 'managed'`; `fromUri()` emits `origin: 'uri'` after validating and
normalizing the local file URI.

For a `content:` source:

1. `sourceFromUri()` validates that the URI is absolute and has the `content`
   scheme. It performs no I/O.
2. `inspectSource()` queries `OpenableColumns.DISPLAY_NAME` and
   `OpenableColumns.SIZE`. Missing columns remain `undefined`. A provider result
   that explicitly indicates a missing document, or a `FileNotFoundException`,
   returns `undefined`; permission denial and other provider failures reject.
3. `importFile()` opens the source through `ContentResolver`, streams it into a
   sibling staging file using a bounded buffer, synchronizes the output, and
   installs the staging file according to collision and atomicity policy.
4. Streams, cursors, and descriptors are closed deterministically on success or
   failure. Partial staging files are removed.

The operation does not request or persist URI permissions. The caller must run
it while its picker or share grant is valid.

### iOS

`root()` and `location()` use the existing `FileManager` roots and emit
`origin: 'managed'`; `fromUri()` validates a local file URL and emits
`origin: 'uri'`. A `file:` source is inspected and imported using the same
metadata and staged-copy primitives as local file copying. `content:` and
unknown URI schemes are rejected during source creation. Source resolvers emit
only the validated `scheme` and normalized `uri` fields.

### Threading and memory

Inspection and import are asynchronous. They run on the existing package-owned
I/O queue or dispatcher and never on the UI thread. Imports use streaming with a
fixed-size buffer; file contents are never materialized as a single `Data`,
`ByteArray`, `ArrayBuffer`, or JavaScript value.

## Collision and atomicity

`importFile()` follows the existing policy vocabulary:

- `collision: 'fail'` rejects if the destination already exists.
- `collision: 'replace'` permits replacement.
- `atomicity: 'required'` requires staged installation in the destination
  directory and rejects if the platform cannot install atomically.
- `atomicity: 'preferred'` attempts atomic installation and may fall back to a
  safe non-atomic replacement.
- `atomicity: 'none'` permits direct replacement semantics.

The implementation must check collision policy before copying and again at
installation where the platform primitive permits it, preventing a staged
import from silently violating `collision: 'fail'` after a race.

## Errors

Existing error prefixes remain the public error contract:

- `[file-toolkit/invalid-location]` for malformed, relative, unsupported, or
  structurally invalid source URIs.
- `[file-toolkit/invalid-operation]` for denied access, unavailable providers,
  source/destination state, and collision or atomicity failures.
- `[file-toolkit/resource-limit]` for metadata values that cannot fit the public
  or platform representation.

`inspectSource()` returns `undefined` only for a source that is genuinely absent
or no longer resolvable. It does not convert permission, I/O, provider, or
programming errors into absence.

## Documentation and examples

The README and API reference will show:

1. Getting a managed root and listing it with pagination.
2. Importing a document-picker result into Documents.
3. Handling an unknown source byte count.
4. Using `fromUri()` for a writable local compressor output and
   `sourceFromUri()` for a read-only picker result.
5. Android URI-grant lifetime expectations.

The Expo Router example will add one focused external-source example rather
than another tab. It will use the document picker, inspect the selection, import
it to a generated cache or documents path, display metadata, and allow cleanup.

## Verification

Automated contract and behavior coverage must include:

- `root()` for every managed directory.
- Empty `location()` paths still rejecting.
- Consistent absolute `file:///` URI normalization.
- `sourceFromUri()` accepting supported schemes and rejecting unknown or
  relative URIs.
- Missing file and content sources.
- Content metadata with present and absent display-name/size columns.
- Large imports using multiple buffer iterations.
- Destination parent creation.
- `fail` and `replace` collision behavior.
- Staging-file cleanup after interrupted or failed imports.
- File-source imports on both platforms.
- Android content-source imports in the example/dev-client environment.
- Type tests proving `FileSource` is not accepted by mutating location APIs.

Before completion, run Nitrogen generation, generated-diff verification,
package tests, typecheck, lint, build, package validation, example structure and
type checks, and native Android/iOS builds.

## Client integration boundary

After this branch merges, Onemimir can be changed independently by replacing
the implementation of its existing `@onemimir/upload-bindings` facade. That
adapter will:

- Collect all list pages.
- Convert `UInt64` byte counts to numbers with a safe-integer guard.
- Convert canonical file URIs to raw paths only for native libraries that still
  require paths.
- Use `sourceFromUri()` and `inspectSource()` before importing Android picker
  assets.
- Use explicit recursive, missing, collision, and atomicity policies.

The package branch does not modify, link, or build the client repository.
