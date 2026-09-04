package com.margelo.nitro.filetoolkit

import android.os.Build
import android.system.ErrnoException
import android.system.Os
import android.system.OsConstants
import java.io.File
import java.time.Instant

internal class FileMetadataMapper {
  fun exists(file: File): Boolean = try {
    Os.lstat(file.path)
    true
  } catch (_: ErrnoException) {
    false
  }

  fun info(file: File): FileInfo {
    val stat = try {
      Os.lstat(file.path)
    } catch (error: ErrnoException) {
      throw FileToolkitException.invalidOperation("location does not exist", error)
    }
    val kind = when {
      OsConstants.S_ISLNK(stat.st_mode) -> FileKind.SYMBOLIC_LINK
      OsConstants.S_ISDIR(stat.st_mode) -> FileKind.DIRECTORY
      else -> FileKind.FILE
    }
    val linkTarget = if (kind == FileKind.SYMBOLIC_LINK) {
      val rawTarget = Os.readlink(file.path)
      val target = if (rawTarget.startsWith('/')) File(rawTarget) else File(file.parentFile, rawTarget)
      target.absoluteFile.toLocation()
    } else {
      null
    }
    val modifiedAt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Instant.ofEpochSecond(stat.st_mtime)
    } else {
      null
    }
    return FileInfo(
      kind = kind,
      location = file.absoluteFile.toLocation(),
      name = file.name,
      byteCount = if (kind == FileKind.FILE) stat.st_size else null,
      symbolicLinkTarget = linkTarget,
      createdAt = null,
      modifiedAt = modifiedAt,
    )
  }
}
