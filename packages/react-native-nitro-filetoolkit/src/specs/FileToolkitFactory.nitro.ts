import type { HybridObject } from 'react-native-nitro-modules'
import type { CookieStoreOptions } from '../types/CookieStoreOptions'
import type { FileSystem } from './FileSystem.nitro'
import type { ArchiveManager } from './domains/ArchiveManager.nitro'
import type { ContentManager } from './domains/ContentManager.nitro'
import type { CookieStore } from './domains/CookieStore.nitro'
import type { TransferManager } from './domains/TransferManager.nitro'

export interface FileToolkitFactory
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getFileSystem(): FileSystem
  openTransferManager(): Promise<TransferManager>
  getArchiveManager(): ArchiveManager
  getContentManager(): ContentManager
  openCookieStore(options: CookieStoreOptions): Promise<CookieStore>
}
