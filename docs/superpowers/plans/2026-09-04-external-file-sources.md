# External File Sources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add capability-safe external file sources, Android `content://` inspection/import, managed root locations, and consistent local URI/root behavior.

**Architecture:** Keep writable local `FileLocation` values separate from read-only `FileSource` values using incompatible discriminants. Extend the existing lazy `FileSystem` HybridObject with source inspection/import, while keeping URI validation and source opening in focused platform resolvers and reusing staged destination installation for atomicity.

**Tech Stack:** TypeScript 6, Nitrogen 0.37.1, React Native Nitro Modules 0.37.1, Kotlin/Android `ContentResolver`, Swift/Foundation `FileManager`, Expo SDK 57 Router example, React Native Harness.

---

## File map

- Modify `packages/react-native-nitro-filetoolkit/src/types/FileLocation.ts`: add the local-location discriminant and source types.
- Modify `packages/react-native-nitro-filetoolkit/src/types/FileOptions.ts`: add `ImportFileOptions`.
- Modify `packages/react-native-nitro-filetoolkit/src/specs/FileSystem.nitro.ts`: add roots and source operations.
- Modify `packages/react-native-nitro-filetoolkit/src/index.ts`: export the new public types.
- Modify `packages/react-native-nitro-filetoolkit/tests/public-api.test.ts`: enforce source/location separation at compile time.
- Modify `packages/react-native-nitro-filetoolkit/tests/documentation-examples.test.ts`: compile the documented import workflow.
- Modify `packages/react-native-nitro-filetoolkit/android/.../FileLocationResolver.kt`: managed roots and canonical local URIs.
- Create `packages/react-native-nitro-filetoolkit/android/.../FileSourceResolver.kt`: Android source validation, metadata, and input streams.
- Modify `packages/react-native-nitro-filetoolkit/android/.../FileOperations.kt`: staged stream import helper.
- Modify `packages/react-native-nitro-filetoolkit/android/.../HybridFileSystem.kt`: expose root/source/import operations.
- Modify `packages/react-native-nitro-filetoolkit/ios/FileLocationResolver.swift`: local discriminant and roots.
- Create `packages/react-native-nitro-filetoolkit/ios/FileSourceResolver.swift`: iOS source validation and metadata.
- Modify `packages/react-native-nitro-filetoolkit/ios/FileOperations.swift`: staged source import helper.
- Modify `packages/react-native-nitro-filetoolkit/ios/HybridFileSystem.swift`: expose root/source/import operations.
- Modify `packages/react-native-nitro-filetoolkit/ios/FileMetadataMapper.swift`: construct discriminated locations.
- Regenerate `packages/react-native-nitro-filetoolkit/nitrogen/`: generated bindings for the breaking contract.
- Modify `apps/example/package.json`: add the SDK-compatible document picker.
- Modify `apps/example/src/examples/file-system-examples.ts`: managed-root and file-source examples.
- Modify `apps/example/src/examples/file-system-examples.harness.ts`: root and file-source behavior coverage.
- Modify `apps/example/src/file-system.harness.ts`: low-level contract behavior.
- Create `apps/example/src/components/external-source-card.tsx`: interactive document-picker import example.
- Modify `apps/example/src/app/index.tsx`: render the external-source card without adding tabs.
- Modify `README.md`, `docs/API.md`, `docs/TROUBLESHOOTING.md`, and package README: document the new contract and migration.

### Task 1: Define and lock the public TypeScript contract

**Files:**
- Modify: `packages/react-native-nitro-filetoolkit/tests/public-api.test.ts`
- Modify: `packages/react-native-nitro-filetoolkit/tests/documentation-examples.test.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/types/FileLocation.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/types/FileOptions.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/specs/FileSystem.nitro.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/index.ts`

- [ ] **Step 1: Write failing public-contract type tests**

Add representative values and negative assignments:

```ts
import type {
  FileLocation,
  FileSource,
  FileSystem,
  ImportFileOptions,
} from '../src/index'

export const localLocation: FileLocation = {
  kind: 'local',
  uri: 'file:///documents/report.pdf',
}

export const contentSource: FileSource = {
  kind: 'source',
  scheme: 'content',
  uri: 'content://documents/report',
}

declare const files: FileSystem

files.root('documents')
files.sourceFromUri('content://documents/report')
files.inspectSource(contentSource)

export const importOptions: ImportFileOptions = {
  source: contentSource,
  destination: localLocation,
  collision: 'fail',
  atomicity: 'preferred',
}

files.importFile(importOptions)

// @ts-expect-error a read-only source cannot be removed
files.remove({ location: contentSource, recursive: false, missing: 'fail' })
// @ts-expect-error a read-only source cannot be moved
files.move({
  source: contentSource,
  destination: localLocation,
  collision: 'fail',
  atomicity: 'preferred',
})
```

- [ ] **Step 2: Run the type test and verify failure**

Run: `bun run --cwd packages/react-native-nitro-filetoolkit test`

Expected: FAIL because `FileSource`, `ImportFileOptions`, `root`,
`sourceFromUri`, `inspectSource`, and `importFile` do not exist.

- [ ] **Step 3: Add the minimal public types and Nitro methods**

Define the contract directly in the Nitro-facing types:

```ts
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

export interface FileLocation {
  readonly kind: 'local'
  readonly uri: string
}

export type FileSourceScheme = 'file' | 'content'

export interface FileSource {
  readonly kind: 'source'
  readonly uri: string
  readonly scheme: FileSourceScheme
}

export interface SourceInfo {
  readonly source: FileSource
  readonly name?: string
  readonly byteCount?: UInt64
}
```

Add:

```ts
export interface ImportFileOptions {
  readonly source: FileSource
  readonly destination: FileLocation
  readonly collision: CollisionPolicy
  readonly atomicity: Atomicity
}
```

Extend `FileSystem`:

```ts
root(directory: ManagedDirectory): FileLocation
sourceFromUri(uri: string): FileSource
inspectSource(source: FileSource): Promise<SourceInfo | undefined>
importFile(options: ImportFileOptions): Promise<FileInfo>
```

Export `FileSource`, `FileSourceScheme`, `SourceInfo`, and
`ImportFileOptions` from `src/index.ts`.

- [ ] **Step 4: Add a compiling documentation workflow**

```ts
export async function documentedImportWorkflow(uri: string) {
  const files = FileToolkit.getFileSystem()
  const source = files.sourceFromUri(uri)
  const sourceInfo = await files.inspectSource(source)
  if (sourceInfo === undefined) throw new Error('Selected file is unavailable')

  return files.importFile({
    source,
    destination: files.location('documents', 'imports/report.bin'),
    collision: 'replace',
    atomicity: 'preferred',
  })
}
```

- [ ] **Step 5: Run the type tests**

Run: `bun run --cwd packages/react-native-nitro-filetoolkit test`

Expected: PASS, including both `@ts-expect-error` assertions.

- [ ] **Step 6: Commit the contract**

```bash
git add packages/react-native-nitro-filetoolkit/src packages/react-native-nitro-filetoolkit/tests
git commit -m "feat: define external file source API"
```

### Task 2: Regenerate Nitro bindings at the contract boundary

**Files:**
- Modify: `packages/react-native-nitro-filetoolkit/nitrogen/**`
- Modify: `packages/react-native-nitro-filetoolkit/lib/**`

- [ ] **Step 1: Run Nitrogen generation**

Run: `bun run specs`

Expected: generated Swift, Kotlin, C++, and autolinking types include
`FileSource`, `SourceInfo`, `ImportFileOptions`, `FileLocation.kind`, and the
four new `FileSystem` methods.

- [ ] **Step 2: Inspect generated signatures**

Run:

```bash
rg -n "root|sourceFromUri|inspectSource|importFile|FileSource|SourceInfo" packages/react-native-nitro-filetoolkit/nitrogen/generated
```

Expected: all new APIs appear on both generated platform specs, with optional
source metadata represented as optional values and byte counts represented as
unsigned 64-bit values.

- [ ] **Step 3: Verify generated files are deterministic**

Run: `bun run specs && git diff --exit-code -- packages/react-native-nitro-filetoolkit/nitrogen`

Expected: the second generation produces no additional diff.

- [ ] **Step 4: Commit generated bindings**

```bash
git add packages/react-native-nitro-filetoolkit/nitrogen packages/react-native-nitro-filetoolkit/lib
git commit -m "chore: regenerate external source bindings"
```

### Task 3: Implement managed roots and canonical local locations

**Files:**
- Modify: `apps/example/src/file-system.harness.ts`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/FileLocationResolver.kt`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/FileMetadataMapper.kt`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileSystem.kt`
- Modify: `packages/react-native-nitro-filetoolkit/ios/FileLocationResolver.swift`
- Modify: `packages/react-native-nitro-filetoolkit/ios/FileMetadataMapper.swift`
- Modify: `packages/react-native-nitro-filetoolkit/ios/HybridFileSystem.swift`

- [ ] **Step 1: Add failing Harness assertions for roots and URI shape**

```ts
it('returns managed roots and canonical local file URIs', () => {
  const documents = files.root('documents')
  const cache = files.root('cache')
  expect(documents.kind).toBe('local')
  expect(cache.kind).toBe('local')
  expect(documents.uri.startsWith('file:///')).toBe(true)
  expect(cache.uri.startsWith('file:///')).toBe(true)

  const child = files.location('documents', 'root-contract.txt')
  expect(child.uri.startsWith(documents.uri.replace(/\/$/, '') + '/')).toBe(true)
})
```

- [ ] **Step 2: Run Harness and verify the new test fails**

Run: `bun run --cwd apps/example harness -- --harnessRunner ios`

Expected: FAIL because `root()` and `FileLocation.kind` are unimplemented.

- [ ] **Step 3: Implement Android roots and URI normalization**

Change Documents to `context.filesDir`, return a discriminated location, and
use `android.net.Uri.fromFile`:

```kt
fun root(directory: ManagedDirectory): File = when (directory) {
  ManagedDirectory.CACHE -> context.cacheDir
  ManagedDirectory.DOCUMENTS -> context.filesDir
  ManagedDirectory.DOWNLOADS -> File(context.filesDir, "Downloads")
  ManagedDirectory.TEMPORARY -> File(context.cacheDir, "Temporary")
  ManagedDirectory.APPLICATION_SUPPORT -> File(context.filesDir, "ApplicationSupport")
}.absoluteFile

internal fun File.toLocation(): FileLocation = FileLocation(
  kind = FileLocationKind.LOCAL,
  uri = android.net.Uri.fromFile(absoluteFile).normalizeScheme().toString(),
)
```

Have `HybridFileSystem.root()` create the root when necessary and return
`resolver.root(directory).toLocation()`. Revalidate `kind == LOCAL` before
resolving every incoming location.

- [ ] **Step 4: Implement Swift roots and discriminated locations**

```swift
func root(directory: ManagedDirectory) throws -> FileLocation {
  let url = try rootURL(for: directory).standardizedFileURL
  try fileManager.createDirectory(at: url, withIntermediateDirectories: true)
  return FileLocation(kind: .local, uri: url.absoluteString)
}
```

Construct `.local` locations in `location()`, `fromUri()`, symbolic-link
metadata, and regular metadata. Revalidate the location discriminant and URI in
`url(from:)`.

- [ ] **Step 5: Run platform Harness coverage**

Run:

```bash
bun run --cwd apps/example harness -- --harnessRunner ios
bun run --cwd apps/example harness -- --harnessRunner android
```

Expected: the root/URI test passes on both platforms and all existing tests
remain green.

- [ ] **Step 6: Commit managed roots**

```bash
git add packages/react-native-nitro-filetoolkit/ios packages/react-native-nitro-filetoolkit/android apps/example/src/file-system.harness.ts
git commit -m "feat: expose canonical managed roots"
```

### Task 4: Implement source validation and inspection

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/FileSourceResolver.kt`
- Create: `packages/react-native-nitro-filetoolkit/ios/FileSourceResolver.swift`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileSystem.kt`
- Modify: `packages/react-native-nitro-filetoolkit/ios/HybridFileSystem.swift`
- Modify: `apps/example/src/file-system.harness.ts`

- [ ] **Step 1: Add failing file-source Harness tests**

```ts
it('validates and inspects a local file source', async () => {
  const location = files.location('temporary', 'file-toolkit-harness/source-info.txt')
  await files.writeText({
    destination: location,
    text: 'source',
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'preferred',
    createParentDirectories: true,
  })

  const source = files.sourceFromUri(location.uri)
  expect(source).toEqual({ kind: 'source', scheme: 'file', uri: location.uri })
  const info = await files.inspectSource(source)
  expect(info?.byteCount).toBe(6n)
  expect(info?.name).toBe('source-info.txt')
  expect(await files.inspectSource(files.sourceFromUri(
    files.location('temporary', 'file-toolkit-harness/missing.txt').uri,
  ))).toBeUndefined()
})

it('rejects unsupported source schemes', () => {
  expect(() => files.sourceFromUri('https://example.com/file')).toThrow(
    '[file-toolkit/invalid-location]',
  )
})
```

- [ ] **Step 2: Run Harness and verify failure**

Run: `bun run --cwd apps/example harness -- --harnessRunner ios`

Expected: FAIL because source methods are unimplemented.

- [ ] **Step 3: Implement Android source resolution**

Create a resolver with this boundary:

```kt
internal class FileSourceResolver(
  private val context: Context,
  private val locations: FileLocationResolver,
) {
  fun sourceFromUri(value: String): FileSource
  fun inspect(source: FileSource): SourceInfo?
  fun openInput(source: FileSource): InputStream
}
```

Rules:

- Parse with `android.net.Uri.parse` and require an absolute `file` or `content`
  scheme.
- Normalize file sources through `FileLocationResolver`.
- Return `FileSource(kind = SOURCE, scheme = FILE|CONTENT, uri = normalized)`.
- Revalidate the discriminant, declared scheme, and actual URI scheme on every
  method.
- Inspect files with `FileMetadataMapper`.
- Query content metadata with a `use`-scoped cursor over
  `OpenableColumns.DISPLAY_NAME` and `OpenableColumns.SIZE`.
- Preserve absent columns as `null`; reject negative sizes.
- Return `null` only for `FileNotFoundException` or an explicit empty provider
  result. Convert `SecurityException` and other provider failures to
  `invalid-operation`.

- [ ] **Step 4: Implement iOS source resolution**

Create the equivalent focused resolver:

```swift
final class FileSourceResolver {
  func sourceFromUri(_ value: String) throws -> FileSource
  func inspect(_ source: FileSource) throws -> SourceInfo?
  func url(from source: FileSource) throws -> URL
}
```

Only absolute file URLs are accepted. Return `.source`/`.file` discriminants,
use `FileManager` metadata for name and size, return `nil` for a missing file,
and reject forged or inconsistent structs.

- [ ] **Step 5: Wire asynchronous inspection into `HybridFileSystem`**

Use the existing owned iOS I/O queue and Android `Promise.parallel`:

```ts
sourceFromUri(uri: string): FileSource
inspectSource(source: FileSource): Promise<SourceInfo | undefined>
```

- [ ] **Step 6: Run both Harness suites**

Run the iOS and Android Harness commands from Task 3.

Expected: file-source inspection and unsupported-scheme behavior pass on both
platforms.

- [ ] **Step 7: Commit source inspection**

```bash
git add packages/react-native-nitro-filetoolkit/ios packages/react-native-nitro-filetoolkit/android apps/example/src/file-system.harness.ts
git commit -m "feat: inspect read-only file sources"
```

### Task 5: Implement staged source import

**Files:**
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/FileOperations.kt`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileSystem.kt`
- Modify: `packages/react-native-nitro-filetoolkit/ios/FileOperations.swift`
- Modify: `packages/react-native-nitro-filetoolkit/ios/HybridFileSystem.swift`
- Modify: `apps/example/src/file-system.harness.ts`

- [ ] **Step 1: Add failing import behavior tests**

Create a multi-buffer source, import it, verify the hash, exercise collisions,
and verify no staging files remain:

```ts
it('imports a source with explicit collision behavior', async () => {
  const sourceLocation = files.location('temporary', 'file-toolkit-harness/import-source.txt')
  const destination = files.location('temporary', 'file-toolkit-harness/imported.txt')
  const payload = 'source-data-'.repeat(16_384)
  await files.writeText({
    destination: sourceLocation,
    text: payload,
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'preferred',
    createParentDirectories: true,
  })
  const source = files.sourceFromUri(sourceLocation.uri)

  const imported = await files.importFile({
    source,
    destination,
    collision: 'fail',
    atomicity: 'preferred',
  })
  expect(imported.byteCount).toBe(BigInt(payload.length))
  await expect(files.importFile({
    source,
    destination,
    collision: 'fail',
    atomicity: 'preferred',
  })).rejects.toThrow('[file-toolkit/invalid-operation]')

  await files.importFile({
    source,
    destination,
    collision: 'replace',
    atomicity: 'preferred',
  })
  const page = await files.list({
    directory: files.location('temporary', 'file-toolkit-harness'),
    recursive: false,
    maxEntryCount: 100n,
  })
  expect(page.items.some(item => item.name.startsWith('.nitro-filetoolkit-'))).toBe(false)
})
```

- [ ] **Step 2: Run Harness and verify failure**

Run: `bun run --cwd apps/example harness -- --harnessRunner ios`

Expected: FAIL because `importFile()` is unimplemented.

- [ ] **Step 3: Add reusable bounded-stream copy on Android**

Add a helper that never closes caller-owned streams and synchronizes output:

```kt
fun copyInputToFile(input: InputStream, destination: File) {
  ensureParent(destination, true)
  FileOutputStream(destination).use { output ->
    input.copyTo(output, bufferSize = DEFAULT_BUFFER_SIZE)
    output.fd.sync()
  }
}
```

`HybridFileSystem.importFile()` must:

1. Revalidate source and destination.
2. Enforce collision policy.
3. Create a sibling staging file.
4. Open the source in a `use` block and copy to staging.
5. Install with `installNew` for `fail`, or `atomicReplace` for `replace`.
6. Remove staging in `finally`.
7. Return destination metadata.

- [ ] **Step 4: Add staged source copy on iOS**

For a file source, use `FileHandle` reads in bounded chunks or
`FileManager.copyItem` into the sibling staging URL. Reuse
`installNewStagingItem` and `replaceStagingItem`; always remove staging after a
failure. Do not load the complete file into `Data`.

- [ ] **Step 5: Close the collision race**

For `collision: 'fail'`, installation must use the existing link-based
install-new primitive rather than a replace primitive. Add a Harness assertion
that the original destination contents remain unchanged after the rejected
second import.

- [ ] **Step 6: Run both Harness suites**

Run the iOS and Android Harness commands.

Expected: multi-buffer import, fail/replace policies, content preservation, and
staging cleanup pass.

- [ ] **Step 7: Commit source import**

```bash
git add packages/react-native-nitro-filetoolkit/ios packages/react-native-nitro-filetoolkit/android apps/example/src/file-system.harness.ts
git commit -m "feat: import external file sources"
```

### Task 6: Add the interactive Android document-picker example

**Files:**
- Modify: `apps/example/package.json`
- Modify: `bun.lock`
- Create: `apps/example/src/components/external-source-card.tsx`
- Modify: `apps/example/src/app/index.tsx`

- [ ] **Step 1: Install the SDK-compatible picker dependency**

Run from `apps/example`: `bunx expo install expo-document-picker`

Expected: Expo selects the SDK 57-compatible version and updates `package.json`
and `bun.lock`.

- [ ] **Step 2: Implement one focused card, not a new route or tab**

The component must:

```tsx
const result = await DocumentPicker.getDocumentAsync({
  copyToCacheDirectory: Platform.OS === 'ios',
  multiple: false,
})
if (result.canceled) return

const asset = result.assets[0]
if (asset === undefined) return
const source = files.sourceFromUri(asset.uri)
const sourceInfo = await files.inspectSource(source)
if (sourceInfo === undefined) throw new Error('Selected source is unavailable')
const safeName = (asset.name || 'selected-file').replace(/[\\/\0]/g, '_')

const destination = files.location(
  'documents',
  `imports/${Date.now()}-${safeName}`,
)
const imported = await files.importFile({
  source,
  destination,
  collision: 'fail',
  atomicity: 'preferred',
})
```

Display source scheme, reported source size or `Unknown`, destination URI, and
imported size. Keep the selected destination in state and expose a cleanup
button using recursive false and missing ignore.

- [ ] **Step 3: Render the card in the existing single-screen stack**

Add `<ExternalSourceCard />` below the operation cards and above the result
console in `src/app/index.tsx`. Do not add routes, tabs, or navigation state.

- [ ] **Step 4: Verify example structure and types**

Run:

```bash
bun run --cwd apps/example verify:structure
bun run --cwd apps/example typecheck
bun run --cwd apps/example lint
```

Expected: PASS and the structure verifier still reports one Router stack with
no starter tabs.

- [ ] **Step 5: Test the picker manually on Android**

Run: `bun run --cwd apps/example android`

Select a document from the Android Files provider and verify the UI reports
`content`, imports the file, reports the final byte count, and removes it on
cleanup. Record emulator/device and Android version in the PR.

- [ ] **Step 6: Test the picker manually on iOS**

Run: `bun run --cwd apps/example ios`

Select a document and verify its copied `file:` source imports and cleans up.
Record simulator/device and iOS version in the PR.

- [ ] **Step 7: Commit the example**

```bash
git add apps/example/package.json apps/example/src bun.lock
git commit -m "feat(example): demonstrate external file import"
```

### Task 7: Document the breaking API and migration

**Files:**
- Modify: `README.md`
- Modify: `packages/react-native-nitro-filetoolkit/README.md`
- Modify: `docs/API.md`
- Modify: `docs/TROUBLESHOOTING.md`
- Modify: `packages/react-native-nitro-filetoolkit/tests/documentation-examples.test.ts`

- [ ] **Step 1: Update API documentation**

Document the exact root, location, source, inspection, and import signatures;
the capability boundary; optional source metadata; collision/atomicity rules;
and URI grant lifetime. Include this unknown-size branch:

```ts
const info = await files.inspectSource(source)
if (info === undefined) throw new Error('The selected file is unavailable')

if (info.byteCount === undefined) {
  // Import first, then use the returned local FileInfo.byteCount.
}
```

- [ ] **Step 2: Add migration guidance**

State explicitly:

- `FileLocation` now includes `kind: 'local'`.
- Hand-authored locations should be replaced with `location()`, `root()`, or
  `fromUri()`.
- Android `documents` now maps to `Context.filesDir`.
- Picker/share URIs should use `sourceFromUri()` and `importFile()`.
- `content:` grants are not persisted by the toolkit.

- [ ] **Step 3: Fix the existing contradictory source comment**

Ensure `FileLocation` documentation says file-only and `FileSource`
documentation owns the Android `content:` statement. Search with:

```bash
rg -n "content:|content://|fromUri|sourceFromUri|documents" README.md docs packages/react-native-nitro-filetoolkit/README.md packages/react-native-nitro-filetoolkit/src
```

Expected: no statement claims `fromUri()` or `FileLocation` accepts content
URIs.

- [ ] **Step 4: Compile every documentation example**

Run: `bun run test && bun run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md docs packages/react-native-nitro-filetoolkit/README.md packages/react-native-nitro-filetoolkit/tests/documentation-examples.test.ts
git commit -m "docs: explain external source imports"
```

### Task 8: Run release gates and finish the PR

**Files:**
- Modify only files required by failures attributable to this branch.

- [ ] **Step 1: Verify generated code**

Run: `bun run check:generated`

Expected: PASS with no generated diff.

- [ ] **Step 2: Run the complete repository gate**

Run: `bun run check:ci`

Expected: all package tests, community compatibility tests, typecheck, lint,
build, example checks, and package validation pass.

- [ ] **Step 3: Build Android release**

Run from `apps/example/android`:
`./gradlew --no-daemon :app:assembleRelease`

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Build iOS release for the simulator**

Run from `apps/example`:

```bash
xcodebuild -workspace ios/NitroFileToolkitExample.xcworkspace -scheme NitroFileToolkitExample -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

Expected: `** BUILD SUCCEEDED **`.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check origin/main...HEAD
git status --short
git diff --stat origin/main...HEAD
git diff origin/main...HEAD -- . ':!packages/react-native-nitro-filetoolkit/nitrogen'
```

Expected: no whitespace errors, no untracked artifacts, no secrets or absolute
personal paths, and only source/import/root-related changes.

- [ ] **Step 6: Update the draft PR template**

Mark only commands actually run as complete. Fill exact simulator/emulator OS
versions and explain that this is a breaking unreleased API change with no
client migration in scope.
