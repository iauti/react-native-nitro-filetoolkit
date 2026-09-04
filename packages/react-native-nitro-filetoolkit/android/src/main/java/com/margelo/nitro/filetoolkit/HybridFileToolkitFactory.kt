package com.margelo.nitro.filetoolkit

class HybridFileToolkitFactory : HybridFileToolkitFactorySpec() {
  private val fileSystem by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { HybridFileSystem() }

  override fun getFileSystem(): HybridFileSystemSpec = fileSystem
}
