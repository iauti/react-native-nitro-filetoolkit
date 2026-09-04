import { afterEach, describe, expect, it } from 'react-native-harness';
import { FileToolkit } from 'react-native-nitro-filetoolkit';

const files = FileToolkit.getFileSystem();
const testRoot = files.location('temporary', 'file-toolkit-harness');

afterEach(async () => {
  await files.remove({
    location: testRoot,
    recursive: true,
    missing: 'ignore',
  });
});

describe('FileToolkit filesystem', () => {
  it('memoizes the lazily created filesystem', () => {
    expect(FileToolkit.getFileSystem()).toBe(files);
  });

  it('constructs contained locations and rejects traversal', () => {
    const location = files.location('documents', 'reports/annual.pdf');
    expect(location.origin).toBe('managed');
    expect(location.uri.startsWith('file://')).toBe(true);
    expect(files.fromUri(location.uri).origin).toBe('uri');
    expect(() => files.location('documents', '../outside.txt')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('https://example.com/a')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/%')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/raw space.txt')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/file.txt?download=1')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/file.txt#fragment')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/encoded%2Fseparator')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/encoded%5Cseparator')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/encoded%00nul')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(files.fromUri('file:///tmp/valid%20name.txt').uri).toBe(
      'file:///tmp/valid%20name.txt',
    );
  });

  it('returns managed roots and canonical local file URIs', () => {
    const managedDirectories = [
      'cache',
      'documents',
      'downloads',
      'temporary',
      'application-support',
    ] as const;
    const roots = managedDirectories.map(directory => files.root(directory));
    const documents = files.root('documents');
    const document = files.location('documents', 'reports/annual.pdf');

    for (const root of roots) {
      expect(root.origin).toBe('managed');
      expect(root.uri.startsWith('file:///')).toBe(true);
    }
    expect(
      document.uri.startsWith(documents.uri.replace(/\/$/, '') + '/'),
    ).toBe(true);
  });

  it('does not create managed roots during path-only operations', async () => {
    const downloads = files.root('downloads');
    await files.remove({
      location: downloads,
      recursive: true,
      missing: 'ignore',
    });

    const child = files.location('downloads', 'missing.txt');
    expect(await files.stat(downloads)).toBeUndefined();
    expect(await files.stat(child)).toBeUndefined();
    const cleared = await files.clearManagedDirectory({
      directory: 'downloads',
      recursive: true,
    });
    expect(cleared.removedEntryCount).toBe(0n);
    expect(cleared.reclaimedByteCount).toBe(0n);
    expect((await files.getDiskSpace('downloads')).totalByteCount > 0n).toBe(
      true,
    );
    expect(await files.stat(downloads)).toBeUndefined();
  });

  it('writes, reads, lists, hashes, copies, moves, and removes files', async () => {
    const source = files.location('temporary', 'file-toolkit-harness/source.txt');
    const copy = files.location('temporary', 'file-toolkit-harness/copy.txt');
    const moved = files.location('temporary', 'file-toolkit-harness/moved.txt');

    await files.writeText({
      destination: source,
      text: 'hello',
      encoding: 'utf-8',
      mode: 'replace',
      atomicity: 'preferred',
      createParentDirectories: true,
    });
    expect(
      await files.readText({ source, encoding: 'utf-8', maxByteCount: 5n }),
    ).toBe('hello');
    await expect(
      files.readText({ source, encoding: 'utf-8', maxByteCount: 4n }),
    ).rejects.toThrow('[file-toolkit/resource-limit]');

    const info = await files.stat(source);
    expect(info?.kind).toBe('file');
    expect(info?.byteCount).toBe(5n);
    expect(await files.hash({ source, algorithm: 'sha-256' })).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );

    await files.copy({
      source,
      destination: copy,
      collision: 'fail',
      atomicity: 'preferred',
      followSymbolicLinks: false,
    });
    await files.move({
      source: copy,
      destination: moved,
      collision: 'fail',
      atomicity: 'preferred',
    });
    const page = await files.list({
      directory: testRoot,
      maxEntryCount: 20n,
      recursive: false,
    });
    expect(page.items.map(item => item.name).sort()).toEqual([
      'moved.txt',
      'source.txt',
    ]);
    await files.remove({ location: moved, recursive: false, missing: 'fail' });
    expect(await files.stat(moved)).toBeUndefined();
  });

  it('streams bounded bytes through explicit handles', async () => {
    const destination = files.location(
      'temporary',
      'file-toolkit-harness/stream.bin',
    );
    const writer = await files.openWriter({
      destination,
      mode: 'replace',
      atomicity: 'preferred',
      createParentDirectories: true,
    });
    await writer.write(new Uint8Array([1, 2, 3, 4]).buffer);
    expect(writer.position).toBe(4n);
    await writer.commit();
    writer.close();

    const reader = await files.openReader(destination);
    await reader.seek(1n);
    const chunk = await reader.read(2n);
    expect(Array.from(new Uint8Array(chunk.data))).toEqual([2, 3]);
    expect(chunk.isEndOfFile).toBe(false);
    reader.close();
  });
});
