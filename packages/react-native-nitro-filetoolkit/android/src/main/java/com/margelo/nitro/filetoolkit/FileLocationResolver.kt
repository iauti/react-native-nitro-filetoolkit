package com.margelo.nitro.filetoolkit

import android.content.Context
import android.net.Uri
import android.system.Os
import android.system.OsConstants
import com.margelo.nitro.NitroModules
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.URI
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.CodingErrorAction

internal class FileLocationResolver(
  private val context: Context = requireNotNull(NitroModules.applicationContext) {
    "NitroModules has not been installed"
  },
) {
  fun location(directory: ManagedDirectory, relativePath: String): FileLocation {
    validateRelativePath(relativePath)
    val root = root(directory)
    val candidate = File(root, relativePath).absoluteFile.normalize()
    if (!isContainedByRoot(root, candidate)) {
      throw FileToolkitException.invalidLocation("relativePath escapes its managed directory")
    }
    return location(candidate, FileLocationOrigin.MANAGED)
  }

  fun fromUri(uri: String): FileLocation = location(fileFromUri(uri), FileLocationOrigin.URI)

  // Identity resolution preserves the final directory entry for lstat, link copies, moves, and removal.
  fun file(location: FileLocation): File {
    val file = fileFromUri(location.uri)
    if (location.origin == FileLocationOrigin.MANAGED && managedRoots().none { isContainedByRoot(it, file) }) {
      throw FileToolkitException.invalidLocation("managed location is outside all managed directories")
    }
    return file
  }

  // Access resolution follows an existing leaf link and re-checks where managed access lands.
  fun fileForAccess(location: FileLocation): File {
    val file = file(location)
    if (location.origin != FileLocationOrigin.MANAGED || !isSymbolicLink(file)) return file
    val resolved = canonicalFile(file)
    if (managedRoots().none { isContainedByRoot(it, resolved) }) {
      throw FileToolkitException.invalidLocation("managed symbolic link target is outside all managed directories")
    }
    return resolved
  }

  fun root(directory: ManagedDirectory): File = rawRoot(directory).absoluteFile.normalize()

  fun existingRootOrAncestor(directory: ManagedDirectory): File {
    val root = root(directory)
    val boundary = managedRootBoundary(root)
      ?: throw FileToolkitException.invalidLocation("managed directory cannot be a symbolic link")
    return boundary
  }

  fun safeRoot(directory: ManagedDirectory): File {
    val root = root(directory)
    if (isSymbolicLink(root)) {
      throw FileToolkitException.invalidLocation("managed directory cannot be a symbolic link")
    }
    return root
  }

  private fun ensureRoot(directory: ManagedDirectory): File {
    val root = safeRoot(directory)
    if ((!root.exists() && !root.mkdirs()) || !root.isDirectory) {
      throw FileToolkitException.invalidOperation("managed directory is unavailable")
    }
    return root
  }

  fun rootLocation(directory: ManagedDirectory): FileLocation =
    location(ensureRoot(directory), FileLocationOrigin.MANAGED)

  private fun rawRoot(directory: ManagedDirectory): File = when (directory) {
    ManagedDirectory.CACHE -> context.cacheDir
    ManagedDirectory.DOCUMENTS -> context.filesDir
    ManagedDirectory.DOWNLOADS -> File(context.filesDir, "Downloads")
    ManagedDirectory.TEMPORARY -> File(context.cacheDir, "Temporary")
    ManagedDirectory.APPLICATION_SUPPORT -> File(context.filesDir, "ApplicationSupport")
  }.absoluteFile

  private fun fileFromUri(value: String): File {
    val uri = try {
      URI(value)
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("URI is malformed", error)
    }
    if (
      uri.scheme != "file" ||
      !uri.isAbsolute ||
      uri.rawAuthority != null ||
      uri.rawQuery != null ||
      uri.rawFragment != null
    ) {
      throw FileToolkitException.invalidLocation("only absolute file:// URIs are accepted")
    }
    val rawPath = uri.rawPath
    if (rawPath == null) {
      throw FileToolkitException.invalidLocation("file URI must contain an absolute path")
    }
    val path = decodeRawPath(rawPath)
    if (!path.startsWith('/')) {
      throw FileToolkitException.invalidLocation("file URI must contain an absolute path")
    }
    return File(path).absoluteFile.normalize()
  }

  private fun decodeRawPath(rawPath: String): String {
    val output = ByteArrayOutputStream(rawPath.length)
    var literalStart = 0
    var index = 0
    while (index < rawPath.length) {
      if (rawPath[index] != '%') {
        index += 1
        continue
      }
      appendUtf8(output, rawPath.substring(literalStart, index))
      if (index + 2 >= rawPath.length) {
        throw FileToolkitException.invalidLocation("URI is malformed")
      }
      val decoded = (hexValue(rawPath[index + 1]) shl 4) or hexValue(rawPath[index + 2])
      if (decoded == '/'.code || decoded == '\\'.code || decoded == 0) {
        throw FileToolkitException.invalidLocation("file URI contains an unsafe encoded path character")
      }
      output.write(decoded)
      index += 3
      literalStart = index
    }
    appendUtf8(output, rawPath.substring(literalStart))
    return try {
      Charsets.UTF_8.newDecoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
        .decode(ByteBuffer.wrap(output.toByteArray()))
        .toString()
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("file URI path is not valid UTF-8", error)
    }
  }

  private fun appendUtf8(output: ByteArrayOutputStream, value: String) {
    val encoded = try {
      Charsets.UTF_8.newEncoder()
        .onMalformedInput(CodingErrorAction.REPORT)
        .onUnmappableCharacter(CodingErrorAction.REPORT)
        .encode(CharBuffer.wrap(value))
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("file URI path is not valid UTF-8", error)
    }
    val bytes = ByteArray(encoded.remaining())
    encoded.get(bytes)
    output.write(bytes)
  }

  private fun hexValue(character: Char): Int = when (character) {
    in '0'..'9' -> character.code - '0'.code
    in 'A'..'F' -> character.code - 'A'.code + 10
    in 'a'..'f' -> character.code - 'a'.code + 10
    else -> throw FileToolkitException.invalidLocation("URI is malformed")
  }

  private fun managedRoots(): Array<File> = arrayOf(
    ManagedDirectory.CACHE,
    ManagedDirectory.DOCUMENTS,
    ManagedDirectory.DOWNLOADS,
    ManagedDirectory.TEMPORARY,
    ManagedDirectory.APPLICATION_SUPPORT,
  ).map { root(it) }.toTypedArray()

  private fun isContainedByRoot(root: File, candidate: File): Boolean {
    if (!contains(root, candidate)) return false
    val boundary = managedRootBoundary(root) ?: return false
    if (candidate == root) return true
    val parent = candidate.parentFile ?: return false
    val resolvedParent = canonicalFile(nearestExistingAncestor(parent))
    return contains(boundary, resolvedParent)
  }

  private fun managedRootBoundary(root: File): File? {
    if (isSymbolicLink(root)) return null
    return canonicalFile(nearestExistingAncestor(root))
  }

  private fun nearestExistingAncestor(file: File): File {
    var current: File? = file
    while (current != null && !pathEntryExists(current)) {
      current = current.parentFile
    }
    return current ?: throw FileToolkitException.invalidLocation("file URI has no existing ancestor")
  }

  private fun pathEntryExists(file: File): Boolean = try {
    Os.lstat(file.path)
    true
  } catch (_: Exception) {
    false
  }

  private fun isSymbolicLink(file: File): Boolean = try {
    OsConstants.S_ISLNK(Os.lstat(file.path).st_mode)
  } catch (_: Exception) {
    false
  }

  private fun canonicalFile(file: File): File = try {
    file.canonicalFile
  } catch (error: Exception) {
    throw FileToolkitException.invalidLocation("file URI cannot be resolved", error)
  }

  private fun contains(root: File, candidate: File): Boolean =
    candidate == root || candidate.path.startsWith(
      root.path.trimEnd(File.separatorChar) + File.separator,
    )

  private fun location(file: File, origin: FileLocationOrigin): FileLocation {
    val absolute = file.absoluteFile.normalize()
    return FileLocation(origin, Uri.fromFile(absolute).toString())
  }

  private fun validateRelativePath(path: String) {
    if (path.isEmpty()) {
      throw FileToolkitException.invalidLocation("relativePath must not be empty")
    }
    if (path.startsWith('/') || path.contains('\\') || path.contains('\u0000')) {
      throw FileToolkitException.invalidLocation("relativePath must be a portable relative path")
    }
    if (path.split('/').any { it.isEmpty() || it == "." || it == ".." }) {
      throw FileToolkitException.invalidLocation(
        "relativePath cannot contain empty, '.' or '..' segments",
      )
    }
  }
}
