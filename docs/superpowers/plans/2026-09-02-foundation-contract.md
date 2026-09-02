# Foundation Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Create the Bun monorepo, pin Nitro 0.37.1, define the first generated public contract, and prove its exported TypeScript surface and Nitrogen code generation.

**Architecture:** The root workspace contains one publishable package and leaves room for a real example app. The package autolinks only `FileToolkitFactory`; its lazy factory returns focused filesystem, transfer, archive, content, and cookie HybridObjects. This milestone fully specifies the factory and filesystem foundation while reserving the other domain interfaces as focused HybridObjects for subsequent behavior milestones.

**Tech Stack:** Bun workspaces, TypeScript 6, React Native 0.85, `react-native-nitro-modules` 0.37.1, Nitrogen 0.37.1, and a dedicated TypeScript contract-test project.

---

## File map

- `package.json`: private Bun workspace and repository-level commands.
- `README.md`: project value proposition, installation, and minimal API example.
- `packages/react-native-nitro-filetoolkit/*`: current Nitrogen package template with pinned metadata.
- `packages/react-native-nitro-filetoolkit/src/FileToolkit.ts`: sole runtime HybridObject creation.
- `packages/react-native-nitro-filetoolkit/src/specs/FileToolkitFactory.nitro.ts`: autolinked lazy factory.
- `packages/react-native-nitro-filetoolkit/src/specs/FileSystem.nitro.ts`: filesystem behavior.
- `packages/react-native-nitro-filetoolkit/src/specs/FileReader.nitro.ts`: bounded streaming reader lifecycle.
- `packages/react-native-nitro-filetoolkit/src/specs/FileWriter.nitro.ts`: bounded streaming writer lifecycle.
- `packages/react-native-nitro-filetoolkit/src/specs/domains/*.nitro.ts`: focused factory return types for later milestones.
- `packages/react-native-nitro-filetoolkit/src/types/*.ts`: named codegen-compatible value types.
- `packages/react-native-nitro-filetoolkit/src/index.ts`: package export barrel only.
- `packages/react-native-nitro-filetoolkit/tests/public-api.test.ts`: compile-time public-contract assertions.
- `packages/react-native-nitro-filetoolkit/tests/tsconfig.json`: isolated strict contract-test compilation.
- `packages/react-native-nitro-filetoolkit/nitrogen/`: committed generated bindings.

### Task 1: Scaffold and pin the workspace

**Files:**
- Create: `package.json`
- Create: `README.md`
- Generate: `packages/react-native-nitro-filetoolkit/**`
- Modify: `packages/react-native-nitro-filetoolkit/package.json`
- Modify: `packages/react-native-nitro-filetoolkit/nitro.json`

- [x] **Step 1: Generate the current template**

Run:

```bash
mkdir -p packages
bunx nitrogen@0.37.1 init react-native-nitro-filetoolkit --path packages
```

Expected: Nitrogen creates `packages/react-native-nitro-filetoolkit` and reports success.

- [x] **Step 2: Create the root workspace**

Create `package.json`:

```json
{
  "name": "react-native-nitro-filetoolkit-root",
  "private": true,
  "packageManager": "bun@1.3.3",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "build": "bun run --cwd packages/react-native-nitro-filetoolkit typescript",
    "specs": "bun run --cwd packages/react-native-nitro-filetoolkit specs",
    "test": "bun run --cwd packages/react-native-nitro-filetoolkit test",
    "typecheck": "bun run --cwd packages/react-native-nitro-filetoolkit typecheck"
  }
}
```

- [x] **Step 3: Pin package metadata**

Set both `nitrogen` and `react-native-nitro-modules` dev dependencies to `0.37.1`; set the Nitro peer range to `>=0.37.1 <0.38.0`; add `"test": "tsc -p tests/tsconfig.json --noEmit"`; and replace template repository metadata with this project's repository, description, keywords, and homepage.

Set `nitro.json` namespaces to `nitro.filetoolkit`, the iOS module name to `NitroFileToolkit`, the Android library name to `NitroFileToolkit`, and autolink only `FileToolkitFactory` to `HybridFileToolkitFactory` on Swift and Kotlin.

- [x] **Step 4: Install reproducibly**

Run:

```bash
bun install
```

Expected: `bun.lock` is created and all dependencies resolve without wildcard Nitro versions.

- [x] **Step 5: Verify dependency pins**

Run:

```bash
rg -n '"(nitrogen|react-native-nitro-modules)"' packages/react-native-nitro-filetoolkit/package.json
```

Expected: no `"*"` version remains for Nitro or Nitrogen.

### Task 2: Drive the package export from a failing contract test

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/tests/public-api.test.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/FileToolkit.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/index.ts`

- [x] **Step 1: Write the failing test**

Create `tests/public-api.test.ts`:

```ts
import type {
  FileLocation,
  FileSystem,
  FileToolkitFactory,
} from '../src/index'

const location: FileLocation = {
  uri: 'file:///documents/reports/annual.pdf',
}
const factory = null as FileToolkitFactory | null
const fileSystem = null as FileSystem | null
const fromUri = null as FileSystem['fromUri'] | null

void location
void factory
void fileSystem
void fromUri
```

- [x] **Step 2: Verify RED**

Run:

```bash
bun run --cwd packages/react-native-nitro-filetoolkit test
```

Expected: FAIL because the public types are not exported.

- [x] **Step 3: Add the runtime root and barrel**

Create `src/FileToolkit.ts`:

```ts
import { NitroModules } from 'react-native-nitro-modules'
import type { FileToolkitFactory } from './specs/FileToolkitFactory.nitro'

export const FileToolkit =
  NitroModules.createHybridObject<FileToolkitFactory>(
    'FileToolkitFactory',
  )
```

Update `src/index.ts` to export `FileToolkit` and every public spec/value type directly. It must remain an export barrel with no data normalization or business logic.

- [x] **Step 4: Keep RED until the complete type contract exists**

Run the same test command.

Expected: FAIL on the first missing type export. This proves the test observes the intended package surface.

### Task 3: Define codegen-safe shared and filesystem types

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/src/types/FileLocation.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/types/FileInfo.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/types/FileOptions.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/types/ListenerSubscription.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/FileReader.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/FileWriter.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/FileSystem.nitro.ts`

- [x] **Step 1: Add location and metadata types**

Define `ManagedDirectory` and canonical `FileLocation`. Managed and external locations are created by separate `FileSystem` methods because Nitrogen 0.37.1 cannot represent single string-literal discriminants inside value structs. Define `FileInfo` with a generated `FileKind` enum and kind-specific optional metadata. Use Nitro's `UInt64` brand for byte counts and offsets and `Date` for timestamps.

- [x] **Step 2: Add explicit option types**

Define named options for list, text read/write, writer creation, directory creation, copy, move, remove, hash, disk space, and managed-directory clearing. Defaults that affect mutation safety must be required in the Nitro input type:

```ts
export type CollisionPolicy = 'fail' | 'replace'
export type Atomicity = 'required' | 'preferred' | 'none'
export type WriteMode = 'create-new' | 'replace' | 'append'
export type HashAlgorithm = 'md5' | 'sha-1' | 'sha-256' | 'sha-512'
```

No option type may use `Record`, `object`, `Object`, `unknown`, or `any`.

- [x] **Step 3: Add bounded resource specs**

Define `FileReader` with cached `location`, cached `position`, `read(maxByteCount)`, `seek(offset)`, and idempotent `close()`. Define `FileWriter` with cached destination/position, `write(ArrayBuffer)`, `flush()`, `commit()`, `abort()`, and idempotent `close()`.

- [x] **Step 4: Add the filesystem spec**

Define the `FileSystem` interface exactly from the approved design. Keep location construction synchronous and every I/O operation Promise-based.

- [x] **Step 5: Export the types and verify GREEN**

Run:

```bash
bun run --cwd packages/react-native-nitro-filetoolkit test
bun run --cwd packages/react-native-nitro-filetoolkit typecheck
```

Expected: the public API test and TypeScript checker pass.

### Task 4: Define the lazy factory boundary

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/src/specs/FileToolkitFactory.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/domains/TransferManager.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/domains/ArchiveManager.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/domains/ContentManager.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/specs/domains/CookieStore.nitro.ts`
- Create: `packages/react-native-nitro-filetoolkit/src/types/CookieStoreOptions.ts`

- [x] **Step 1: Add focused domain boundaries**

Create empty-but-valid HybridObject contracts for the later domain milestones so Nitrogen generates their return boundaries without prematurely inventing behavior:

```ts
export interface ArchiveManager
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {}
```

`CookieStoreOptions.kind` is `'transfer' | 'web'` and the returned `CookieStore` exposes that generated enum value.

- [x] **Step 2: Add the root factory**

Define:

```ts
export interface FileToolkitFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getFileSystem(): FileSystem
  openTransferManager(): Promise<TransferManager>
  getArchiveManager(): ArchiveManager
  getContentManager(): ContentManager
  openCookieStore(options: CookieStoreOptions): Promise<CookieStore>
}
```

- [x] **Step 3: Verify only the root is autolinked**

Run:

```bash
rg -n 'autolinking|FileToolkitFactory|FileSystem|TransferManager' packages/react-native-nitro-filetoolkit/nitro.json
```

Expected: only `FileToolkitFactory` appears under `autolinking`.

### Task 5: Generate and validate native bindings

**Files:**
- Generate: `packages/react-native-nitro-filetoolkit/nitrogen/**`

- [x] **Step 1: Run TypeScript and Nitrogen**

Run:

```bash
bun run --cwd packages/react-native-nitro-filetoolkit specs
```

Expected: Nitrogen finds every `.nitro.ts` spec and generates Swift, Kotlin, and C++ bridge bindings without unsupported-type errors.

- [x] **Step 2: Inspect generated signatures**

Run:

```bash
rg -n 'Hybrid(FileToolkitFactory|FileSystem|FileReader|FileWriter)Spec' packages/react-native-nitro-filetoolkit/nitrogen/generated
```

Expected: generated Swift and Kotlin specs exist for all four foundation HybridObjects.

- [x] **Step 3: Run the complete milestone verification**

Run:

```bash
bun run test
bun run typecheck
bun run build
bun run specs
git status --short
```

Expected: all commands pass; status contains only the intended scaffold, source, generated binding, lockfile, README, and plan changes.

- [x] **Step 4: Commit the contract milestone**

```bash
git add README.md package.json bun.lock packages docs/superpowers/plans/2026-09-02-foundation-contract.md
git commit -m "feat: scaffold nitro file toolkit contract"
```

Expected: the feature branch contains a reproducible, generated public contract ready for native filesystem implementation.

## Self-review

- The plan covers repository layout, pinned Nitro tooling, the approved lazy factory, location types, bounded filesystem resources, export behavior, and generated bindings.
- Native filesystem behavior is intentionally the next independent plan because exact Swift/Kotlin method signatures are generated by this milestone and must be read before implementation.
- Transfer, archive, content, and cookie behavior remains out of this milestone; only their factory boundaries are generated.
- No placeholder instructions or loose public data types are permitted.
