import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const repositoryRoot = resolve(import.meta.dirname, '..')
const packageRoot = join(
  repositoryRoot,
  'packages/react-native-nitro-filetoolkit'
)
const cache = mkdtempSync(join(tmpdir(), 'nitro-filetoolkit-npm-'))

try {
  const result = spawnSync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: packageRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_config_cache: cache },
    }
  )

  assert.equal(result.status, 0, result.stderr || result.stdout)
  const [manifest] = JSON.parse(result.stdout)
  assert.ok(manifest, 'npm did not return a package manifest')

  const paths = new Set(manifest.files.map(({ path }) => path))
  const required = [
    'LICENSE',
    'README.md',
    'NitroFileToolkit.podspec',
    'android/CMakeLists.txt',
    'android/build.gradle',
    'ios/HybridFileSystem.swift',
    'lib/index.d.ts',
    'lib/index.js',
    'nitro.json',
    'nitrogen/generated/android/NitroFileToolkitOnLoad.cpp',
    'nitrogen/generated/ios/NitroFileToolkitAutolinking.mm',
    'package.json',
    'react-native.config.js',
    'src/index.ts',
  ]

  for (const path of required) {
    assert.ok(paths.has(path), `required package file is missing: ${path}`)
  }

  const forbidden = [
    /^docs\/(research|superpowers)\//,
    /^tests\//,
    /(^|\/)tsconfig(?:\.[^/]+)?\.json$/,
    /(^|\/)\.gradle\//,
    /(^|\/)node_modules\//,
  ]

  for (const path of paths) {
    assert.equal(
      forbidden.some((pattern) => pattern.test(path)),
      false,
      `development-only file leaked into package: ${path}`
    )
  }

  console.log(
    `Validated ${manifest.entryCount} package files (${manifest.unpackedSize} bytes unpacked).`
  )
} finally {
  rmSync(cache, { recursive: true, force: true })
}
