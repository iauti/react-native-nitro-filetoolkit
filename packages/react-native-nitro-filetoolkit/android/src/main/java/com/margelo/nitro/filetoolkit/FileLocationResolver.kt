package com.margelo.nitro.filetoolkit

import android.content.Context
import com.margelo.nitro.NitroModules
import java.io.File
import java.net.URI

internal class FileLocationResolver(
  private val context: Context = requireNotNull(NitroModules.applicationContext) {
    "NitroModules has not been installed"
  },
) {
  fun location(directory: ManagedDirectory, relativePath: String): FileLocation {
    validateRelativePath(relativePath)
    val root = root(directory).canonicalFile
    val candidate = File(root, relativePath).canonicalFile
    if (candidate.parentFile == null || !candidate.path.startsWith(root.path + File.separator)) {
      throw FileToolkitException.invalidLocation("relativePath escapes its managed directory")
    }
    return candidate.toLocation()
  }

  fun fromUri(uri: String): FileLocation = fileFromUri(uri).toLocation()

  fun file(location: FileLocation): File = fileFromUri(location.uri)

  fun root(directory: ManagedDirectory): File = when (directory) {
    ManagedDirectory.CACHE -> context.cacheDir
    ManagedDirectory.DOCUMENTS -> File(context.filesDir, "Documents")
    ManagedDirectory.DOWNLOADS -> File(context.filesDir, "Downloads")
    ManagedDirectory.TEMPORARY -> File(context.cacheDir, "Temporary")
    ManagedDirectory.APPLICATION_SUPPORT -> File(context.filesDir, "ApplicationSupport")
  }.absoluteFile

  private fun fileFromUri(value: String): File {
    val uri = try {
      URI(value).normalize()
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("URI is malformed", error)
    }
    if (uri.scheme != "file" || !uri.isAbsolute || !uri.authority.isNullOrEmpty()) {
      throw FileToolkitException.invalidLocation("only absolute file:// URIs are accepted")
    }
    return try {
      File(uri).absoluteFile
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("file URI is invalid", error)
    }
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

internal fun File.toLocation(): FileLocation = FileLocation(toURI().normalize().toString())
