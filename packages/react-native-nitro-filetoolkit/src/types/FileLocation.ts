/** App-owned roots that can safely contain relative paths. */
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

/** A canonical, validated local file location. */
export interface FileLocation {
  readonly kind: 'local'
  readonly uri: string
}

export type FileSourceScheme = 'file' | 'content'

/** A read-only source URI that can be inspected or imported. */
export interface FileSource {
  readonly kind: 'source'
  readonly uri: string
  readonly scheme: FileSourceScheme
}
