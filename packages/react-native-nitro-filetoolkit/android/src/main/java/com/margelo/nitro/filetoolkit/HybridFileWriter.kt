package com.margelo.nitro.filetoolkit

import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile

internal class HybridFileWriter(
  override val destination: FileLocation,
  private val destinationFile: File,
  private val mode: WriteMode,
  private val atomicity: Atomicity,
  private val metadata: FileMetadataMapper,
) : HybridFileWriterSpec() {
  private val lock = Any()
  private val stagingFile = FileOperations.siblingStagingFile(destinationFile)
  private val handle: RandomAccessFile
  private var currentPosition = 0L
  private var closed = false
  private var finished = false

  init {
    if (mode == WriteMode.CREATE_NEW && metadata.exists(destinationFile)) {
      throw FileToolkitException.invalidOperation("destination already exists")
    }
    if (mode == WriteMode.APPEND && metadata.exists(destinationFile)) {
      FileInputStream(destinationFile).use { input ->
        FileOutputStream(stagingFile).use { output -> input.copyTo(output) }
      }
    } else if (!stagingFile.createNewFile()) {
      throw FileToolkitException.invalidOperation("cannot create staging file")
    }
    handle = RandomAccessFile(stagingFile, "rw")
    currentPosition = if (mode == WriteMode.APPEND) handle.length() else 0L
    handle.seek(currentPosition)
  }

  override val position: ULong
    get() = synchronized(lock) { currentPosition.toULong() }

  override fun write(data: ArrayBuffer): Promise<Unit> {
    val ownedBytes = data.toByteArray()
    return Promise.parallel {
      synchronized(lock) {
        requireWritable()
        handle.write(ownedBytes)
        currentPosition += ownedBytes.size
      }
    }
  }

  override fun flush(): Promise<Unit> = Promise.parallel {
    synchronized(lock) {
      requireWritable()
      handle.fd.sync()
    }
  }

  override fun commit(): Promise<FileInfo> = Promise.parallel {
    synchronized(lock) {
      requireWritable()
      handle.fd.sync()
      handle.close()
      closed = true
      if (mode == WriteMode.CREATE_NEW) {
        FileOperations.installNew(stagingFile, destinationFile)
      } else {
        FileOperations.atomicReplace(stagingFile, destinationFile, atomicity)
      }
      finished = true
      metadata.info(destinationFile)
    }
  }

  override fun abort(): Promise<Unit> = Promise.parallel {
    synchronized(lock) { finishWithoutCommit() }
  }

  override fun close() {
    synchronized(lock) { finishWithoutCommit() }
  }

  private fun finishWithoutCommit() {
    if (!closed) {
      handle.close()
      closed = true
    }
    if (!finished && stagingFile.exists()) stagingFile.delete()
    finished = true
  }

  private fun requireWritable() {
    if (closed || finished) throw FileToolkitException.invalidOperation("writer is closed")
  }
}
