#!/usr/bin/env bash

set -euo pipefail

bun run --cwd packages/react-native-nitro-filetoolkit release "$@"
bun run release-it "$@"
