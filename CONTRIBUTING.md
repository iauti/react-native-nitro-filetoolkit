# Contributing

Thanks for improving React Native Nitro File Toolkit. Keep changes focused,
typed, and consistent across iOS and Android.

## Set up the repository

Requirements:

- Bun 1.3.3
- A React Native development environment for the platform being changed
- Xcode for iOS work or Android Studio/JDK for Android work

```bash
git clone https://github.com/iauti/react-native-nitro-filetoolkit.git
cd react-native-nitro-filetoolkit
bun install --frozen-lockfile
bun run check:ci
```

## Development rules

- Treat `.nitro.ts` files as the public native contract.
- Run `bun run specs` after changing a Nitro spec and commit all generated
  `nitrogen/` changes.
- Keep `src/index.ts` as an export-only package entry point.
- Use option objects and explicit policies for fallible operations.
- Keep Swift and Kotlin behavior equivalent unless a documented platform
  capability makes that impossible.
- Do not add roadmap APIs as empty interfaces or no-op native objects.
- Add a type test and native Harness coverage for observable behavior.

## Checks

```bash
bun run specs
bun run test
bun run typecheck
bun run lint
bun run build
bun run package:check
```

Run the example structure and Expo checks:

```bash
bun run --cwd apps/example verify:structure
bun run --cwd apps/example typecheck
bunx expo-doctor apps/example
```

For native behavior, install the example development build and run:

```bash
bun run --cwd apps/example harness -- --harnessRunner ios
# or
bun run --cwd apps/example harness -- --harnessRunner android
```

## Pull requests

Explain the user-facing behavior, platform differences, tests, and generated
binding changes. Keep unrelated formatting or dependency updates out of the
same pull request. CI must pass before merge.

By contributing, you agree that your contribution is licensed under the
project's MIT license.
