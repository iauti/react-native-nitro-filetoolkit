# Example Filesystem Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generated Expo tabs with one focused screen containing four runnable native filesystem examples.

**Architecture:** Keep Expo Router as a single-route stack. Put native workflows and formatting in one example-domain module, while small presentational components render actions and results; the route owns only execution state and composition. Exercise workflows through the existing iOS Harness and guard starter-code removal with a structural Node check.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, TypeScript 6, Nitro Modules 0.37, React Native Harness 1.4.

---

## File Map

- Create `apps/example/src/examples/file-system-examples.ts`: native workflow definitions and result formatting.
- Create `apps/example/src/examples/file-system-examples.harness.ts`: end-to-end native workflow coverage.
- Create `apps/example/src/components/example-card.tsx`: accessible workflow action card.
- Create `apps/example/src/components/result-console.tsx`: selectable status and output panel.
- Create `apps/example/scripts/verify-example-structure.mjs`: regression check for the single-route structure.
- Modify `apps/example/src/app/index.tsx`: compose the playground and coordinate execution state.
- Modify `apps/example/src/app/index.web.tsx`: retain a focused native-only explanation with matching branding.
- Modify `apps/example/src/app/_layout.tsx`: replace tab navigation with a headerless Router stack.
- Modify `apps/example/package.json`: expose the structural verification command.
- Delete `apps/example/src/app/explore.tsx`: remove generated starter route.
- Delete `apps/example/src/components/app-tabs.tsx` and `app-tabs.web.tsx`: remove tab navigation.
- Delete the exact generated component, hook, theme, CSS-module typing, tutorial, logo, badge, and tab-icon files listed in Task 3 after confirming they have no external references.

### Task 1: Native filesystem workflows

**Files:**
- Create: `apps/example/src/examples/file-system-examples.harness.ts`
- Create: `apps/example/src/examples/file-system-examples.ts`

- [ ] **Step 1: Write the failing native workflow test**

Create `apps/example/src/examples/file-system-examples.harness.ts`:

```ts
import { fileSystemExamples } from './file-system-examples';

describe('filesystem examples', () => {
  afterAll(async () => {
    await fileSystemExamples.cleanup.run();
  });

  it('round-trips UTF-8 text', async () => {
    await expect(fileSystemExamples.text.run()).resolves.toContain(
      'Hello from Expo Router and Nitro!',
    );
  });

  it('creates and lists two files', async () => {
    const output = await fileSystemExamples.directory.run();
    expect(output).toContain('alpha.txt');
    expect(output).toContain('beta.txt');
  });

  it('preserves the hash across copy and move', async () => {
    await expect(fileSystemExamples.operations.run()).resolves.toContain(
      'Hashes match: yes',
    );
  });

  it('reports storage and removes only the example workspace', async () => {
    const output = await fileSystemExamples.cleanup.run();
    expect(output).toContain('Available:');
    expect(output).toContain('Workspace removed: yes');
  });
});
```

- [ ] **Step 2: Run the Harness test and verify it fails**

Run from `apps/example`:

```bash
RN_HARNESS_DEBUG_USE_WATCHMAN=0 bun run harness -- --harnessRunner ios --no-watchman
```

Expected: FAIL because `./file-system-examples` does not exist.

- [ ] **Step 3: Implement the workflow module**

Create `apps/example/src/examples/file-system-examples.ts`:

```ts
import { FileToolkit } from 'react-native-nitro-filetoolkit';

export type FileSystemExampleId =
  | 'text'
  | 'directory'
  | 'operations'
  | 'cleanup';

export interface FileSystemExample {
  readonly id: FileSystemExampleId;
  readonly title: string;
  readonly summary: string;
  run(): Promise<string>;
}

const fileSystem = FileToolkit.getFileSystem();
const workspacePath = 'nitro-file-toolkit/examples';
const workspace = fileSystem.location('temporary', workspacePath);

const location = (relativePath: string) =>
  fileSystem.location('temporary', `${workspacePath}/${relativePath}`);

const removeWorkspace = () =>
  fileSystem.remove({
    location: workspace,
    recursive: true,
    missing: 'ignore',
  });

const writeText = (relativePath: string, text: string) =>
  fileSystem.writeText({
    destination: location(relativePath),
    text,
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'preferred',
    createParentDirectories: true,
  });

const formatBytes = (value: bigint): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let size = Number(value);
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const text: FileSystemExample = {
  id: 'text',
  title: 'Text round-trip',
  summary: 'Write, read, and inspect a UTF-8 file.',
  async run() {
    const content = 'Hello from Expo Router and Nitro!';
    const info = await writeText('text/hello.txt', content);
    const read = await fileSystem.readText({
      source: info.location,
      encoding: 'utf-8',
      maxByteCount: 4_096n,
    });
    const metadata = await fileSystem.stat(info.location);
    return [
      `URI: ${info.location.uri}`,
      `Bytes: ${metadata?.byteCount ?? 0n}`,
      `Text: ${read}`,
    ].join('\n');
  },
};

const directory: FileSystemExample = {
  id: 'directory',
  title: 'Directories and listing',
  summary: 'Create files and inspect typed directory entries.',
  async run() {
    const directoryLocation = location('listing');
    await fileSystem.remove({
      location: directoryLocation,
      recursive: true,
      missing: 'ignore',
    });
    await fileSystem.createDirectory({
      location: directoryLocation,
      createParentDirectories: true,
    });
    await writeText('listing/alpha.txt', 'alpha');
    await writeText('listing/beta.txt', 'beta');
    const page = await fileSystem.list({
      directory: directoryLocation,
      maxEntryCount: 20n,
      recursive: false,
    });
    const entries = [...page.items]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((item) =>
        `${item.name} · ${item.kind} · ${item.byteCount ?? 0n} bytes`,
      );
    return [`Entries: ${page.items.length}`, ...entries].join('\n');
  },
};

const operations: FileSystemExample = {
  id: 'operations',
  title: 'Copy, move, and hash',
  summary: 'Verify file content survives common operations.',
  async run() {
    const source = (await writeText('operations/source.txt', 'Nitro stays fast.'))
      .location;
    const copied = location('operations/copied.txt');
    const moved = location('operations/moved.txt');
    await fileSystem.copy({
      source,
      destination: copied,
      collision: 'replace',
      atomicity: 'preferred',
      followSymbolicLinks: false,
    });
    await fileSystem.move({
      source: copied,
      destination: moved,
      collision: 'replace',
      atomicity: 'preferred',
    });
    const sourceHash = await fileSystem.hash({
      source,
      algorithm: 'sha-256',
    });
    const movedHash = await fileSystem.hash({
      source: moved,
      algorithm: 'sha-256',
    });
    return [
      `Source SHA-256: ${sourceHash}`,
      `Moved SHA-256: ${movedHash}`,
      `Hashes match: ${sourceHash === movedHash ? 'yes' : 'no'}`,
    ].join('\n');
  },
};

const cleanup: FileSystemExample = {
  id: 'cleanup',
  title: 'Storage and cleanup',
  summary: 'Inspect disk space and remove the isolated workspace.',
  async run() {
    const disk = await fileSystem.getDiskSpace('temporary');
    await removeWorkspace();
    const remaining = await fileSystem.stat(workspace);
    return [
      `Available: ${formatBytes(disk.availableByteCount)}`,
      `Total: ${formatBytes(disk.totalByteCount)}`,
      `Workspace removed: ${remaining === undefined ? 'yes' : 'no'}`,
    ].join('\n');
  },
};

export const fileSystemExamples = {
  text,
  directory,
  operations,
  cleanup,
} as const satisfies Record<FileSystemExampleId, FileSystemExample>;

export const fileSystemExampleList = Object.values(fileSystemExamples);
```

- [ ] **Step 4: Run the native tests and typecheck**

```bash
cd apps/example
RN_HARNESS_DEBUG_USE_WATCHMAN=0 bun run harness -- --harnessRunner ios --no-watchman
bun run typecheck
```

Expected: both Harness files pass and TypeScript exits 0.

- [ ] **Step 5: Commit the workflow slice**

```bash
git add apps/example/src/examples/file-system-examples.ts apps/example/src/examples/file-system-examples.harness.ts
git commit -m "feat(example): add filesystem workflows"
```

### Task 2: Playground components and route

**Files:**
- Create: `apps/example/src/components/example-card.tsx`
- Create: `apps/example/src/components/result-console.tsx`
- Modify: `apps/example/src/app/index.tsx`
- Modify: `apps/example/src/app/index.web.tsx`

- [ ] **Step 1: Add imports for components that do not exist yet**

Prepend these imports to `apps/example/src/app/index.tsx`:

```tsx
import { ExampleCard } from '@/components/example-card';
import { ResultConsole, type ResultStatus } from '@/components/result-console';
```

- [ ] **Step 2: Run typecheck and verify it fails**

```bash
bun run --cwd apps/example typecheck
```

Expected: FAIL with unresolved modules for `example-card` and `result-console`.

- [ ] **Step 3: Create the action card**

Create `apps/example/src/components/example-card.tsx`:

```tsx
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

interface ExampleCardProps {
  readonly title: string;
  readonly summary: string;
  readonly isRunning: boolean;
  readonly disabled: boolean;
  readonly onRun: () => void;
}

export function ExampleCard({
  title,
  summary,
  isRunning,
  disabled,
  onRun,
}: ExampleCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>
      <Pressable
        accessibilityLabel={`Run ${title} example`}
        accessibilityRole="button"
        accessibilityState={{ busy: isRunning, disabled }}
        disabled={disabled}
        onPress={onRun}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}>
        {isRunning ? (
          <ActivityIndicator color="#052e2b" />
        ) : (
          <Text style={styles.buttonText}>Run</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
    padding: 18,
  },
  copy: { flex: 1, gap: 6 },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  summary: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
  button: {
    minWidth: 68,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#6ee7b7',
    paddingHorizontal: 16,
  },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: '#052e2b', fontSize: 15, fontWeight: '900' },
});
```

- [ ] **Step 4: Create the result console**

Create `apps/example/src/components/result-console.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';

export type ResultStatus = 'ready' | 'running' | 'success' | 'error';

interface ResultConsoleProps {
  readonly status: ResultStatus;
  readonly output: string;
}

const labels: Record<ResultStatus, string> = {
  ready: 'READY',
  running: 'RUNNING',
  success: 'SUCCESS',
  error: 'ERROR',
};

export function ResultConsole({ status, output }: ResultConsoleProps) {
  return (
    <View
      accessibilityLabel={`Example result: ${labels[status].toLowerCase()}`}
      accessibilityLiveRegion="polite"
      style={styles.console}>
      <Text style={[styles.label, status === 'error' && styles.errorLabel]}>
        {labels[status]}
      </Text>
      <Text selectable style={styles.output}>
        {output}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  console: {
    minHeight: 170,
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#020617',
    padding: 18,
  },
  label: { color: '#6ee7b7', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  errorLabel: { color: '#fca5a5' },
  output: { color: '#d1fae5', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
});
```

- [ ] **Step 5: Compose the native playground route**

Use this complete content for `apps/example/src/app/index.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExampleCard } from '@/components/example-card';
import { ResultConsole, type ResultStatus } from '@/components/result-console';
import {
  fileSystemExampleList,
  type FileSystemExample,
  type FileSystemExampleId,
} from '@/examples/file-system-examples';

export default function FileToolkitScreen() {
  const [activeExample, setActiveExample] = useState<FileSystemExampleId>();
  const [status, setStatus] = useState<ResultStatus>('ready');
  const [output, setOutput] = useState('Choose an example to run native Swift or Kotlin code.');

  const runExample = useCallback(async (example: FileSystemExample) => {
    setActiveExample(example.id);
    setStatus('running');
    setOutput(`Running ${example.title}…`);
    try {
      setOutput(await example.run());
      setStatus('success');
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error));
      setStatus('error');
    } finally {
      setActiveExample(undefined);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>EXPO SDK 57 · NITRO 0.37</Text>
          <Text style={styles.title}>Filesystem playground</Text>
          <Text style={styles.subtitle}>
            Run focused native operations and inspect their typed results.
          </Text>
        </View>

        <View style={styles.examples}>
          {fileSystemExampleList.map((example) => (
            <ExampleCard
              key={example.id}
              title={example.title}
              summary={example.summary}
              isRunning={activeExample === example.id}
              disabled={activeExample !== undefined}
              onRun={() => void runExample(example)}
            />
          ))}
        </View>

        <ResultConsole status={status} output={output} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: 20, padding: 24 },
  header: { gap: 8, marginBottom: 4 },
  eyebrow: { color: '#6ee7b7', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#f8fafc', fontSize: 36, lineHeight: 42, fontWeight: '900' },
  subtitle: { maxWidth: 520, color: '#cbd5e1', fontSize: 16, lineHeight: 24 },
  examples: { gap: 12 },
});
```

- [ ] **Step 6: Refresh the native-only web route**

Keep `apps/example/src/app/index.web.tsx` native-safe and tab-free:

```tsx
import { StyleSheet, Text, View } from 'react-native';

export default function WebUnsupportedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>NITRO FILE TOOLKIT</Text>
      <Text style={styles.title}>Filesystem playground</Text>
      <Text style={styles.body}>
        These examples execute native Swift and Kotlin filesystem code. Run the
        iOS or Android development build to use the playground.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: 12, padding: 32, backgroundColor: '#0f172a' },
  eyebrow: { color: '#6ee7b7', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#f8fafc', fontSize: 38, fontWeight: '900' },
  body: { maxWidth: 560, color: '#cbd5e1', fontSize: 17, lineHeight: 26 },
});
```

- [ ] **Step 7: Verify the route compiles and lint passes**

```bash
bun run --cwd apps/example typecheck
bun run --cwd apps/example lint
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit the screen slice**

```bash
git add apps/example/src/app/index.tsx apps/example/src/app/index.web.tsx apps/example/src/components/example-card.tsx apps/example/src/components/result-console.tsx
git commit -m "feat(example): add filesystem playground"
```

### Task 3: Remove starter tabs and unused template code

**Files:**
- Create: `apps/example/scripts/verify-example-structure.mjs`
- Modify: `apps/example/src/app/_layout.tsx`
- Modify: `apps/example/package.json`
- Delete: `apps/example/src/app/explore.tsx`
- Delete: `apps/example/src/components/app-tabs.tsx`
- Delete: `apps/example/src/components/app-tabs.web.tsx`
- Delete: the exact starter-only files enumerated in Steps 4 and 5

- [ ] **Step 1: Add a failing structural verification script**

Create `apps/example/scripts/verify-example-structure.mjs`:

```js
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('..', import.meta.url));
const relative = (path) => `${appRoot}/${path}`;

assert.equal(existsSync(relative('src/app/explore.tsx')), false, 'starter Explore route must be removed');
assert.equal(existsSync(relative('src/components/app-tabs.tsx')), false, 'native tabs must be removed');
assert.equal(existsSync(relative('src/components/app-tabs.web.tsx')), false, 'web tabs must be removed');

const layout = readFileSync(relative('src/app/_layout.tsx'), 'utf8');
assert.match(layout, /<Stack/);
assert.doesNotMatch(layout, /AppTabs|NativeTabs|TabList/);

console.log('Example uses one Router stack with no starter tabs.');
```

Add this script to `apps/example/package.json`:

```json
"verify:structure": "node ./scripts/verify-example-structure.mjs"
```

- [ ] **Step 2: Run the structural check and verify it fails**

```bash
bun run --cwd apps/example verify:structure
```

Expected: FAIL because `src/app/explore.tsx` and the tab components still exist.

- [ ] **Step 3: Replace the tab layout with a Router stack**

Replace `apps/example/src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" />
    </>
  );
}
```

- [ ] **Step 4: Remove the generated route and tab components**

Delete these exact files:

```text
apps/example/src/app/explore.tsx
apps/example/src/components/app-tabs.tsx
apps/example/src/components/app-tabs.web.tsx
apps/example/assets/images/tabIcons/explore.png
apps/example/assets/images/tabIcons/explore@2x.png
apps/example/assets/images/tabIcons/explore@3x.png
apps/example/assets/images/tabIcons/home.png
apps/example/assets/images/tabIcons/home@2x.png
apps/example/assets/images/tabIcons/home@3x.png
```

- [ ] **Step 5: Confirm and remove the remaining starter-only files**

Run:

```bash
rg -n "animated-icon|external-link|hint-row|themed-text|themed-view|collapsible|web-badge|constants/theme|hooks/use-theme|use-color-scheme" apps/example/src
```

Expected before deletion: references exist only within the starter-only component cluster. Delete these exact files with `apply_patch`:

```text
apps/example/src/components/animated-icon.module.css
apps/example/src/components/animated-icon.tsx
apps/example/src/components/animated-icon.web.tsx
apps/example/src/components/external-link.tsx
apps/example/src/components/hint-row.tsx
apps/example/src/components/themed-text.tsx
apps/example/src/components/themed-view.tsx
apps/example/src/components/ui/collapsible.tsx
apps/example/src/components/web-badge.tsx
apps/example/src/constants/theme.ts
apps/example/src/global.css
apps/example/src/hooks/use-color-scheme.ts
apps/example/src/hooks/use-color-scheme.web.ts
apps/example/src/hooks/use-theme.ts
apps/example/src/types/styles.d.ts
apps/example/assets/images/expo-badge-white.png
apps/example/assets/images/expo-badge.png
apps/example/assets/images/expo-logo.png
apps/example/assets/images/logo-glow.png
apps/example/assets/images/react-logo.png
apps/example/assets/images/react-logo@2x.png
apps/example/assets/images/react-logo@3x.png
apps/example/assets/images/tutorial-web.png
```

Retain the app icon, splash icon, favicon, Android adaptive icons, and iOS `.expo.icon` asset because `app.config.ts` references them.

- [ ] **Step 6: Run structural, type, and lint checks**

```bash
bun run --cwd apps/example verify:structure
bun run --cwd apps/example typecheck
bun run --cwd apps/example lint
```

Expected: structural script prints `Example uses one Router stack with no starter tabs.`; other commands exit 0.

- [ ] **Step 7: Commit the cleanup slice**

```bash
git add apps/example/package.json apps/example/src apps/example/assets/images/tabIcons apps/example/scripts/verify-example-structure.mjs
git commit -m "refactor(example): remove starter tabs"
```

### Task 4: End-to-end verification

**Files:**
- Verify only; fix the smallest responsible file if any check fails.

- [ ] **Step 1: Run repository quality checks**

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run specs
```

Expected: all commands exit 0 and Nitrogen reports all HybridObjects generated.

- [ ] **Step 2: Verify Expo dependencies and Router configuration**

```bash
cd apps/example
bunx expo@latest install --check
bunx expo@latest config --type public --json
```

Expected: dependencies are up to date; config reports SDK 57, the `expo-router` plugin, and typed routes.

- [ ] **Step 3: Export the Router application**

```bash
cd apps/example
bunx expo@latest export --platform ios --output-dir /private/tmp/nitro-filetoolkit-playground-export --clear
```

Expected: iOS bundle succeeds from `node_modules/expo-router/entry.js` and reports `Using src/app as the root directory for Expo Router.`

- [ ] **Step 4: Run the complete native Harness suite**

```bash
cd apps/example
RN_HARNESS_DEBUG_USE_WATCHMAN=0 bun run harness -- --harnessRunner ios --no-watchman
```

Expected: both existing filesystem contract tests and the four playground workflow tests pass.

- [ ] **Step 5: Inspect the final diff**

```bash
git status --short
git diff --check
git diff --stat HEAD~3
```

Expected: no whitespace errors, no `.superpowers/` session files staged, and only the approved example, Router/Harness configuration, lockfile, docs, and generated-code changes appear.
