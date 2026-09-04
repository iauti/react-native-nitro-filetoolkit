package com.margelo.nitro.filetoolkit

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import com.margelo.nitro.NitroModules
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.InputStream
import java.net.URI

internal class FileSourceResolver(
  context: Context = requireNotNull(NitroModules.applicationContext) {
    "NitroModules has not been installed"
  },
  private val locations: FileLocationResolver = FileLocationResolver(context),
) {
  private val contentResolver: ContentResolver = context.contentResolver
  private val metadata = FileMetadataMapper()

  fun sourceFromUri(value: String): FileSource {
    val parsed = parseAbsoluteUri(value)
    return when (parsed.scheme.lowercase()) {
      "file" -> {
        val location = locations.fromUri(value)
        FileSource(uri = location.uri, scheme = FileSourceScheme.FILE)
      }
      "content" -> {
        if (parsed.rawAuthority.isNullOrEmpty()) {
          throw FileToolkitException.invalidLocation("content URI must contain an authority")
        }
        FileSource(uri = Uri.parse(value).toString(), scheme = FileSourceScheme.CONTENT)
      }
      else -> throw FileToolkitException.invalidLocation(
        "only absolute file:// and content:// URIs are accepted",
      )
    }
  }

  fun inspect(source: FileSource): SourceInfo? {
    val validated = validate(source)
    return when (validated.scheme) {
      FileSourceScheme.FILE -> inspectFile(validated)
      FileSourceScheme.CONTENT -> inspectContent(validated)
    }
  }

  fun openInput(source: FileSource): InputStream {
    val validated = validate(source)
    return try {
      when (validated.scheme) {
        FileSourceScheme.FILE -> FileInputStream(locations.fromUri(validated.uri).let(locations::file))
        FileSourceScheme.CONTENT -> contentResolver.openInputStream(Uri.parse(validated.uri))
          ?: throw FileNotFoundException("content provider returned no stream")
      }
    } catch (error: FileNotFoundException) {
      throw FileToolkitException.invalidOperation("source is unavailable", error)
    } catch (error: SecurityException) {
      throw FileToolkitException.invalidOperation("source access was denied", error)
    } catch (error: FileToolkitException) {
      throw error
    } catch (error: Exception) {
      throw FileToolkitException.invalidOperation("source cannot be opened", error)
    }
  }

  private fun inspectFile(source: FileSource): SourceInfo? {
    val file = locations.fromUri(source.uri).let(locations::file)
    if (!metadata.exists(file)) return null
    val info = metadata.info(file)
    return SourceInfo(source = source, name = info.name, byteCount = info.byteCount?.toULong())
  }

  private fun inspectContent(source: FileSource): SourceInfo? = try {
    contentResolver.query(
      Uri.parse(source.uri),
      arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE),
      null,
      null,
      null,
    )?.use { cursor ->
      if (!cursor.moveToFirst()) return null

      val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
      val name = if (nameIndex >= 0 && !cursor.isNull(nameIndex)) cursor.getString(nameIndex) else null
      val size = if (sizeIndex >= 0 && !cursor.isNull(sizeIndex)) cursor.getLong(sizeIndex) else null
      if (size != null && size < 0L) {
        throw FileToolkitException.invalidOperation("source byte count must not be negative")
      }
      SourceInfo(source = source, name = name, byteCount = size?.toULong())
    }
  } catch (_: FileNotFoundException) {
    null
  } catch (error: SecurityException) {
    throw FileToolkitException.invalidOperation("source access was denied", error)
  } catch (error: FileToolkitException) {
    throw error
  } catch (error: Exception) {
    throw FileToolkitException.invalidOperation("source metadata cannot be read", error)
  }

  private fun validate(source: FileSource): FileSource {
    val validated = sourceFromUri(source.uri)
    if (validated.scheme != source.scheme) {
      throw FileToolkitException.invalidLocation("source scheme does not match its URI")
    }
    return validated
  }

  private fun parseAbsoluteUri(value: String): URI {
    val uri = try {
      URI(value)
    } catch (error: Exception) {
      throw FileToolkitException.invalidLocation("URI is malformed", error)
    }
    if (!uri.isAbsolute || uri.scheme.isNullOrEmpty()) {
      throw FileToolkitException.invalidLocation("source URI must be absolute")
    }
    return uri
  }
}
