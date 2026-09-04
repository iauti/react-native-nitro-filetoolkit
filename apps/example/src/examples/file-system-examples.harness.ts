import { afterAll, describe, expect, it } from 'react-native-harness';

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
