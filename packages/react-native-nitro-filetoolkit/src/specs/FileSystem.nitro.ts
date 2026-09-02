import type { HybridObject } from 'react-native-nitro-modules'
import type { FileInfo } from '../types/FileInfo'
import type {
  ClearManagedDirectoryOptions,
  ClearResult,
  CopyOptions,
  CreateDirectoryOptions,
  DiskSpace,
  FilePage,
  HashOptions,
  ListOptions,
  MoveOptions,
  OpenWriterOptions,
  ReadTextOptions,
  RemoveOptions,
  WriteTextOptions,
} from '../types/FileOptions'
import type {
  FileLocation,
  ManagedDirectory,
} from '../types/FileLocation'
import type { FileReader } from './FileReader.nitro'
import type { FileWriter } from './FileWriter.nitro'

export interface FileSystem
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  location(
    directory: ManagedDirectory,
    relativePath: string,
  ): FileLocation
  fromUri(uri: string): FileLocation

  stat(location: FileLocation): Promise<FileInfo | undefined>
  list(options: ListOptions): Promise<FilePage>

  readText(options: ReadTextOptions): Promise<string>
  writeText(options: WriteTextOptions): Promise<FileInfo>
  openReader(location: FileLocation): Promise<FileReader>
  openWriter(options: OpenWriterOptions): Promise<FileWriter>

  createDirectory(options: CreateDirectoryOptions): Promise<FileInfo>
  copy(options: CopyOptions): Promise<FileInfo>
  move(options: MoveOptions): Promise<FileInfo>
  remove(options: RemoveOptions): Promise<void>

  hash(options: HashOptions): Promise<string>
  getDiskSpace(directory: ManagedDirectory): Promise<DiskSpace>
  clearManagedDirectory(
    options: ClearManagedDirectoryOptions,
  ): Promise<ClearResult>
}
