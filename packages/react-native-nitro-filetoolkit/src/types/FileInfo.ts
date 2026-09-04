import type { FileLocation } from './FileLocation'
import type { UInt64 } from 'react-native-nitro-modules'

export type FileKind = 'file' | 'directory' | 'symbolic-link'

/** Metadata for one filesystem entry. */
export interface FileInfo {
  readonly kind: FileKind
  readonly location: FileLocation
  readonly name: string
  readonly byteCount?: UInt64
  readonly symbolicLinkTarget?: FileLocation
  readonly createdAt?: Date
  readonly modifiedAt?: Date
}
