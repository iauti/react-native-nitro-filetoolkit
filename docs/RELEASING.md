# Releasing

Releases are versioned, tagged, published to npm, and mirrored to GitHub with
one command from the repository root.

The workspace orchestration follows Margelo's
[VisionCamera release script](https://github.com/margelo/react-native-vision-camera/blob/91bae1f08d549b50444ee16661dc4f4375cba0b6/scripts/release.sh):
packages publish sequentially before the root creates the GitHub release.

## Prerequisites

- Write access to `iauti/react-native-nitro-filetoolkit`.
- npm publish access for `react-native-nitro-filetoolkit`.
- An authenticated npm session (`npm whoami`).
- A GitHub token supplied as `GITHUB_TOKEN` (preferred), `GH_TOKEN`, or via
  an authenticated GitHub CLI session (`gh auth login`). The release script
  exports the selected token as `GITHUB_TOKEN` without printing it.
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
   (cd packages/react-native-nitro-filetoolkit && npm --cache /tmp/nitro-filetoolkit-npm-cache pack --dry-run)
   ```

   `bun run build` (also used by the release gate and package prepack) removes
   only generated `lib/` output and forces a TypeScript project rebuild. This
   prevents obsolete files or an incremental cache from producing an incomplete
   package. Inspect the nested package's tarball, not the private root package.

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

The script checks GitHub authentication, then runs `bun run check:ci` from the
root before any npm publication. It releases each package under `packages/`
sequentially and finally runs root `release-it`. All arguments are forwarded to
both package and root release commands; use the same version choice at each
interactive prompt (or an explicit version/increment argument).

The package release step updates and publishes the nested npm package; it does
not commit, tag, push, or create a GitHub release. The root release step updates
the workspace and example versions, changelog, lockfile, release commit, tag,
push, and GitHub release without publishing the private root package. The root
bumper synchronizes package metadata to that chosen version; the script adds
no separate version-bump command. Confirm every interactive prompt before
allowing publication. A failed step stops the script, but cannot roll back an
already published npm package. Authentication preflight checks token presence,
not whether the token has the necessary remote permissions.

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
