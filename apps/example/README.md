# Nitro File Toolkit Expo example

An Expo SDK 57 development-build app using Expo Router, typed routes, React
Native 0.86, and the workspace Nitro module.

From the repository root:

```bash
bun install
bun run specs

cd apps/example
bun run ios
# or
bun run android
```

After the native app is installed, `bun run start` starts Metro for the existing
development build. Expo Go is not supported because the toolkit contains custom
Swift and Kotlin code.

The home route performs a native round trip: atomic UTF-8 write, bounded read,
metadata lookup, and SHA-256 hashing. The Explore route is retained to exercise
Expo Router navigation.

The project uses Expo Continuous Native Generation. The `ios` and `android`
directories can be regenerated with:

```bash
bunx expo prebuild --clean
```

Run static checks with:

```bash
bun run lint
bun run typecheck
bunx expo-doctor
```

`bun run harness -- --harnessRunner ios` and
`bun run harness -- --harnessRunner android` run the native behavior suite when
the corresponding simulator or emulator build is installed.
