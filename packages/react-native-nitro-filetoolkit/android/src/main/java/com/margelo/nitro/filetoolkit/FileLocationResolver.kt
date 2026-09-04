package com.margelo.nitro.filetoolkit

import android.content.Context
import android.net.Uri
import com.margelo.nitro.NitroModules
import java.io.File

internal class FileLocationResolver(
  private val context: Context = requireNotNull(NitroModules.applicationContext) {
    "NitroModules has not been installed"
  },
) {
  fun location(directory: ManagedDirectory, relativePath: String): FileLocation {
    validateRelativePath(relativePath)
    val root = root(directory)
    val candidate = File(root, relativePath).canonicalFile
    if (candidate.parentFile == null || !candidate.path.startsWith(root.path + File.separator)) {
      throw FileToolkitException.invalidLocation("relativePath escapes its managed directory")
    }
    return location(candidate, FileLocationOrigin.MANAGED)
  }

  fun fromUri(uri: String): FileLocation = location(fileFromUri(uri), FileLocationOrigin.URI)

  fun file(location: FileLocation): File {
    val file = fileFromUri(location.uri)
    if (location.origin == FileLocationOrigin.MANAGED && managedRoots().none { contains(it, file) }) {
      throw FileToolkitException.invalidLocation("managed location is outside all managed directories")
    }
    return file
  }

  fun root(directory: ManagedDirectory): File {
    val root = rawRoot(directory).canonicalFile
    if ((!root.exists() && !root.mkdirs()) || !root.isDirectory) {
      throw FileToolkitException.invalidOperation("managed directory is unavailable")
    }
    return root
  }

  fun rootLocation(directory: ManagedDirectory): FileLocation =
    location(root(directory), FileLocationOrigin.MANAGED)

  private fun rawRoot(directory: ManagedDirectory): File = when (directory) {
    ManagedDirectory.CACHE -> context.cacheDir
    ManagedDirectory.DOCUMENTS -> context.filesDir
    ManagedDirectory.DOWNLOADS -> File(context.filesDir, "Downloads")
    ManagedDirectory.TEMPORARY -> File(context.cacheDir, "Temporary")
    ManagedDirectory.APPLICATION_SUPPORT -> File(context.filesDir, "ApplicationSupport")
  }.absoluteFile

  private fun fileFromUri(value: String): File {
    val uri = try {
      Uri.parse(value)
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("URI is malformed", error)
    }
    if (uri.scheme != "file" || !uri.isAbsolute || !uri.authority.isNullOrEmpty()) {
      throw FileToolkitException.invalidLocation("only absolute file:// URIs are accepted")
    }
    val path = uri.path
    if (path == null || !path.startsWith('/')) {
      throw FileToolkitException.invalidLocation("file URI must contain an absolute path")
    }
    return try {
      File(path).canonicalFile
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("file URI is invalid", error)
    }
  }

  private fun managedRoots(): Array<File> = arrayOf(
    ManagedDirectory.CACHE,
    ManagedDirectory.DOCUMENTS,
    ManagedDirectory.DOWNLOADS,
    ManagedDirectory.TEMPORARY,
    ManagedDirectory.APPLICATION_SUPPORT,
  ).map { rawRoot(it).canonicalFile }.toTypedArray()

  private fun contains(root: File, candidate: File): Boolean =
    candidate == root || candidate.path.startsWith(root.path + File.separator)

  private fun location(file: File, origin: FileLocationOrigin): FileLocation {
    val canonical = file.canonicalFile
    return FileLocation(origin, Uri.fromFile(canonical.absoluteFile).toString())
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
