import type { HybridObject } from 'react-native-nitro-modules'
import type { FileSystem } from './FileSystem.nitro'

export interface FileToolkitFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getFileSystem(): FileSystem
}
