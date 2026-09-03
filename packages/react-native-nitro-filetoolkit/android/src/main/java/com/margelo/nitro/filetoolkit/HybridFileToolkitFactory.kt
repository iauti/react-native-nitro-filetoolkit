package com.margelo.nitro.filetoolkit

import com.margelo.nitro.core.Promise
import java.util.concurrent.ConcurrentHashMap

class HybridFileToolkitFactory : HybridFileToolkitFactorySpec() {
  private val fileSystem by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { HybridFileSystem() }
  private val transferManager by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { HybridTransferManager() }
  private val archiveManager by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { HybridArchiveManager() }
  private val contentManager by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { HybridContentManager() }
  private val cookieStores = ConcurrentHashMap<CookieStoreKind, HybridCookieStore>()

  override fun getFileSystem(): HybridFileSystemSpec = fileSystem

  override fun openTransferManager(): Promise<HybridTransferManagerSpec> =
    Promise.resolved(transferManager)

  override fun getArchiveManager(): HybridArchiveManagerSpec = archiveManager

  override fun getContentManager(): HybridContentManagerSpec = contentManager

  override fun openCookieStore(options: CookieStoreOptions): Promise<HybridCookieStoreSpec> =
    Promise.resolved(cookieStores.computeIfAbsent(options.kind) { HybridCookieStore(it) })
}

private class HybridTransferManager : HybridTransferManagerSpec()

private class HybridArchiveManager : HybridArchiveManagerSpec()

private class HybridContentManager : HybridContentManagerSpec()

private class HybridCookieStore(override val kind: CookieStoreKind) : HybridCookieStoreSpec()
