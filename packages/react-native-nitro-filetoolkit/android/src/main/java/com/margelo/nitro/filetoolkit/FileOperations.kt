package com.margelo.nitro.filetoolkit

import android.system.Os
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.security.MessageDigest
import java.util.UUID

internal object FileOperations {
  data class Measurement(val count: Long, val bytes: Long)

  fun ensureParent(file: File, create: Boolean) {
    val parent = file.parentFile
      ?: throw FileToolkitException.invalidOperation("destination has no parent directory")
    if (parent.isDirectory) return
    if (!create || !parent.mkdirs() && !parent.isDirectory) {
      throw FileToolkitException.invalidOperation("parent directory does not exist")
    }
  }

  fun siblingStagingFile(destination: File): File =
    File(destination.parentFile, ".nitro-filetoolkit-${UUID.randomUUID()}.tmp")

  fun checkCollision(destination: File, policy: CollisionPolicy, metadata: FileMetadataMapper) {
    if (!metadata.exists(destination)) return
    if (policy == CollisionPolicy.FAIL) {
      throw FileToolkitException.invalidOperation("destination already exists")
    }
  }

  fun copyInputToFile(input: InputStream, destination: File) {
    ensureParent(destination, true)
    FileOutputStream(destination).use { output ->
      input.copyTo(output, bufferSize = DEFAULT_BUFFER_SIZE)
      output.fd.sync()
    }
  }

  fun copy(
    source: File,
    destination: File,
    followSymbolicLinks: Boolean,
    resolveSourceForAccess: (File) -> File = { it },
  ) {
    val sourceInfo = FileMetadataMapper().info(source)
    when (sourceInfo.kind) {
      FileKind.SYMBOLIC_LINK -> {
        if (followSymbolicLinks) {
          // Resolve at every level so nested managed links receive the same containment check.
          copy(resolveSourceForAccess(source), destination, true, resolveSourceForAccess)
        } else {
          ensureParent(destination, true)
          Os.symlink(Os.readlink(source.path), destination.path)
        }
      }
      FileKind.DIRECTORY -> {
        if (!destination.mkdirs() && !destination.isDirectory) {
          throw FileToolkitException.invalidOperation("cannot create destination directory")
        }
        source.listFiles()?.forEach { child ->
          copy(child, File(destination, child.name), followSymbolicLinks, resolveSourceForAccess)
        }
      }
      FileKind.FILE -> {
        ensureParent(destination, true)
        FileInputStream(source).use { input ->
          FileOutputStream(destination).use { output -> input.copyTo(output) }
        }
      }
    }
  }

  fun delete(file: File, recursive: Boolean) {
    if (file.isDirectory && !isSymbolicLink(file)) {
      val children = file.listFiles().orEmpty()
      if (!recursive && children.isNotEmpty()) {
        throw FileToolkitException.invalidOperation("directory is not empty; set recursive to true")
      }
      if (recursive) children.forEach { delete(it, true) }
    }
    if (!file.delete()) {
      throw FileToolkitException.invalidOperation("cannot remove ${file.path}")
    }
  }

  fun atomicReplace(staging: File, destination: File, atomicity: Atomicity) {
    try {
      Os.rename(staging.path, destination.path)
    } catch (error: Exception) {
      if (atomicity == Atomicity.REQUIRED) {
        throw FileToolkitException.invalidOperation("cannot atomically replace destination", error)
      }
      try {
        if (FileMetadataMapper().exists(destination)) delete(destination, recursive = true)
        Os.rename(staging.path, destination.path)
      } catch (fallbackError: Exception) {
        throw FileToolkitException.invalidOperation(
          "cannot replace destination",
          fallbackError,
        )
      }
    }
  }

  fun installNew(staging: File, destination: File) {
    try {
      Os.link(staging.path, destination.path)
      staging.delete()
    } catch (error: Exception) {
      if (FileMetadataMapper().exists(destination)) {
        throw FileToolkitException.invalidOperation("destination already exists", error)
      }
      throw FileToolkitException.invalidOperation("cannot create destination", error)
    }
  }

  fun digest(file: File, algorithm: HashAlgorithm): String {
    val name = when (algorithm) {
      HashAlgorithm.MD5 -> "MD5"
      HashAlgorithm.SHA_1 -> "SHA-1"
      HashAlgorithm.SHA_256 -> "SHA-256"
      HashAlgorithm.SHA_512 -> "SHA-512"
    }
    val digest = MessageDigest.getInstance(name)
    FileInputStream(file).use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val count = input.read(buffer)
        if (count < 0) break
        digest.update(buffer, 0, count)
      }
    }
    return digest.digest().joinToString("") { "%02x".format(it.toInt() and 0xff) }
  }

  fun measure(file: File): Measurement {
    var count = 1L
    var bytes = if (file.isFile) file.length() else 0L
    if (file.isDirectory && !isSymbolicLink(file)) {
      file.listFiles()?.forEach { child ->
        val childMeasurement = measure(child)
        count += childMeasurement.count
        bytes += childMeasurement.bytes
      }
    }
    return Measurement(count, bytes)
  }

  private fun isSymbolicLink(file: File): Boolean = try {
    android.system.OsConstants.S_ISLNK(Os.lstat(file.path).st_mode)
  } catch (_: Exception) {
    false
  }
}
