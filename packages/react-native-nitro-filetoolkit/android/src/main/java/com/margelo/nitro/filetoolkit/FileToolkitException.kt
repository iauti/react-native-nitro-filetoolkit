package com.margelo.nitro.filetoolkit

internal class FileToolkitException(
  code: String,
  detail: String,
  cause: Throwable? = null,
) : RuntimeException("[file-toolkit/$code] $detail", cause) {
  companion object {
    fun invalidLocation(detail: String, cause: Throwable? = null) =
      FileToolkitException("invalid-location", detail, cause)

    fun invalidOperation(detail: String, cause: Throwable? = null) =
      FileToolkitException("invalid-operation", detail, cause)

    fun resourceLimit(detail: String) =
      FileToolkitException("resource-limit", detail)
  }
}
