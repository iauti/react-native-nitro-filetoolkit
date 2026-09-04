/** App-owned roots that can safely contain relative paths. */
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

export type FileLocationOrigin = 'managed' | 'uri'

/** A canonical, validated local file location. */
export interface FileLocation {
  readonly origin: FileLocationOrigin
  readonly uri: string
}

export type FileSourceScheme = 'file' | 'content'

/** A read-only source URI that can be inspected or imported. */
export interface FileSource {
  readonly uri: string
  readonly scheme: FileSourceScheme
}
