/** Owns cleanup for a repeated native event subscription. */
export interface ListenerSubscription {
  remove: () => void
}
