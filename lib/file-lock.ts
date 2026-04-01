/**
 * FileLock: simple async mutex for file write operations.
 * Concurrent writes on the same key queue up and execute serially,
 * preventing JSON corruption from read-then-write races.
 */

const locks = new Map<string, Promise<void>>()

export class FileLock {
  static async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for any existing lock on this key to resolve before acquiring
    const previous = locks.get(key) ?? Promise.resolve()

    let releaseLock!: () => void
    const current = new Promise<void>(resolve => {
      releaseLock = resolve
    })

    // Chain: the new lock starts only after the previous one completes
    const chained = previous.then(() => fn()).finally(() => {
      releaseLock()
      // Clean up map once this lock is no longer the active one
      if (locks.get(key) === current) {
        locks.delete(key)
      }
    })

    locks.set(key, current)

    return chained
  }
}
