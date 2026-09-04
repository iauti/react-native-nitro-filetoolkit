# React Native Nitro File Toolkit

[![CI](https://github.com/iauti/react-native-nitro-filetoolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/iauti/react-native-nitro-filetoolkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-nitro-filetoolkit.svg)](https://www.npmjs.com/package/react-native-nitro-filetoolkit)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Fast, type-safe native filesystem APIs for React Native, built with
[Nitro Modules](https://nitro.margelo.com/). Read and write text, stream binary
data, inspect directories, move files, calculate hashes, and manage app-owned
storage without a legacy bridge API.

This is an IAUTI Labs project and a clean successor to `rn-file-toolkit`. It
does not preserve the old package's API.

## Features

- Native Swift and Kotlin implementations running work off the JS thread
- Validated app-owned locations and absolute `file://` URIs
- Read-only picker sources, including Android `content://` URIs
- Bounded, staged imports into app-owned storage
- Bounded text reads and explicit UTF encodings
- Staged streaming writers with commit and abort semantics
- Collision, missing-file, and atomicity policies instead of boolean flags
- Paginated directory listings, metadata, hashing, disk usage, and cleanup
- `bigint` byte counts and offsets through Nitro's `UInt64`
- One lazily created filesystem hybrid object

## Requirements

- React Native with the New Architecture enabled
- `react-native-nitro-modules >=0.37.1 <0.38.0`
- iOS or Android; web is not a runtime target
- An Expo development build when using Expo; Expo Go cannot load custom native
  modules

## Installation

```bash
npm install react-native-nitro-filetoolkit react-native-nitro-modules
```

Or with Bun:

```bash
bun add react-native-nitro-filetoolkit react-native-nitro-modules
```

For a bare React Native iOS application, install pods after adding the package:

```bash
cd ios && pod install
```

For Expo, install the native dependencies and create a development build:

```bash
npx expo install react-native-nitro-filetoolkit react-native-nitro-modules
npx expo prebuild
npx expo run:ios
# or: npx expo run:android
```

## Quick start

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

const files = FileToolkit.getFileSystem()
const note = files.location('documents', 'notes/hello.txt')

await files.writeText({
  destination: note,
  text: 'Hello from Nitro',
  encoding: 'utf-8',
  mode: 'replace',
  atomicity: 'preferred',
  createParentDirectories: true,
})

const text = await files.readText({
  source: note,
  encoding: 'utf-8',
  maxByteCount: 1_048_576n,
})

const info = await files.stat(note)
const sha256 = await files.hash({ source: note, algorithm: 'sha-256' })
```

`location()` accepts a managed root plus a portable relative path. `root()`
returns the root itself. Use `fromUri()` for absolute local `file://` locations.

## Import an external source

Picker/share URIs are read-only `FileSource` capabilities. Android accepts
`file://` and `content://`; iOS accepts `file://`. Import a source before using
regular local file operations:

```ts
const source = files.sourceFromUri(pickerUri)
const sourceInfo = await files.inspectSource(source)
if (sourceInfo === undefined) throw new Error('The selected file is unavailable')

if (sourceInfo.byteCount === undefined) {
  // Import first, then use the returned local FileInfo.byteCount.
}

const imported = await files.importFile({
  source,
  destination: files.location('documents', 'imports/selected-file'),
  collision: 'fail',
  atomicity: 'preferred',
})
```

`collision: 'fail'` preserves an existing destination; `'replace'` installs
the new file through a sibling staging item. The toolkit does not persist or
renew Android `content://` grants, so import while the app holds permission.

## Migration notes for this breaking API

- `FileLocation` now includes `origin: 'managed' | 'uri'`. Replace hand-authored
  objects with `location()`, `root()`, or `fromUri()`.
- Android `documents` now maps directly to `Context.filesDir`.
- Convert picker/share URIs with `sourceFromUri()` and copy them locally with
  `importFile()`; do not pass them to writable location APIs.
- Android `content://` grants are not persisted by the toolkit.

## Streaming binary data

Readers and writers own native resources. Close them in `finally` blocks. A
writer changes the destination only after `commit()` succeeds; `abort()` or
`close()` discards its staging file.

```ts
const source = files.location('cache', 'input.bin')
const destination = files.location('documents', 'output.bin')
const reader = await files.openReader(source)
const writer = await files.openWriter({
  destination,
  mode: 'replace',
  atomicity: 'preferred',
  createParentDirectories: true,
})

try {
  while (true) {
    const chunk = await reader.read(64n * 1024n)
    if (chunk.data.byteLength > 0) await writer.write(chunk.data)
    if (chunk.isEndOfFile) break
  }
  await writer.commit()
} catch (error) {
  await writer.abort()
  throw error
} finally {
  reader.close()
  writer.close()
}
```

## Documentation

- [API reference](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Example application](apps/example/README.md)
- [Contributing](CONTRIBUTING.md)
- [Release process](docs/RELEASING.md)
- [Security policy](SECURITY.md)

## Development

```bash
bun install
bun run specs
bun run test
bun run typecheck
bun run lint
bun run build
bun run package:check
```

The Expo Router example is in `apps/example`. Generated iOS and Android example
projects intentionally remain untracked and can be recreated with Expo
prebuild.

## Roadmap

- [x] Managed locations, metadata, and bounded text I/O
- [x] Streaming readers and staged writers
- [x] Copy, move, remove, hashing, disk space, and managed cleanup
- [x] External source inspection and staged local imports
- [ ] Durable download and upload tasks with retry, progress, and reattachment
- [ ] Safe ZIP creation and extraction
- [ ] Share, open-in, Photos, and MediaStore integration
- [ ] Explicit transfer and WebView cookie stores
- [ ] React hooks over durable task snapshots

Roadmap items are intentionally not exported as placeholder APIs. Each domain
will be added only when its iOS and Android behavior, lifecycle, and tests are
ready to ship.

## License

MIT © IAUTI Labs
