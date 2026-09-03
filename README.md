# React Native Nitro File Toolkit

A modern, type-safe native file toolkit for React Native, powered by Nitro
Modules. This is a clean replacement for `rn-file-toolkit`, not a
backward-compatible rewrite.

## Installation

```bash
bun add react-native-nitro-filetoolkit react-native-nitro-modules
```

This is a native module, so Expo apps must use a development build. It cannot
run in Expo Go.

## Filesystem API

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

const info = await files.stat(report)
const contents = await files.readText({
  source: report,
  encoding: 'utf-8',
  maxByteCount: 1_048_576n,
})
```

The current milestone implements managed locations, URI validation, metadata,
bounded text reads, atomic writes, streaming readers and writers, directory
listing, copy/move/remove, hashing, disk-space reporting, and managed-directory
cleanup on iOS and Android.

Byte counts and offsets use Nitro's `UInt64`, represented as `bigint` in
TypeScript. Operations use explicit policies for collisions, missing files,
write mode, and atomicity instead of ambiguous booleans or overloaded strings.

## Architecture

Only `FileToolkitFactory` is registered eagerly. Domain objects are created or
opened on demand:

- `getFileSystem()` returns a cached, lazily created filesystem.
- `openTransferManager()` resolves the cached, lazily created transfer service.
- `getArchiveManager()` and `getContentManager()` return lazy domain services.
- `openCookieStore()` creates an explicitly scoped cookie store.

The filesystem is implemented. Transfer, archive, content, and cookie APIs are
currently typed domain boundaries for subsequent milestones; they should not be
treated as feature-complete yet.

See the [approved design](docs/superpowers/specs/2026-09-02-nitro-filetoolkit-design.md),
[native implementation plan](docs/superpowers/plans/2026-09-02-native-filesystem.md),
and [upstream analysis](docs/research/rn-file-toolkit-nitro-analysis.md).

## Repository development

```bash
bun install
bun run specs
bun run test
bun run typecheck
bun run build

cd apps/example
bun run ios
# or
bun run android
```

The example uses Expo SDK 57, Expo Router with typed routes, React Native 0.86,
and an Expo development client. Native folders are generated with Expo
prebuild and intentionally stay out of version control.

## Platform support

- iOS: Swift
- Android: Kotlin
- React Native New Architecture through Nitro Modules

This repository is pre-release and its native behavior is being delivered in
independently testable milestones.
