# React Native Nitro File Toolkit

[![CI](https://github.com/iauti/react-native-nitro-filetoolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/iauti/react-native-nitro-filetoolkit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-native-nitro-filetoolkit.svg)](https://www.npmjs.com/package/react-native-nitro-filetoolkit)
[![MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Native filesystem APIs for React Native on **iOS and Android**, built with
[Nitro Modules](https://nitro.margelo.com/). Read and write text, process binary
files in chunks, import picker results, and manage app-owned storage with
explicit overwrite and failure policies.

This IAUTI Labs project is a successor to `rn-file-toolkit` with a new API.
It is not a drop-in replacement.

## Is this the right library?

Use it for local files when you want typed locations, bounded text reads,
`ArrayBuffer` streaming, staged writers, metadata, hashing, and directory
operations. Byte counts and offsets use `bigint`.

Downloads/uploads, ZIP archives, sharing, Photos/MediaStore integration, and
React hooks are **not implemented**. Expo Go and web are not supported.
See [alternatives](docs/ALTERNATIVES.md) if you need those features today.
There are no published comparative benchmarks in this repository.

## Install

You need React Native with the New Architecture and
`react-native-nitro-modules >=0.37.1 <0.38.0`. The repository example uses React
Native **0.86.3**, Expo **57.0.20**, and Nitro Modules **0.37.1**; this is an
integration baseline, not a claim that every other version is supported.

### Bare React Native

Run from your app directory:

```bash
npm install react-native-nitro-filetoolkit react-native-nitro-modules@0.37.1
cd ios
pod install
cd ..
```

Skip the pod commands on Android. Rebuild and launch your native app using
its usual iOS or Android build command. A Metro reload cannot install native code.

### Expo

Use a native development build:

```bash
npx expo install react-native-nitro-filetoolkit react-native-nitro-modules@0.37.1
npx expo run:ios
# Or, for Android:
npx expo run:android
```

The Expo run command generates native projects if they are absent. If your app
manages native projects manually, update those projects using your existing
workflow. Rebuild after installing or changing native dependencies.

## Write and read your first file

Put this function in a native screen or utility file and call it from a button
handler, for example `onPress={() => void saveAndReadNote().catch(console.error)}`.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function saveAndReadNote(): Promise<string> {
  const files = FileToolkit.getFileSystem()
  const note = files.location('documents', 'notes/hello.txt')

  await files.writeText({
    destination: note,
    text: 'Hello from Nitro',
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'required',
    createParentDirectories: true,
  })

  const text = await files.readText({
    source: note,
    encoding: 'utf-8',
    maxByteCount: 1_048_576n,
  })
  console.log(text) // Hello from Nitro
  return text
}
```

This creates `notes/hello.txt` in your app's documents storage. Running it again
replaces the file. `location()` builds a reference; the write creates the file
and missing parent folders. `maxByteCount` limits the encoded file size to 1 MiB.
The `n` suffix is required because this API uses `bigint`, not `number`.

`atomicity: 'required'` rejects if atomic installation is unavailable.
`'preferred'` permits a non-atomic fallback that can remove the old destination
before the new file is installed. See [write policies](docs/CONCEPTS.md#write-policies).

## Choose the next step

| I want to… | Read |
| --- | --- |
| Choose a storage folder and understand URIs | [Locations and policies](docs/CONCEPTS.md) |
| Save JSON, import a picked document, or stream binary data | [Recipes](docs/RECIPES.md) |
| Find every method, option, and return type | [API reference](docs/API.md) |
| Compare with Expo FileSystem and other packages | [Alternatives](docs/ALTERNATIVES.md) |
| Replace an existing filesystem library | [Migration guide](docs/MIGRATION.md) |
| Fix setup or runtime errors | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| Try the native playground | [Example application](apps/example/README.md) |

## What to know before using real data

- Managed roots are app-owned. `downloads` is an app folder, not the device's
  public Downloads directory.
- Use `location()` and `root()` for app files; `fromUri()` accepts absolute
  local `file://` URIs and does not grant filesystem permission.
- Picker/share results are read-only sources. Use `sourceFromUri()` followed
  by `importFile()` to obtain a local file. Android also accepts `content://` sources.
- Close readers and writers in `finally`. A writer stages data until `commit()`;
  use `abort()` after a failed write or commit.
- `stat()` returns `undefined` for a missing entry. Optional metadata, including
  byte counts, must be checked before use.

## Contributing

See [Contributing](CONTRIBUTING.md) for setup and checks,
[Releasing](docs/RELEASING.md) for publication, and [Security](SECURITY.md)
for private vulnerability reports. Start the workspace playground with:

```bash
bun install --frozen-lockfile
bun run specs
bun run --cwd apps/example ios
# Or: bun run --cwd apps/example android
```

Future work includes durable transfers, archives, sharing and media integration,
cookie stores, and React task hooks. These are roadmap items, not exported APIs.

## License

MIT © IAUTI Labs
