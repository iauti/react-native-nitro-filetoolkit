package com.margelo.nitro.filetoolkit

import android.util.Base64
import com.margelo.nitro.core.Promise
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.charset.Charset
import java.nio.charset.CodingErrorAction

internal class HybridFileSystem : HybridFileSystemSpec() {
  private val resolver = FileLocationResolver()
  private val metadata = FileMetadataMapper()

  override fun location(directory: ManagedDirectory, relativePath: String): FileLocation =
    resolver.location(directory, relativePath)

  override fun fromUri(uri: String): FileLocation = resolver.fromUri(uri)

  override fun root(directory: ManagedDirectory): FileLocation = resolver.rootLocation(directory)

  override fun stat(location: FileLocation): Promise<FileInfo?> = Promise.parallel {
    val file = resolver.file(location)
    if (metadata.exists(file)) metadata.info(file) else null
  }

  override fun list(options: ListOptions): Promise<FilePage> = Promise.parallel {
    val directory = resolver.fileForAccess(options.directory)
    if (!metadata.isDirectory(directory)) {
      throw FileToolkitException.invalidOperation("location is not a directory")
    }
    val limit = checkedInt(options.maxEntryCount.toULong(), "maxEntryCount")
    if (limit <= 0) {
      throw FileToolkitException.invalidOperation("maxEntryCount must be greater than zero")
    }
    val files = if (options.recursive) recursiveChildren(directory) else visibleChildren(directory)
    val sorted = files.sortedBy { it.absolutePath.lowercase() }
    val start = decodeCursor(options.cursor)
    if (start > sorted.size) {
      throw FileToolkitException.invalidOperation("cursor is outside the current directory listing")
    }
    val end = minOf(start + limit, sorted.size)
    FilePage(
      items = sorted.subList(start, end).map(metadata::info).toTypedArray(),
      nextCursor = if (end < sorted.size) encodeCursor(end) else null,
    )
  }

  override fun readText(options: ReadTextOptions): Promise<String> = Promise.parallel {
    val source = resolver.fileForAccess(options.source)
    val limit = checkedInt(options.maxByteCount.toULong(), "maxByteCount")
    source.inputStream().use { input ->
      val output = ByteArrayOutputStream(minOf(limit, DEFAULT_BUFFER_SIZE))
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      var total = 0L
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        total += count
        if (total > limit.toLong()) {
          throw FileToolkitException.resourceLimit("file exceeds maxByteCount")
        }
        output.write(buffer, 0, count)
      }
      decodeText(output.toByteArray(), options.encoding)
    }
  }

  override fun writeText(options: WriteTextOptions): Promise<FileInfo> = Promise.parallel {
    val destination = if (
      options.mode == WriteMode.APPEND ||
      options.mode == WriteMode.REPLACE && options.atomicity == Atomicity.NONE
    ) {
      resolver.fileForAccess(options.destination)
    } else {
      resolver.file(options.destination)
    }
    val bytes = options.text.toByteArray(charset(options.encoding))
    FileOperations.ensureParent(destination, options.createParentDirectories)
    when (options.mode) {
      WriteMode.APPEND -> FileOutputStream(destination, true).use { output ->
        output.write(bytes)
        output.fd.sync()
      }
      WriteMode.CREATE_NEW, WriteMode.REPLACE -> {
        if (options.mode == WriteMode.CREATE_NEW && metadata.exists(destination)) {
          throw FileToolkitException.invalidOperation("destination already exists")
        }
        if (options.mode == WriteMode.REPLACE && options.atomicity == Atomicity.NONE) {
          FileOutputStream(destination, false).use { output ->
            output.write(bytes)
            output.fd.sync()
          }
        } else {
          val staging = FileOperations.siblingStagingFile(destination)
          try {
            FileOutputStream(staging).use { output ->
              output.write(bytes)
              output.fd.sync()
            }
            if (options.mode == WriteMode.CREATE_NEW) {
              FileOperations.installNew(staging, destination)
            } else {
              FileOperations.atomicReplace(staging, destination, options.atomicity)
            }
          } finally {
            if (staging.exists()) staging.delete()
          }
        }
      }
    }
    metadata.info(destination)
  }

  override fun openReader(location: FileLocation): Promise<HybridFileReaderSpec> = Promise.parallel {
    HybridFileReader(location, resolver.fileForAccess(location))
  }

  override fun openWriter(options: OpenWriterOptions): Promise<HybridFileWriterSpec> = Promise.parallel {
    val destination = resolver.file(options.destination)
    if (options.mode == WriteMode.APPEND && metadata.exists(destination)) {
      resolver.fileForAccess(options.destination)
    }
    FileOperations.ensureParent(destination, options.createParentDirectories)
    HybridFileWriter(
      options.destination,
      destination,
      options.mode,
      options.atomicity,
      metadata,
    )
  }

  override fun createDirectory(options: CreateDirectoryOptions): Promise<FileInfo> = Promise.parallel {
    val directory = resolver.fileForAccess(options.location)
    val created = if (options.createParentDirectories) directory.mkdirs() else directory.mkdir()
    if (!created && !directory.isDirectory) {
      throw FileToolkitException.invalidOperation("cannot create directory")
    }
    metadata.info(directory)
  }

  override fun copy(options: CopyOptions): Promise<FileInfo> = Promise.parallel {
    val source = if (options.followSymbolicLinks) {
      resolver.fileForAccess(options.source)
    } else {
      resolver.file(options.source)
    }
    val destination = resolver.file(options.destination)
    if (!metadata.exists(source)) {
      throw FileToolkitException.invalidOperation("source does not exist")
    }
    FileOperations.checkCollision(destination, options.collision, metadata)
    FileOperations.ensureParent(destination, true)
    val staging = FileOperations.siblingStagingFile(destination)
    try {
      FileOperations.copy(source, staging, options.followSymbolicLinks)
      FileOperations.atomicReplace(staging, destination, options.atomicity)
    } finally {
      if (metadata.exists(staging)) FileOperations.delete(staging, true)
    }
    metadata.info(destination)
  }

  override fun move(options: MoveOptions): Promise<FileInfo> = Promise.parallel {
    val source = resolver.file(options.source)
    val destination = resolver.file(options.destination)
    if (!metadata.exists(source)) {
      throw FileToolkitException.invalidOperation("source does not exist")
    }
    FileOperations.checkCollision(destination, options.collision, metadata)
    FileOperations.ensureParent(destination, true)
    try {
      android.system.Os.rename(source.path, destination.path)
    } catch (error: Exception) {
      if (options.atomicity == Atomicity.REQUIRED) {
        throw FileToolkitException.invalidOperation("atomic move is unavailable", error)
      }
      if (metadata.exists(destination)) FileOperations.delete(destination, true)
      FileOperations.copy(source, destination, false)
      FileOperations.delete(source, true)
    }
    metadata.info(destination)
  }

  override fun remove(options: RemoveOptions): Promise<Unit> = Promise.parallel {
    val file = resolver.file(options.location)
    if (!metadata.exists(file)) {
      if (options.missing == MissingPolicy.IGNORE) return@parallel
      throw FileToolkitException.invalidOperation("location does not exist")
    }
    FileOperations.delete(file, options.recursive)
  }

  override fun hash(options: HashOptions): Promise<String> = Promise.parallel {
    FileOperations.digest(resolver.fileForAccess(options.source), options.algorithm)
  }

  override fun getDiskSpace(directory: ManagedDirectory): Promise<DiskSpace> = Promise.parallel {
    val root = resolver.existingRootOrAncestor(directory)
    DiskSpace(root.usableSpace, root.totalSpace)
  }

  override fun clearManagedDirectory(
    options: ClearManagedDirectoryOptions,
  ): Promise<ClearResult> = Promise.parallel {
    val root = resolver.safeRoot(options.directory)
    if (!metadata.exists(root)) return@parallel ClearResult(0L, 0L)
    var removed = 0L
    var reclaimed = 0L
    root.listFiles().orEmpty().forEach { entry ->
      if (entry.isDirectory && !options.recursive) return@forEach
      val measurement = FileOperations.measure(entry)
      FileOperations.delete(entry, true)
      removed += measurement.count
      reclaimed += measurement.bytes
    }
    ClearResult(removed, reclaimed)
  }

  private fun recursiveChildren(directory: File): List<File> = buildList {
    visibleChildren(directory).forEach { child ->
      add(child)
      if (metadata.isDirectory(child)) addAll(recursiveChildren(child))
    }
  }

  private fun visibleChildren(directory: File): List<File> =
    directory.listFiles()?.filterNot { it.name.startsWith('.') }.orEmpty()

  private fun checkedInt(value: ULong, name: String): Int {
    if (value > Int.MAX_VALUE.toULong()) {
      throw FileToolkitException.resourceLimit("$name exceeds the platform limit")
    }
    return value.toInt()
  }

  private fun encodeCursor(offset: Int): String = Base64.encodeToString(
    "v1:$offset".toByteArray(Charsets.UTF_8),
    Base64.NO_WRAP,
  )

  private fun decodeCursor(cursor: String?): Int {
    if (cursor == null) return 0
    val value = try {
      String(Base64.decode(cursor, Base64.DEFAULT), Charsets.UTF_8)
    } catch (error: IllegalArgumentException) {
      throw FileToolkitException.invalidOperation("invalid list cursor", error)
    }
    val offset = value.takeIf { it.startsWith("v1:") }?.drop(3)?.toIntOrNull()
    if (offset == null || offset < 0) {
      throw FileToolkitException.invalidOperation("invalid list cursor")
    }
    return offset
  }

  private fun charset(encoding: TextEncoding): Charset = when (encoding) {
    TextEncoding.UTF_8 -> Charsets.UTF_8
    TextEncoding.UTF_16LE -> Charsets.UTF_16LE
    TextEncoding.UTF_16BE -> Charsets.UTF_16BE
  }

  private fun decodeText(bytes: ByteArray, encoding: TextEncoding): String = try {
    charset(encoding)
      .newDecoder()
      .onMalformedInput(CodingErrorAction.REPORT)
      .onUnmappableCharacter(CodingErrorAction.REPORT)
      .decode(ByteBuffer.wrap(bytes))
      .toString()
  } catch (error: Exception) {
    throw FileToolkitException.invalidOperation("file is not valid text", error)
  }
}
