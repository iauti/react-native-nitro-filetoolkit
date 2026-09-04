import type { HybridObject, UInt64 } from 'react-native-nitro-modules'
import type { FileInfo } from '../types/FileInfo'
import type { FileLocation } from '../types/FileLocation'

export interface FileWriter
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  readonly destination: FileLocation
  readonly position: UInt64

  write(data: ArrayBuffer): Promise<void>
  flush(): Promise<void>
  commit(): Promise<FileInfo>
  abort(): Promise<void>
  close(): void
}
