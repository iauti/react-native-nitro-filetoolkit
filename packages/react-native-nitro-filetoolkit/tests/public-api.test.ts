import type {
  FileLocation,
  FileSource,
  FileSystem,
  FileToolkitFactory,
  ImportFileOptions,
} from '../src/index'

export const location: FileLocation = {
  kind: 'local',
  uri: 'file:///documents/reports/annual.pdf',
}

export const source: FileSource = {
  kind: 'source',
  scheme: 'content',
  uri: 'content://documents/report.pdf',
}

export const importOptions: ImportFileOptions = {
  source,
  destination: location,
  collision: 'replace',
  atomicity: 'preferred',
}

export type FactoryContract = FileToolkitFactory
export type FileSystemContract = FileSystem
export type RootContract = FileSystem['root']
export type SourceFromUriContract = FileSystem['sourceFromUri']
export type InspectSourceContract = FileSystem['inspectSource']
export type ImportFileContract = FileSystem['importFile']

declare const factory: FileToolkitFactory

const files = factory.getFileSystem()

files.root('documents')
files.sourceFromUri('content://documents/report.pdf')
files.inspectSource(source)
files.importFile(importOptions)

files.remove({
  // @ts-expect-error external sources are read-only and cannot be removed
  location: source,
  recursive: false,
  missing: 'fail',
})

files.move({
  // @ts-expect-error external sources must be imported instead of moved
  source,
  destination: location,
  collision: 'replace',
  atomicity: 'preferred',
})

// The initial release deliberately exposes only implemented domains.
// @ts-expect-error transfer support is not part of the filesystem release
factory.openTransferManager()
// @ts-expect-error archive support is not part of the filesystem release
factory.getArchiveManager()
// @ts-expect-error content support is not part of the filesystem release
factory.getContentManager()
// @ts-expect-error cookie support is not part of the filesystem release
factory.openCookieStore({ kind: 'transfer' })
