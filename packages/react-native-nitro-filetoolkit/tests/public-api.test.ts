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
