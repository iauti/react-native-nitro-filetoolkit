# react-native-nitro-filetoolkit

A modern, typed filesystem for React Native, implemented as Swift and Kotlin
Nitro Modules.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

const files = FileToolkit.getFileSystem()
const destination = files.location('temporary', 'example/message.txt')

await files.writeText({
  destination,
  text: 'Hello from Nitro',
  encoding: 'utf-8',
  mode: 'replace',
  atomicity: 'preferred',
  createParentDirectories: true,
})
```

Requires `react-native-nitro-modules`. Expo projects require a development
build; Expo Go cannot load custom native modules.

Full API, architecture, and development documentation lives in the repository
[README](../../README.md).
