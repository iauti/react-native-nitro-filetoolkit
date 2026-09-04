import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse } from 'yaml'

const readYaml = async (path) => parse(await readFile(path, 'utf8'))

test('issue forms collect actionable bug and API proposal details', async () => {
  const bug = await readYaml('.github/ISSUE_TEMPLATE/bug_report.yml')
  const feature = await readYaml('.github/ISSUE_TEMPLATE/feature_request.yml')

  assert.equal(bug.name, 'Bug report')
  assert.ok(bug.labels.includes('bug'))
  assert.deepEqual(
    bug.body.find(({ id }) => id === 'platforms').attributes.options,
    ['iOS', 'Android'],
  )
  for (const id of ['description', 'reproduction', 'versions', 'logs']) {
    assert.ok(bug.body.some((item) => item.id === id), `missing bug field: ${id}`)
  }

  assert.equal(feature.name, 'Feature or API proposal')
  assert.ok(feature.labels.includes('enhancement'))
  for (const id of ['problem', 'proposal', 'api', 'alternatives', 'platforms']) {
    assert.ok(
      feature.body.some((item) => item.id === id),
      `missing feature field: ${id}`,
    )
  }
})

test('issue configuration directs private security reports correctly', async () => {
  const config = await readYaml('.github/ISSUE_TEMPLATE/config.yml')

  assert.equal(config.blank_issues_enabled, false)
  assert.ok(
    config.contact_links.some(
      ({ url }) =>
        url ===
        'https://github.com/iauti/react-native-nitro-filetoolkit/security/advisories/new',
    ),
  )
})

test('pull requests document scope, testing, and release impact', async () => {
  const template = await readFile('.github/PULL_REQUEST_TEMPLATE.md', 'utf8')

  for (const heading of ['## Summary', '## Test plan', '## Release impact']) {
    assert.ok(template.includes(heading), `missing PR section: ${heading}`)
  }
  assert.match(template, /bun run check:ci/)
  assert.match(template, /iOS/)
  assert.match(template, /Android/)
})
