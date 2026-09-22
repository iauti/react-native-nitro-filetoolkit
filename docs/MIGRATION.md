# Migration guide

[Documentation](README.md) · [API](API.md) · [Alternatives](ALTERNATIVES.md)

This toolkit is not API-compatible with `rn-file-toolkit`, RNFS-style APIs,
Expo FileSystem, or react-native-file-access. Install it alongside your current
library and migrate one workflow at a time. Keep integrations for capabilities
that the toolkit does not yet implement.

## Translate operations, then review behavior

| Existing pattern | Toolkit equivalent | Review before switching |
| --- | --- | --- |
| Concatenate an app root and filename | `location(directory, relativePath)` | Use a portable relative path; see the platform root mappings |
| Keep a local absolute URI | `fromUri(uri)` | Requires an absolute `file://` URI, not a raw path or HTTP URL |
| Read a picked URI directly | `sourceFromUri()` → `importFile()` | External access is read-only and permission may expire |
| `exists(path)` | `await stat(location) !== undefined` | This is only a point-in-time check, not a lock |
| `readFile(path, 'utf8')` | `readText({ source, encoding: 'utf-8', maxByteCount })` | Required byte cap; rejects invalid text |
| `writeFile` / `appendFile` | `writeText(...)` | Explicit mode, encoding, atomicity, and parent-creation policy |
| `readDir` / `ls` | `list(...)` | Pages, optional cursor, hidden entries excluded |
| `mkdir` | `createDirectory(...)` | Explicit parent-creation policy |
| `copyFile` / `moveFile` | `copy(...)` / `move(...)` | Explicit collision/atomicity; returns destination metadata |
| `unlink` / `delete` | `remove(...)` | Explicit recursive and missing-entry policies |
| Base64 binary I/O | `openReader()` / `openWriter()` | `ArrayBuffer` chunks; close handles and commit writers |
| Downloads, uploads, ZIP, or sharing | Keep a separate integration | These APIs are not available here |

Do not automatically prepend `file://` to arbitrary input. Let a picker supply
a valid URI or construct app-owned locations with `location()`.

## Existing toolkit consumers

- `FileLocation` includes `origin: 'managed' | 'uri'`. Replace hand-authored
  objects with `location()`, `root()`, or `fromUri()`.
- Android `documents` maps directly to `Context.filesDir`. Review where older
  versions stored files before migrating user data; do not delete old storage
  until the migration has been verified.
- Picker/share URIs use `FileSource`; import them before local operations.
- Android provider grants are not persisted or renewed by the toolkit.
- Byte counts/offsets use `bigint`, not `number`. Convert to strings at JSON
  boundaries and check optional metadata before use.

Test migration on both platforms with existing files, missing files, collisions,
invalid text, and an unavailable picker source. Check that cleanup removes only
the data your app intended to remove.
