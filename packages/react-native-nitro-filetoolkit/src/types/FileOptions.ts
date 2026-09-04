import type { FileInfo } from './FileInfo'
import type {
  FileLocation,
  FileSource,
  ManagedDirectory,
} from './FileLocation'
import type { UInt64 } from 'react-native-nitro-modules'

export type CollisionPolicy = 'fail' | 'replace'
export type Atomicity = 'required' | 'preferred' | 'none'
export type WriteMode = 'create-new' | 'replace' | 'append'
export type TextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be'
export type HashAlgorithm = 'md5' | 'sha-1' | 'sha-256' | 'sha-512'
export type MissingPolicy = 'fail' | 'ignore'

export interface ListOptions {
  readonly directory: FileLocation
  readonly cursor?: string
  readonly maxEntryCount: UInt64
  readonly recursive: boolean
}

export interface FilePage {
  readonly items: FileInfo[]
  readonly nextCursor?: string
}

export interface ReadTextOptions {
  readonly source: FileLocation
  readonly encoding: TextEncoding
  readonly maxByteCount: UInt64
}

export interface WriteTextOptions {
  readonly destination: FileLocation
  readonly text: string
  readonly encoding: TextEncoding
  readonly mode: WriteMode
  readonly atomicity: Atomicity
  readonly createParentDirectories: boolean
}

export interface OpenWriterOptions {
  readonly destination: FileLocation
  readonly mode: WriteMode
  readonly atomicity: Atomicity
  readonly createParentDirectories: boolean
}

export interface CreateDirectoryOptions {
  readonly location: FileLocation
  readonly createParentDirectories: boolean
}

export interface CopyOptions {
  readonly source: FileLocation
  readonly destination: FileLocation
  readonly collision: CollisionPolicy
  readonly atomicity: Atomicity
  readonly followSymbolicLinks: boolean
}

export interface MoveOptions {
  readonly source: FileLocation
  readonly destination: FileLocation
  readonly collision: CollisionPolicy
  readonly atomicity: Atomicity
}

export interface SourceInfo {
  readonly source: FileSource
  readonly name?: string
  readonly byteCount?: UInt64
}

export interface ImportFileOptions {
  readonly source: FileSource
  readonly destination: FileLocation
  readonly collision: CollisionPolicy
  readonly atomicity: Atomicity
}

export interface RemoveOptions {
  readonly location: FileLocation
  readonly recursive: boolean
  readonly missing: MissingPolicy
}

export interface HashOptions {
  readonly source: FileLocation
  readonly algorithm: HashAlgorithm
}

export interface DiskSpace {
  readonly availableByteCount: UInt64
  readonly totalByteCount: UInt64
}

export interface ClearManagedDirectoryOptions {
  readonly directory: ManagedDirectory
  readonly recursive: boolean
}

export interface ClearResult {
  readonly removedEntryCount: UInt64
  readonly reclaimedByteCount: UInt64
}

export interface ReadChunk {
  readonly data: ArrayBuffer
  readonly offset: UInt64
  readonly isEndOfFile: boolean
}
