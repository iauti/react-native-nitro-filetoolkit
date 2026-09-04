import type {
  FileInfo,
  FileLocation,
  FileLocationOrigin,
  FileSource,
  FileSourceScheme,
  FileSystem,
  FileToolkitFactory,
  ImportFileOptions,
  SourceInfo,
} from '../src/index'

export const managedOrigin: FileLocationOrigin = 'managed'
export const contentScheme: FileSourceScheme = 'content'

export const location: FileLocation = {
  origin: managedOrigin,
  uri: 'file:///documents/reports/annual.pdf',
}

export const source: FileSource = {
  scheme: contentScheme,
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
export type FromUriContract = FileSystem['fromUri']
export type RootContract = FileSystem['root']
export type SourceFromUriContract = FileSystem['sourceFromUri']
export type InspectSourceContract = FileSystem['inspectSource']
export type ImportFileContract = FileSystem['importFile']

declare const factory: FileToolkitFactory

const files = factory.getFileSystem()

export const uriLocation: FileLocation = files.fromUri(
  'file:///documents/report.pdf',
)
export const documentRoot: FileLocation = files.root('documents')
export const externalSource: FileSource = files.sourceFromUri(
  'content://documents/report.pdf',
)
export const inspectedSource: Promise<SourceInfo | undefined> =
  files.inspectSource(source)
export const importedFile: Promise<FileInfo> = files.importFile(importOptions)

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
