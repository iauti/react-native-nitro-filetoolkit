# Native Filesystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and device-test the lazy native factory and filesystem contract on iOS and Android.

**Architecture:** A default-constructible root memoizes lightweight domain HybridObjects. Each filesystem implementation delegates URI/root containment to a focused resolver and performs I/O on one owned background execution context. File handles own their native resource and closing a handle is idempotent.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86.3, React Native Harness 1.4.1, Swift/Foundation, Kotlin/Android storage APIs, and Nitro 0.37.1.

---

### Task 1: Create the real-device test application

**Files:**
- Generate: `apps/example/**`
- Create: `apps/example/rn-harness.config.mjs`
- Create: `apps/example/jest.harness.config.mjs`
- Create: `apps/example/src/file-system.harness.ts`
- Modify: `apps/example/package.json`

- [x] Generate `apps/example` with the latest official Expo SDK 57 Router template and add `react-native-nitro-filetoolkit` as `workspace:*`.
- [x] Install `react-native-harness`, `@react-native-harness/platform-apple`, and `@react-native-harness/platform-android` at exactly `1.4.1`.
- [x] Configure iOS simulator and Android API 36 emulator runners against the generated bundle identifier.
- [x] Write harness tests proving lazy factory identity, contained managed locations, traversal rejection, bounded text read/write, metadata, copy/move/remove, listing, hashing, reader seeking, and writer commit.
- [x] Validate the Router app with Expo Doctor, native/static bundles, and the Android application build.

### Task 2: Implement native root factories

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridFileToolkitFactory.swift`
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridArchiveManager.swift`
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridContentManager.swift`
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridTransferManager.swift`
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridCookieStore.swift`
- Create: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileToolkitFactory.kt`
- Create matching focused Kotlin domain implementation files.

- [x] Implement the exact generated factory signatures with Swift/Kotlin final classes.
- [x] Memoize one filesystem, archive, content, and transfer object per root; do not initialize filesystem roots or Android context during root construction.
- [x] Create cookie store handles from explicit options and resolve currently empty transfer/cookie Promises immediately.
- [x] Verify both native application targets autolink and compile `FileToolkitFactory`.

### Task 3: Implement safe location resolution

**Files:**
- Create: `packages/react-native-nitro-filetoolkit/ios/FileSystem/FileLocationResolver.swift`
- Create: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/filesystem/FileLocationResolver.kt`
- Create: `packages/react-native-nitro-filetoolkit/ios/Hybrid Objects/HybridFileSystem.swift`
- Create: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileSystem.kt`

- [x] Map every managed directory to an app-owned platform root lazily.
- [x] Reject empty, absolute, backslash, NUL, `.`, `..`, and empty path segments with `[file-toolkit/invalid-location]`.
- [x] Resolve and standardize the candidate URL/path, then prove it remains below the standardized root.
- [x] Accept validated local `file:` URIs and reject HTTP(S); reserve Android `content:` operations for the content-domain milestone.
- [ ] Run the location harness tests and verify GREEN.

### Task 4: Implement filesystem value operations

**Files:**
- Create focused platform files for metadata conversion, text encoding, atomic writes, directory paging, hashing, disk-space reporting, and managed-directory clearing.
- Modify: both `HybridFileSystem` implementations.

- [x] Implement `stat`, `list`, `readText`, `writeText`, `createDirectory`, `copy`, `move`, `remove`, `hash`, `getDiskSpace`, and `clearManagedDirectory` using the exact generated signatures.
- [x] Run every operation on a native background execution context.
- [x] Enforce read bounds before decoding and treat collision, missing, recursive, symlink, and atomicity policies explicitly.
- [x] Stage atomic writes and copies before publishing; preserve sources and existing destinations when required publication fails.
- [x] Prefix user-reachable failures with stable `[file-toolkit/<code>]` codes.
- [ ] Run the value-operation harness tests and verify GREEN on both platforms.

### Task 5: Implement bounded file handles

**Files:**
- Create: iOS `HybridFileReader.swift` and `HybridFileWriter.swift` plus one focused state owner each.
- Create: Android `HybridFileReader.kt` and `HybridFileWriter.kt` plus one focused state owner each.

- [x] Open resources asynchronously and return fully initialized handles.
- [x] Serialize read/write/seek/flush/commit/abort operations on one owner context.
- [x] Copy retained JS buffers before asynchronous writing.
- [x] Keep cached position reads cheap, make close idempotent, and reject operations after close.
- [ ] Implement `memorySize` for retained native buffers/resources.
- [ ] Run reader/writer harness tests and verify GREEN on both platforms.

### Task 6: Verify the milestone

- [x] Run root lint, test, typecheck, build, package dry-run, and Nitrogen generation.
- [x] Build the Android Expo application and the iOS Nitro pod target.
- [ ] Run the complete React Native Harness suite on both platforms.
- [x] Search native sources for blocking calls, placeholder traps, and unsafe replacement behavior.
- [x] Commit the verified milestone as `feat: implement native filesystem foundation`.
