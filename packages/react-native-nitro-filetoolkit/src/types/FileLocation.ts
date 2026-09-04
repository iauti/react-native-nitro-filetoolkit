/** App-owned roots that can safely contain relative paths. */
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

/** A canonical location inside an app-owned managed directory. */
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
