# Releasing

Releases are versioned, tagged, published to npm, and mirrored to GitHub with
one command from the repository root.

## Prerequisites

- Write access to `iauti/react-native-nitro-filetoolkit`.
- npm publish access for `react-native-nitro-filetoolkit`.
- An authenticated npm session (`npm whoami`).
- A GitHub token available to release-it as `GITHUB_TOKEN`, or an authenticated
  GitHub CLI session supported by the local release environment.
- A clean checkout of the latest default branch with all tags fetched.
- Bun 1.3.3 and Node.js 22.21 or newer for release-it 21.

## Before releasing

1. Move relevant entries from `Unreleased` in `CHANGELOG.md` into the intended
   version section if the conventional changelog output needs editorial notes.
2. Confirm the public README and API guide match the exported TypeScript.
3. Run the complete release gate:

   ```bash
   bun install --frozen-lockfile
   bun run check:ci
   ```

4. Run native Harness checks on iOS and Android when the release changes native
   behavior.
5. Inspect the package without publishing:

   ```bash
   bun run package:check
   npm --cache /tmp/nitro-filetoolkit-npm-cache pack --dry-run
   ```

## Dry run

Preview the version, changelog, npm publication, commit, tag, and GitHub release:

```bash
bun release --dry-run
```

The dry run must report the expected package version and `v<version>` tag. Read
the generated changelog before continuing.

## Release

```bash
bun release
```

The package release step updates and publishes the nested npm package. The root
release step updates the workspace version, changelog, lockfile, release commit,
tag, push, and GitHub release. Confirm every interactive prompt before allowing
publication.

## Verify

After release:

```bash
npm view react-native-nitro-filetoolkit version
npm view react-native-nitro-filetoolkit dist-tags
git show v0.1.0 --stat
```

Install the exact published version into a fresh React Native or Expo
development-build project before announcing it publicly.

## Failed releases

Do not overwrite a published npm version. Fix the cause and publish a new patch
version. If npm publication did not occur, remove only a local/unpushed release
tag after verifying its exact target. If the tag or GitHub release was already
pushed, preserve history and publish a corrective patch instead.
