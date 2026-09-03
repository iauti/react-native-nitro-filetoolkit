package com.margelo.nitro.filetoolkit

import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.RandomAccessFile

internal class HybridFileReader(
  override val location: FileLocation,
  file: File,
) : HybridFileReaderSpec() {
  private val lock = Any()
  private val handle = RandomAccessFile(file, "r")
  private val byteCount = handle.length()
  private var currentPosition = 0L
  private var closed = false

  override val position: ULong
    get() = synchronized(lock) { currentPosition.toULong() }

  override fun read(maxByteCount: ULong): Promise<ReadChunk> {
    if (maxByteCount > Int.MAX_VALUE.toULong()) {
      throw FileToolkitException.resourceLimit("maxByteCount exceeds the platform limit")
    }
    return Promise.parallel {
      synchronized(lock) {
        requireOpen()
        val offset = currentPosition
        val requested = maxByteCount.toInt()
        val bytes = ByteArray(requested)
        val count = if (requested == 0) 0 else handle.read(bytes)
        val result = if (count <= 0) ByteArray(0) else bytes.copyOf(count)
        currentPosition += result.size
        ReadChunk(
          data = ArrayBuffer.copy(result),
          offset = offset,
          isEndOfFile = currentPosition >= byteCount,
        )
      }
    }
  }

  override fun seek(offset: ULong): Promise<Unit> = Promise.parallel {
    if (offset > Long.MAX_VALUE.toULong()) {
      throw FileToolkitException.resourceLimit("offset exceeds the platform limit")
    }
    synchronized(lock) {
      requireOpen()
      handle.seek(offset.toLong())
      currentPosition = offset.toLong()
    }
  }

  override fun close() {
    synchronized(lock) {
      if (closed) return
      handle.close()
      closed = true
    }
  }

  private fun requireOpen() {
    if (closed) throw FileToolkitException.invalidOperation("reader is closed")
  }
}
