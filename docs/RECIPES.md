# Recipes

[Documentation](README.md) · [Locations and policies](CONCEPTS.md) · [API](API.md)

Complete setup in the [quick start](../README.md#install) first. Each code block
below is independent and includes its imports. Call exported functions from an
async handler and catch failures at the UI boundary. These examples require a
native app; they cannot execute in Node.js, Expo Go, or a web browser.

## Save and load JSON

This replaces an app-owned settings file. The read is bounded to 64 KiB and
validates the parsed value before returning it.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function saveAndLoadSettings(): Promise<{ theme: string }> {
  const files = FileToolkit.getFileSystem()
  const destination = files.location('application-support', 'settings.json')
  await files.writeText({
    destination,
    text: JSON.stringify({ theme: 'dark' }),
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'required',
    createParentDirectories: true,
  })
  const text = await files.readText({
    source: destination,
    encoding: 'utf-8',
    maxByteCount: 64n * 1024n,
  })
  const value: unknown = JSON.parse(text)
  if (
    typeof value !== 'object' || value === null ||
    !('theme' in value) || typeof value.theme !== 'string'
  ) {
    throw new Error('Invalid settings file')
  }
  return { theme: value.theme }
}
```

Expected result: `{ theme: 'dark' }`. This demonstrates a round trip; in an app,
separate save/load actions so loading does not overwrite existing preferences.

## Import a picked document

The toolkit does not include a picker. This example uses Expo Document Picker;
install it in an Expo app, then rebuild the native app:

```bash
npx expo install expo-document-picker
```

```ts
import * as DocumentPicker from 'expo-document-picker'
import { Platform } from 'react-native'
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function pickAndImport() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: Platform.OS === 'ios',
    multiple: false,
  })
  if (result.canceled) return undefined
  const asset = result.assets[0]
  if (asset === undefined) return undefined

  const files = FileToolkit.getFileSystem()
  const source = files.sourceFromUri(asset.uri)
  // Use an app-chosen filename instead of treating the provider name as a path.
  const destination = files.location('documents', 'imports/selected-document')
  const imported = await files.importFile({
    source,
    destination,
    collision: 'replace',
    atomicity: 'required',
  })
  console.log(imported.location.uri)
  console.log(imported.byteCount?.toString() ?? 'Unknown size')
  return imported
}
```

Cancel returns `undefined`. A successful selection replaces the previous import
and returns its metadata. For multiple retained documents, choose a unique
app-controlled name and use `collision: 'fail'`.

iOS receives an accessible cache copy; Android can import the granted provider
URI directly. The toolkit does not remove picker-created cache copies. Import
while permission is valid. Use `inspectSource(source)` if you need optional
provider metadata; it is not necessary before importing.

See [Expo Document Picker](https://docs.expo.dev/versions/latest/sdk/document-picker/)
for picker setup and cache-copy behavior, and the repository's
[interactive picker screen](../apps/example/src/components/external-source-card.tsx).

## List a directory page by page

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function printDocuments(): Promise<void> {
  const files = FileToolkit.getFileSystem()
  const directory = files.root('documents')
  let cursor: string | undefined
  do {
    const page = await files.list({
      directory,
      cursor,
      maxEntryCount: 50n,
      recursive: false,
    })
    for (const item of page.items) {
      console.log(item.name, item.kind, item.byteCount?.toString())
    }
    cursor = page.nextCursor
  } while (cursor !== undefined)
}
```

Hidden entries are excluded. Keep the same directory and recursion settings
when reusing a cursor. Pagination is not a snapshot; restart if the directory
changes, and do not depend on identical sort order across platforms.

## Stream a binary file

Use `copy()` for an ordinary copy. Use this pattern when you need to inspect or
process each binary chunk. Supply an existing source and a distinct destination.
The function returns destination metadata after commit.

```ts
import {
  FileToolkit,
  type FileLocation,
  type FileWriter,
} from 'react-native-nitro-filetoolkit'

export async function copyInChunks(
  source: FileLocation,
  destination: FileLocation,
) {
  const files = FileToolkit.getFileSystem()
  const reader = await files.openReader(source)
  let writer: FileWriter | undefined
  try {
    writer = await files.openWriter({
      destination,
      mode: 'replace',
      atomicity: 'required',
      createParentDirectories: true,
    })
    while (true) {
      const chunk = await reader.read(64n * 1024n)
      if (chunk.data.byteLength > 0) await writer.write(chunk.data)
      if (chunk.isEndOfFile) break
    }
    return await writer.commit()
  } catch (error) {
    try {
      await writer?.abort()
    } catch (cleanupError) {
      console.warn('Could not discard staging file', cleanupError)
    }
    throw error
  } finally {
    try {
      writer?.close()
    } finally {
      reader.close()
    }
  }
}
```

Opening the writer is inside `try`, so the reader is closed even if writer
creation fails. The abort path also handles commit failures. Await writes
sequentially to keep only one chunk in flight. `write()` takes an `ArrayBuffer`,
not a base64 string. `flush()` is optional and does not install the destination.

## Copy, move, hash, and remove your own files

This recipe creates its own input, copies it, moves the copy, compares hashes,
and removes only the two demonstration files. It can be rerun.

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit'

export async function verifyFileOperations(): Promise<boolean> {
  const files = FileToolkit.getFileSystem()
  const source = files.location('cache', 'toolkit-demo/source.txt')
  const copy = files.location('cache', 'toolkit-demo/copy.txt')
  const moved = files.location('cache', 'toolkit-demo/moved.txt')
  try {
    await files.writeText({
      destination: source,
      text: 'Copy me',
      encoding: 'utf-8',
      mode: 'replace',
      atomicity: 'required',
      createParentDirectories: true,
    })
    await files.copy({
      source,
      destination: copy,
      collision: 'replace',
      atomicity: 'required',
      followSymbolicLinks: false,
    })
    await files.move({
      source: copy,
      destination: moved,
      collision: 'replace',
      atomicity: 'required',
    })
    const before = await files.hash({ source, algorithm: 'sha-256' })
    const after = await files.hash({ source: moved, algorithm: 'sha-256' })
    return before === after
  } finally {
    for (const location of [source, copy, moved]) {
      await files.remove({ location, recursive: false, missing: 'ignore' })
    }
  }
}
```

Expected result: `true`. For application cleanup, use the same `remove()` pattern
on known locations. `clearManagedDirectory()` affects the entire selected root,
including files created by other parts of your app.
