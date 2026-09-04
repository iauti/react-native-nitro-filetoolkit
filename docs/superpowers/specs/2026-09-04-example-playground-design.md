# Example Filesystem Playground Design

## Goal

Replace the generated Expo starter tabs with a focused, single-screen example that demonstrates the implemented `react-native-nitro-filetoolkit` filesystem API. The screen should help a package consumer understand common workflows by running real native operations and showing their results.

## Scope

The example covers the implemented filesystem domain only. It does not present placeholder UI for transfer, archive, content, or cookie APIs that do not yet provide useful workflows.

The app retains Expo Router, but exposes a single `/` route. The generated Explore route, tab navigation, tab icons, and unrelated Expo starter components are removed.

## Screen Structure

The root route renders a scrollable filesystem playground with:

1. A compact package and runtime header.
2. Four workflow cards, each with a title, operation summary, and Run button.
3. A shared selectable result console below the cards.
4. Clear per-operation running, success, and failure feedback.

The root layout uses an Expo Router `Stack` with its header hidden. Safe-area handling remains at the screen boundary.

## Workflows

### Text round-trip

Write UTF-8 text to a managed temporary location, read it back, and report the resulting URI, byte count, and content.

### Directory listing

Create an isolated example directory and two small files, list its children, and format their names, kinds, and byte counts. The operation demonstrates directory creation and typed listing results.

### Copy, move, and hash

Write a source file, compute its SHA-256 hash, copy it, move the copy, hash the moved file, and report whether the content remained identical.

### Storage and cleanup

Read available disk-space information, remove the playground's isolated workspace, and report the cleanup result. Cleanup never targets a broad managed directory or user-selected path.

## Data and State

The native `FileSystem` hybrid object is obtained lazily through `FileToolkit.getFileSystem()` at module scope. All example locations live below `temporary/nitro-file-toolkit/examples`.

Workflow definitions are data-driven and share one execution controller. The screen stores the active workflow identifier and the latest formatted output. Only one workflow runs at a time, preventing examples from mutating the same workspace concurrently.

## Error Handling

Each workflow runs inside a shared `try/catch/finally` boundary. Errors are converted to a readable message without hiding native error details. The active button displays progress and all workflow buttons remain disabled until the current operation finishes.

The result console distinguishes ready, successful, and failed states with accessible text rather than color alone.

## Component Boundaries

- `src/app/_layout.tsx`: Router and theme boundary only.
- `src/app/index.tsx`: Workflow orchestration and screen composition.
- `src/components/example-card.tsx`: Presentational workflow action card.
- `src/components/result-console.tsx`: Presentational selectable output panel.
- `src/examples/file-system-examples.ts`: Native workflow definitions, locations, and output formatting.

These boundaries keep native operations testable and prevent the route from becoming a collection of unrelated inline callbacks.

## Removed Starter Code

Remove the Explore route, native and web tab implementations, tab icon assets, and starter-only components no longer referenced after the new screen is installed. Shared files are removed only after reference checks confirm they are unused.

## Verification

- Strict TypeScript typecheck.
- ESLint with zero new warnings.
- Package public API tests and Nitro spec generation.
- Expo SDK 57 iOS export from `expo-router/entry`.
- Existing iOS native Harness suite.
- Static reference scan confirming the removed starter route and tab components are no longer imported.

## Success Criteria

- The app opens directly to the filesystem playground with no tab bar.
- All four workflows run independently against the isolated temporary workspace.
- Results and native failures are visible and selectable.
- The example does not advertise unimplemented domains.
- Expo Router bundling and native Harness tests remain green.
