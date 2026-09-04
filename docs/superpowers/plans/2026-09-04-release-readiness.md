# Filesystem 0.1.0 Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the filesystem-only Nitro module ready to merge and ready for a controlled `0.1.0` npm/GitHub release under IAUTI Labs.

**Architecture:** Keep `FileToolkit` as the single public runtime value and reduce its lazy native factory to the implemented filesystem domain. Package metadata, documentation, validation scripts, CI, and release automation form separate release gates around the native implementation; no publish command runs during preparation.

**Tech Stack:** TypeScript 6, React Native 0.86, Expo SDK 57/Expo Router, Nitro Modules and Nitrogen 0.37.1, Swift, Kotlin, Bun, GitHub Actions, release-it 21.

---

### Task 1: Restrict the contract to the implemented filesystem

**Files:**
- Modify: `packages/react-native-nitro-filetoolkit/tests/public-api.test.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/specs/FileToolkitFactory.nitro.ts`
- Modify: `packages/react-native-nitro-filetoolkit/src/index.ts`
- Modify: `packages/react-native-nitro-filetoolkit/ios/HybridFileToolkitFactory.swift`
- Modify: `packages/react-native-nitro-filetoolkit/android/src/main/java/com/margelo/nitro/filetoolkit/HybridFileToolkitFactory.kt`
- Delete: `packages/react-native-nitro-filetoolkit/src/specs/domains/*`
- Delete: corresponding empty native domain implementations
- Regenerate: `packages/react-native-nitro-filetoolkit/nitrogen/generated/**`

- [ ] Add type assertions that `FileToolkitFactory` exposes `getFileSystem` and no unfinished services.
- [ ] Run `bun run test` and confirm it fails while unfinished exports remain.
- [ ] Remove transfer, archive, content, and cookie-store declarations and native placeholders; retain the cached lazy filesystem factory.
- [ ] Run `bun run specs` to regenerate bindings.
- [ ] Run `bun run test && bun run typecheck && bun run build` and confirm success.
- [ ] Commit as `refactor: scope public api to filesystem`.

### Task 2: Correct package identity and publication contents

**Files:**
- Create: `LICENSE`
- Create: `packages/react-native-nitro-filetoolkit/LICENSE`
- Modify: `packages/react-native-nitro-filetoolkit/package.json`
- Modify: `packages/react-native-nitro-filetoolkit/NitroFileToolkit.podspec`
- Create: `scripts/validate-package.mjs`
- Modify: `package.json`

- [ ] Add a package-validation script that asserts the archive contains `LICENSE`, `README.md`, `lib/index.js`, `lib/index.d.ts`, `nitro.json`, the podspec, native sources, and generated iOS/Android bindings, and rejects internal docs/tests/configuration.
- [ ] Run the validator and confirm it fails because the license and validation command do not exist.
- [ ] Add the MIT license using IAUTI Labs copyright ownership.
- [ ] Set author and repository fields to IAUTI Labs and `iauti/react-native-nitro-filetoolkit`; add `exports`, `sideEffects`, supported engine metadata, `publishConfig.access`, and a `prepack` safety gate.
- [ ] Point the podspec source at the IAUTI repository tag.
- [ ] Run build plus `npm pack --dry-run --json` through the validator and confirm success.
- [ ] Commit as `chore: harden package publishing`.

### Task 3: Write self-contained user documentation

**Files:**
- Rewrite: `README.md`
- Rewrite: `packages/react-native-nitro-filetoolkit/README.md`
- Create: `docs/API.md`
- Create: `docs/TROUBLESHOOTING.md`
- Update: `apps/example/README.md`

- [ ] Document npm, Bun, and Expo installation, development-build requirements, iOS pod installation, and Android autolinking.
- [ ] Add tested quick starts for text I/O, metadata/listing, copy/move/remove, hashing, disk space, cleanup, streaming reader, and streaming writer.
- [ ] Document every public type and method, `UInt64`/`bigint`, URI validation, collision/atomicity/missing policies, reader/writer ownership, and platform limitations.
- [ ] Correct the example README so it describes the current single-stack four-example playground and Harness suite.
- [ ] Check all repository links and copy code examples into a temporary TypeScript fixture for `tsc --noEmit` validation.
- [ ] Commit as `docs: publish filesystem guides`.

### Task 4: Add project governance and release history

**Files:**
- Create: `CHANGELOG.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `docs/RELEASING.md`

- [ ] Add an Unreleased/0.1.0 changelog describing the filesystem feature boundary.
- [ ] Document setup, generated-code rules, test commands, native verification, contribution scope, and security reporting without inventing private contact details.
- [ ] Document npm/GitHub authentication, clean-tree checks, dry-run, tag format, verification, and rollback guidance.
- [ ] Verify every documented command exists in `package.json`.
- [ ] Commit as `docs: add project and release policies`.

### Task 5: Add reproducible CI and release automation

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.release-it.json`
- Create: `packages/react-native-nitro-filetoolkit/.release-it.json`
- Create: `scripts/release.sh`
- Modify: `package.json`
- Modify: `bun.lock`

- [ ] Add a root `check:ci` script that runs specs with a clean-tree comparison, tests, typecheck, lint, build, Expo structure/type checks, and package validation.
- [ ] Run `bun run check:ci` and confirm failure before the missing scripts/configuration are implemented.
- [ ] Add a Bun-based GitHub Actions workflow using a frozen lockfile and the same `check:ci` command.
- [ ] Add release-it 21 and configure package-level npm publication plus root-level versioning, changelog, tag, push, and GitHub release ownership.
- [ ] Add `bun release --dry-run` documentation and ensure preparation never invokes a real publish.
- [ ] Run `bun install`, `bun run check:ci`, and `bun run release --dry-run --no-git.push --no-github.release --no-npm.publish`.
- [ ] Commit as `ci: add release gates`.

### Task 6: Remove internal documents and perform final verification

**Files:**
- Delete: `docs/research/**`
- Delete: `docs/superpowers/**`

- [ ] Remove all research, design, and implementation-plan documents from the final tree.
- [ ] Run `git grep` to confirm public docs contain no links into the removed directories.
- [ ] Run `bun run check:ci`.
- [ ] Run Expo Doctor and an iOS production export from `apps/example`.
- [ ] Run the installed iOS Harness suite and record the result in the handoff.
- [ ] Inspect `npm pack --dry-run --json` and confirm internal docs, tests, and workspace files are absent.
- [ ] Review `git diff --check`, branch status, commit history, and diff against `main`.
- [ ] Commit as `chore: finalize initial release`.
