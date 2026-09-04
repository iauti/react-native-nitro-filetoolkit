/** App-owned roots that can safely contain relative paths. */
export type ManagedDirectory =
  | 'cache'
  | 'documents'
  | 'downloads'
  | 'temporary'
  | 'application-support'

/**
 * A canonical, validated local or platform-owned URI.
 *
 * Create managed locations with `FileSystem.location()` and validate external
 * `file:` or Android `content:` URIs with `FileSystem.fromUri()`.
 */
export interface FileLocation {
  readonly uri: string
}
