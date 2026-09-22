# Alternatives

[Documentation](README.md) · [Quick start](../README.md)

Choose by the operations your app needs today. This comparison was reviewed
against upstream documentation on **2026-09-22**. It is a capability guide, not
a benchmark or a claim about another project's maintenance quality. Check each
project's version compatibility before installing.

| Library | Consider it when… | API style and scope |
| --- | --- | --- |
| Nitro File Toolkit | You want explicit local-file policies, bounded text reads, and staged binary writes in a native React Native app | Typed locations/sources, Promise-based I/O, `ArrayBuffer` chunks, `bigint` counts; iOS/Android |
| [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/) | Your app already uses Expo and you want its filesystem and transfer integration | `File`, `Directory`, and `Paths`, synchronous/asynchronous operations, file handles, streams, and download/upload workflows |
| [react-native-file-access](https://github.com/alpha0010/react-native-file-access) | You prefer functions taking path strings and also need fetch-to-file, ZIP extraction, or scoped-storage helpers | `Dirs`/`FileSystem`, text/base64 and chunk reads, metadata, hashes, external copies, and network fetch APIs |
| [react-native-blob-util](https://github.com/RonRadtke/react-native-blob-util) | Your primary need is HTTP file transfer or Android Download Manager/MediaStore integration | File and network utilities, request bodies backed by files, read/write streams, and platform integrations |

The linked upstream guides are the sources for each alternative's capabilities.

## Where this toolkit fits

The toolkit separates app-owned writable locations from read-only external
sources. Options make replacement, missing-file behavior, text limits, and
atomic installation visible at the call site. Streaming writers expose an
explicit commit/abort lifecycle.

That adds more fields than a short `writeFile(path, text)` call. Choose it when
those policies help your app; a library already meeting your requirements may
be the simpler choice. Nitro Modules is the native integration mechanism here,
not evidence of a measured speed advantage over these alternatives.

## Where it does not fit yet

Use an existing transfer/archive/media integration when you need downloads,
uploads, ZIP, sharing, Photos, or MediaStore now. The `downloads` managed root
is only a local app folder. There is no HTTP client, background task manager,
file watcher, bundled picker, or built-in Jest filesystem mock.

Moving an existing app requires reviewing behavior as well as renaming methods.
See the [migration guide](MIGRATION.md) before replacing another package.
