import type {
  FileLocation,
  FileSystem,
  FileToolkitFactory,
} from '../src/index'

export const location: FileLocation = {
  uri: 'file:///documents/reports/annual.pdf',
}

export type FactoryContract = FileToolkitFactory
export type FileSystemContract = FileSystem
export type FromUriContract = FileSystem['fromUri']

declare const factory: FileToolkitFactory

factory.getFileSystem()

// The initial release deliberately exposes only implemented domains.
// @ts-expect-error transfer support is not part of the filesystem release
factory.openTransferManager()
// @ts-expect-error archive support is not part of the filesystem release
factory.getArchiveManager()
// @ts-expect-error content support is not part of the filesystem release
factory.getContentManager()
// @ts-expect-error cookie support is not part of the filesystem release
factory.openCookieStore({ kind: 'transfer' })
