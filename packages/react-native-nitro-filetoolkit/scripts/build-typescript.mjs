import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function buildTypescript(directory = packageDirectory) {
  // Only generated package output is removed; source and other build folders stay intact.
  rmSync(join(directory, 'lib'), { recursive: true, force: true })
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '--build', '--force'], {
    cwd: directory,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = buildTypescript()
}
