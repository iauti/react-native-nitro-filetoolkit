import type { HybridObject, UInt64 } from 'react-native-nitro-modules'
import type { FileLocation } from '../types/FileLocation'
import type { ReadChunk } from '../types/FileOptions'

export interface FileReader
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly location: FileLocation
  readonly position: UInt64

  read(maxByteCount: UInt64): Promise<ReadChunk>
  seek(offset: UInt64): Promise<void>
  close(): void
}
