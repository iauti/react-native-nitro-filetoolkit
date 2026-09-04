# Changelog

All notable changes to this project are documented in this file. The project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Managed root locations and strict canonical local file URIs.
- Read-only `FileSource` inspection for local files and Android content
  providers.
- Bounded, staged source imports with explicit collision and atomicity policy.
- Expo Document Picker import and cleanup example.

### Changed

- `FileLocation` now carries explicit managed/URI provenance.
- Android `documents` maps directly to `Context.filesDir`.

## [0.1.0] - 2026-09-04

### Added

- Type-safe Nitro filesystem for iOS and Android.
- Managed app directories and validated absolute file URIs.
- Metadata and bounded, paginated directory listings.
- Bounded UTF-8/UTF-16 text reads and explicit write policies.
- Streaming binary readers and staged writers with commit/abort lifecycles.
- Directory creation, copy, move, remove, hashing, disk-space reporting, and
  managed-directory cleanup.
- Expo Router example application and native Harness behavior suite.

### Notes

- This is a new API and is not backward compatible with `rn-file-toolkit`.
- Transfer, archive, content integration, cookie stores, and React adapters are
  roadmap items and are not part of `0.1.0`.

[Unreleased]: https://github.com/iauti/react-native-nitro-filetoolkit/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/iauti/react-native-nitro-filetoolkit/releases/tag/v0.1.0
