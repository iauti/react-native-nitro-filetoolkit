# Release Readiness Design

## Goal

Prepare `react-native-nitro-filetoolkit` for review, merge, and an initial
filesystem-only `0.1.0` npm release under the `iauti` GitHub organization and
IAUTI Labs identity.

## Release boundary

The initial release contains only the implemented filesystem domain. The
transfer, archive, content, and cookie-store placeholders are removed from the
public TypeScript contract, Nitrogen configuration, and native factory because
shipping empty services makes the advertised API larger than the working
product. There is no backward-compatibility requirement.

`FileToolkit` remains the single eager JavaScript entry point. Its native
`FileToolkitFactory` lazily creates and caches the filesystem hybrid object.
Readers and writers remain explicitly opened, owned, and closed by callers.

## Public documentation

The package README is self-contained because it is the document rendered by
npm. The root README gives the same installation and quick-start path, then
links to repository documentation and the example application. Public Markdown
documentation covers the complete filesystem API, error handling and resource
ownership, development, contributing, and release operations.

Internal research and planning material under `docs/research` and
`docs/superpowers` is removed from the final branch. It is not included in the
npm package at any point.

## Package and repository metadata

Repository URLs target
`https://github.com/iauti/react-native-nitro-filetoolkit`. The author identity
is IAUTI Labs. The package includes an MIT license, modern export metadata,
explicit public files, and a publication guard that builds, validates generated
Nitrogen output, and inspects the tarball before publishing.

The CocoaPods source points to the IAUTI repository and release tag. Package
metadata describes only the implemented filesystem feature set.

## Automation

GitHub Actions validates install reproducibility, formatting/lint, TypeScript,
public API tests, Nitrogen generation drift, build output, Expo configuration,
and npm package contents. Native simulator/device runs remain documented local
release gates until dedicated GitHub runners are configured.

`release-it` performs versioning, changelog generation, a release commit and
tag, GitHub release creation, and npm publication. The workflow supports dry
runs, does not publish during preparation, and documents the required npm and
GitHub authentication.

## Acceptance criteria

- Only implemented filesystem APIs are exported.
- Root and npm READMEs contain tested installation and usage examples.
- Public API, troubleshooting, contribution, and release documentation exists.
- Internal research and planning documents are absent from the final tree.
- License, changelog, package metadata, podspec, and repository identity agree.
- CI and local release checks are reproducible.
- The generated npm tarball contains every required JS/native/Nitrogen file and
  no internal research material.
- Existing TypeScript, lint, build, Expo, and native harness checks continue to
  pass.
