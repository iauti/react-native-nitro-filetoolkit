import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildTypescript } from '../packages/react-native-nitro-filetoolkit/scripts/build-typescript.mjs'

test('build removes obsolete output and restores output despite an incremental cache', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'filetoolkit-build-'))
  try {
    mkdirSync(join(fixture, 'src'))
    writeFileSync(join(fixture, 'src/index.ts'), 'export const value = 42\n')
    writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify({ include: ['src'], compilerOptions: { composite: true, rootDir: 'src', outDir: 'lib', skipLibCheck: true } }))
    assert.equal(buildTypescript(fixture), 0)
    assert.ok(existsSync(join(fixture, 'tsconfig.tsbuildinfo')))
    rmSync(join(fixture, 'lib'), { recursive: true })
    assert.equal(buildTypescript(fixture), 0)
    assert.match(readFileSync(join(fixture, 'lib/index.js'), 'utf8'), /42/)
    mkdirSync(join(fixture, 'lib/specs/domains'), { recursive: true })
    writeFileSync(join(fixture, 'lib/specs/domains/stale.js'), 'stale')
    assert.equal(buildTypescript(fixture), 0)
    assert.equal(existsSync(join(fixture, 'lib/specs/domains/stale.js')), false)
    assert.ok(existsSync(join(fixture, 'lib/index.d.ts')))
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
