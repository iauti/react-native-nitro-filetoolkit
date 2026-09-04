# React Native Nitro File Toolkit

Fast, type-safe native filesystem APIs for React Native, powered by
[Nitro Modules](https://nitro.margelo.com/).

## Why use it?

- Swift and Kotlin filesystem operations outside the JS thread
- Validated app-owned paths and absolute `file://` URIs
- Bounded text reads and staged binary streaming
- Explicit collision, missing-file, write, and atomicity policies
- Paginated listing, metadata, hashing, disk-space, and cleanup APIs
- Native 64-bit byte counts exposed as TypeScript `bigint`

This IAUTI Labs package is a clean successor to `rn-file-toolkit`; it is not
API-compatible with that library.

## Requirements

- React Native New Architecture
- `react-native-nitro-modules >=0.37.1 <0.38.0`
- iOS or Android
- Expo development build for Expo projects; Expo Go is not supported

## Install

```bash
npm install react-native-nitro-filetoolkit react-native-nitro-modules
```

```bash
bun add react-native-nitro-filetoolkit react-native-nitro-modules
```

Bare React Native iOS projects must run `pod install`. Expo projects should
generate and run a development build:

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
const report = files.location('documents', 'reports/annual.txt')

await files.writeText({
  destination: report,
  text: 'Annual report',
  encoding: 'utf-8',
  mode: 'replace',
  atomicity: 'preferred',
  createParentDirectories: true,
})

const contents = await files.readText({
  source: report,
  encoding: 'utf-8',
  maxByteCount: 1_048_576n,
})

const info = await files.stat(report)
const digest = await files.hash({ source: report, algorithm: 'sha-256' })
```

## Common operations

```ts
const archive = files.location('documents', 'archive')
await files.createDirectory({
  location: archive,
  createParentDirectories: true,
})

const page = await files.list({
  directory: archive,
  maxEntryCount: 100n,
  recursive: false,
})

const copy = files.location('documents', 'archive/report-copy.txt')
await files.copy({
  source: report,
  destination: copy,
  collision: 'replace',
  atomicity: 'preferred',
  followSymbolicLinks: false,
})

await files.remove({
  location: copy,
  recursive: false,
  missing: 'ignore',
})
```

## Streaming

Readers and writers own native resources. Always close them. A writer uses a
staging file and updates its destination only after `commit()` succeeds.

```ts
const reader = await files.openReader(report)
const destination = files.location('cache', 'report-copy.bin')
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

## Behavior to know

- `UInt64` values are `bigint` in TypeScript; use `64n`, not `64`.
- `readText()` rejects files larger than `maxByteCount` before decoding.
- `location()` rejects empty paths, absolute paths, backslashes, NUL bytes,
  empty segments, `.` segments, and `..` segments.
- `fromUri()` currently accepts absolute `file://` URIs only.
- Directory-list cursors are opaque. Pass `nextCursor` back unchanged.
- `atomicity: 'required'` fails if the platform cannot guarantee the requested
  operation atomically; `'preferred'` may fall back where supported.

Full documentation and runnable examples:
[github.com/iauti/react-native-nitro-filetoolkit](https://github.com/iauti/react-native-nitro-filetoolkit).

## Roadmap

- [x] Filesystem locations, text and binary I/O, metadata, and mutations
- [x] Hashing, disk-space reporting, and managed-directory cleanup
- [ ] Durable downloads and uploads
- [ ] Safe archive creation and extraction
- [ ] Sharing, external opening, Photos, and MediaStore
- [ ] Transfer and WebView cookie stores
- [ ] React task hooks

Unchecked domains are not placeholder exports; they will enter the public API
only after both native implementations and behavior tests are complete.

## License

MIT © IAUTI Labs
