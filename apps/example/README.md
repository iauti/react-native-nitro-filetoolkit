# Nitro File Toolkit example app

[Documentation](../../docs/README.md) · [Contributing](../../CONTRIBUTING.md)

An Expo SDK 57 / React Native 0.86.3 development-build app using Expo Router
and the local workspace library. Use it to try the API without publishing or
installing the package from npm.

## Prerequisites

- Bun 1.3.3 and an installed iOS or Android React Native build environment.
- For iOS: macOS, Xcode, CocoaPods, and a simulator/device.
- For Android: Android Studio, the required SDK/JDK, and an emulator/device.

Expo Go cannot load this native module. The web route only explains native
setup; it does not run filesystem operations.

## First run

From the repository root:

```bash
bun install --frozen-lockfile
bun run specs
bun run --cwd apps/example ios
# Or: bun run --cwd apps/example android
```

The platform command generates native projects when absent, builds the app,
and launches it. Keep Metro running and open the development build. After
installation, restart Metro without rebuilding with:

```bash
bun run --cwd apps/example start
```

Rebuild after changing Swift/Kotlin code, Nitro bindings, or native dependencies.
JavaScript changes can use normal Metro reloads.

## Try the playground

The home screen contains four filesystem workflows plus an external-document
picker. Each action displays its result or native error in the app.

| Action | Expected result |
| --- | --- |
| Text round-trip | Write and read the same UTF-8 text |
| Metadata and listing | Create files, inspect metadata, and list entries |
| Copy/move/remove | Preserve the file hash while copying and moving |
| Disk-space cleanup | Report capacity and remove only the example workspace |
| Import an external document | Pick a file, display imported URI/size, then remove the import |

The picker uses an accessible cache copy on iOS and exercises provider URIs on
Android where available. Canceling should leave the app usable. Provider size
may be unknown. The imported file remains until you select **Remove import**.

See [workflow implementations](src/examples/file-system-examples.ts) and the
[picker component](src/components/external-source-card.tsx) for complete examples.

## Checks

From the repository root:

```bash
bun run --cwd apps/example verify:structure
bun run --cwd apps/example typecheck
bun run --cwd apps/example lint
```

Run Expo's environment diagnostics from the example directory:

```bash
cd apps/example
bunx expo-doctor
```

With the corresponding native test environment available, run Harness from the
repository root:

```bash
bun run --cwd apps/example harness -- --harnessRunner ios
# Or: bun run --cwd apps/example harness -- --harnessRunner android
```

Harness covers path validation, source inspection/import, text and binary I/O,
and the playground workflows. Real provider permissions still need manual
picker checks on both platforms.

## Regenerate native projects

The app uses Expo Continuous Native Generation; generated `ios`/`android`
directories are not tracked. From `apps/example`, run `bunx expo prebuild` when
needed. `bunx expo prebuild --clean` deletes and regenerates native projects;
preserve any local native edits before choosing that option.

For autolinking, URI, or runtime failures, see [Troubleshooting](../../docs/TROUBLESHOOTING.md).
