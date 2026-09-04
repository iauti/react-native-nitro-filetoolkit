#!/usr/bin/env bash

set -euo pipefail

(
  cd packages/react-native-nitro-filetoolkit
  bun release "$@"
)
bun run release-it "$@"
