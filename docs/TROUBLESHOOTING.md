# Troubleshooting

## The native module cannot be found

Symptoms include `HybridObject ... was not found`, autolinking errors, or a
screen that works on web but fails on iOS/Android.

1. Confirm both packages are installed:

   ```bash
   npm install react-native-nitro-filetoolkit react-native-nitro-modules
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
destination atomically. Use `preferred` only if a safe fallback matches your
application's durability requirements.

## A reader or writer is closed

Readers cannot be used after `close()`. Writers cannot be used after
`commit()`, `abort()`, or `close()`. Create a new instance for another operation
and keep cleanup in a `finally` block.

## Still blocked

Create a minimal reproduction with the platform, React Native version, Nitro
Modules version, package version, and complete native error. File an issue at
[github.com/iauti/react-native-nitro-filetoolkit/issues](https://github.com/iauti/react-native-nitro-filetoolkit/issues).
