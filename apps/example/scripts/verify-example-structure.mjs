import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const relative = (path) => `${appRoot}/${path}`;

assert.equal(
  existsSync(relative('src/app/explore.tsx')),
  false,
  'starter Explore route must be removed',
);
assert.equal(
  existsSync(relative('src/components/app-tabs.tsx')),
  false,
  'native tabs must be removed',
);
assert.equal(
  existsSync(relative('src/components/app-tabs.web.tsx')),
  false,
  'web tabs must be removed',
);

const layout = readFileSync(relative('src/app/_layout.tsx'), 'utf8');
assert.match(layout, /<Stack/);
assert.doesNotMatch(layout, /AppTabs|NativeTabs|TabList/);

console.log('Example uses one Router stack with no starter tabs.');
