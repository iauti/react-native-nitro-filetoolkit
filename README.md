# React Native Nitro File Toolkit

A modern, type-safe native file toolkit for React Native, powered by Nitro Modules.

The library is being built around bounded filesystem I/O, durable transfers, safe archives, and honest platform integration. It intentionally does not preserve the API of `rn-file-toolkit`.

## Planned installation

```bash
bun add react-native-nitro-filetoolkit react-native-nitro-modules
```

## API direction

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

const files = FileToolkit.getFileSystem()
const report = files.location('documents', 'reports/annual.pdf')

const info = await files.stat(report)
```

See the [approved design](docs/superpowers/specs/2026-09-02-nitro-filetoolkit-design.md) and [upstream analysis](docs/research/rn-file-toolkit-nitro-analysis.md).

## Platform support

- iOS: Swift
- Android: Kotlin
- React Native New Architecture through Nitro Modules

This repository is pre-release and its native behavior is being delivered in independently testable milestones.
