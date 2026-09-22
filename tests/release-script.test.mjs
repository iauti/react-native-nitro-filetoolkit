import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function release({ token, ghToken, cliToken = '', cliStatus = 0, withGh = true, fail = '', args = [] } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'filetoolkit-release-'))
  const log = join(dir, 'calls.jsonl')
  const stub = `#!${process.execPath}
const fs = require('node:fs')
const command = require('node:path').basename(process.argv[1])
const args = process.argv.slice(2)
fs.appendFileSync(process.env.CALL_LOG, JSON.stringify({ command, args, cwd: process.cwd(), token: process.env.GITHUB_TOKEN }) + '\\n')
if (command === 'gh') { process.stdout.write(process.env.CLI_TOKEN); process.exit(Number(process.env.CLI_STATUS)) }
const step = args.join(' ') === 'run check:ci' ? 'check' : args[0] === 'release' ? 'package' : 'root'
process.exit(process.env.FAIL_STEP === step ? 7 : 0)
`
  for (const command of withGh ? ['bun', 'gh'] : ['bun']) writeFileSync(join(dir, command), stub, { mode: 0o755 })
  const env = { ...process.env, PATH: `${dir}:/usr/bin:/bin`, CALL_LOG: log, CLI_TOKEN: cliToken, CLI_STATUS: String(cliStatus), FAIL_STEP: fail }
  delete env.GITHUB_TOKEN
  delete env.GH_TOKEN
  if (token !== undefined) env.GITHUB_TOKEN = token
  if (ghToken !== undefined) env.GH_TOKEN = ghToken
  try {
    const result = spawnSync('./scripts/release.sh', args, { cwd: root, env, encoding: 'utf8' })
    const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : []
    return { ...result, calls }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('preflight precedes publication, then root release; arguments stay intact', () => {
  const args = ['patch', '--ci', '--github.releaseName=release with spaces']
  const result = release({ token: 'github-secret', ghToken: 'other-secret', args })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(result.calls.map(({ args }) => args), [['run', 'check:ci'], ['release', ...args], ['run', 'release-it', ...args]])
  assert.equal(result.calls[0].cwd, root)
  assert.equal(result.calls[1].cwd, join(root, 'packages/react-native-nitro-filetoolkit'))
  assert.equal(result.calls[2].cwd, root)
  assert.ok(result.calls.every(({ token }) => token === 'github-secret'))
  assert.doesNotMatch(result.stdout + result.stderr, /github-secret|other-secret/)
})

test('GH_TOKEN is exported as GITHUB_TOKEN without consulting gh', () => {
  const result = release({ ghToken: 'gh-secret' })
  assert.equal(result.status, 0)
  assert.ok(result.calls.every(({ command, token }) => command === 'bun' && token === 'gh-secret'))
  assert.doesNotMatch(result.stdout + result.stderr, /gh-secret/)
})

test('authenticated GitHub CLI supplies the fallback token before preflight', () => {
  const result = release({ cliToken: 'cli-secret\n' })
  assert.equal(result.status, 0)
  assert.deepEqual(result.calls[0].args, ['auth', 'token'])
  assert.ok(result.calls.slice(1).every(({ token }) => token === 'cli-secret'))
  assert.doesNotMatch(result.stdout + result.stderr, /cli-secret/)
})

for (const options of [{ cliStatus: 1 }, { cliToken: '' }, { withGh: false }]) {
  test(`missing authentication stops before quality checks or publication (${JSON.stringify(options)})`, () => {
    const result = release(options)
    assert.notEqual(result.status, 0)
    assert.ok(result.calls.every(({ command }) => command === 'gh'))
  })
}

test('root and package retain separate release responsibilities', () => {
  const workspace = JSON.parse(readFileSync(join(root, '.release-it.json'), 'utf8'))
  const pkg = JSON.parse(readFileSync(join(root, 'packages/react-native-nitro-filetoolkit/.release-it.json'), 'utf8'))
  assert.equal(workspace.npm.publish, false)
  assert.equal(workspace.github.release, true)
  assert.equal(workspace.git.requireCleanWorkingDir, false)
  assert.ok(!Object.values(workspace.hooks).some((hook) => hook.includes('check:ci')))
  assert.equal(pkg.npm.publish, true)
  assert.equal(pkg.github.release, false)
  for (const action of ['commit', 'tag', 'push']) assert.equal(pkg.git[action], false)
})

for (const [fail, count] of [['check', 1], ['package', 2], ['root', 3]]) {
  test(`${fail} failure stops subsequent steps`, () => {
    const result = release({ token: 'test-token', fail })
    assert.equal(result.status, 7)
    assert.equal(result.calls.length, count)
  })
}
