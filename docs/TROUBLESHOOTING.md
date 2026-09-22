# Troubleshooting

[Documentation](README.md) · [Quick start](../README.md) · [API](API.md)

## The native module cannot be found

Symptoms include `HybridObject ... was not found`, autolinking errors, or a
failure when importing the package outside a native runtime.

1. Confirm both packages are installed:

   ```bash
   npm install react-native-nitro-filetoolkit react-native-nitro-modules@0.37.1
   ```

2. Rebuild the native application after installation. Reloading JavaScript is
   not sufficient for a new native module.
3. On bare iOS projects, run `pod install` in `ios`.
4. On Expo projects, use `npx expo prebuild` and `npx expo run:ios` or
   `npx expo run:android`. Expo Go cannot load this package.
5. Ensure React Native's New Architecture is enabled.

## Metro resolves the wrong package entry

Clear Metro after changing workspace links or package versions:

```bash
npx expo start --clear
```

In monorepos, keep the library as a workspace dependency and allow Expo's Metro
configuration to discover the workspace root. Avoid hard-coded
`./node_modules/...` entry paths; the Expo Router entry is `expo-router/entry`.

## A managed path is rejected

`location()` accepts a portable relative path such as `reports/2026.txt`. It
rejects leading slashes, backslashes, empty path segments, `.` or `..`, and NUL
bytes. Use `fromUri()` for an existing absolute `file://` URI.

## A picker or shared URI is rejected

Do not pass Android `content://` values to `fromUri()` or hand-author a
`FileLocation`. Use `sourceFromUri()`, optionally call `inspectSource()`, then
copy the data into app-owned storage with `importFile()`. iOS document pickers
must provide an accessible `file://` URL; use `copyToCacheDirectory: true` with
Expo Document Picker.

Android URI access lasts only as long as the permission granted to the app.
This package does not persist or renew provider grants, so import promptly.

## `readText()` reports a resource limit

The file is larger than `maxByteCount`, or the value is larger than the
platform can address. Increase the bound only for a file you expect to fit in
memory. For large or untrusted data, use `openReader()` and process bounded
chunks.

## A write, copy, or move says the destination exists

Choose the intended policy explicitly:

- Use `mode: 'replace'` for text or streaming writers.
- Use `collision: 'replace'` for copy/move.
- Keep `create-new` or `collision: 'fail'` when replacing data would be unsafe.

## An atomic operation is unavailable

`atomicity: 'required'` promises failure instead of a non-atomic fallback. This
can occur when moving across volumes or when the platform cannot replace the
destination atomically. Use `preferred` only if a non-atomic fallback matches your
application's requirements: a failed fallback can leave the old destination
removed. `required` does not make text append atomic; see [policies](CONCEPTS.md#write-policies).

## A reader or writer is closed

Readers cannot be used after `close()`. Writers cannot be used after
`commit()`, `abort()`, or `close()`. Create a new instance for another operation
and keep cleanup in a `finally` block.

## TypeScript rejects `1024n`, or JSON serialization fails

Byte counts and offsets require `bigint` (for example, `1024n`). Use a TypeScript
target of ES2020 or newer and a React Native runtime supporting BigInt. Do not
change examples to ordinary numbers to silence the error. For logging or JSON,
convert counts to strings with `.toString()`; `JSON.stringify()` cannot serialize
raw `bigint` values. Timestamps are `Date` values when present.

## Files do not appear in the device's Downloads app

The `downloads` root is private app-owned storage. Public Downloads, sharing,
Photos, and MediaStore need a separate integration. See [alternatives](ALTERNATIVES.md).

## A streaming write did not create the destination

`write()` and `flush()` only affect staging. Await `commit()` to install the
result. On a failed write or commit, call `abort()` before closing. Use the
[streaming recipe](RECIPES.md#stream-a-binary-file) so cleanup also covers failure
to open a writer. Staging and streaming append need extra disk space.

## Tests fail when importing the package in Node or Jest

The module creates a Nitro factory when imported. Node/Jest has no native
runtime, and this package does not ship a filesystem mock. Mock your app's
filesystem adapter in unit tests; run native behavior checks in the example's
[Harness setup](../apps/example/README.md#checks).

## Still blocked

Create a minimal reproduction with the platform, React Native version, Nitro
Modules version, package version, and complete native error. File an issue at
[github.com/iauti/react-native-nitro-filetoolkit/issues](https://github.com/iauti/react-native-nitro-filetoolkit/issues).
