import { afterEach, describe, expect, it } from 'react-native-harness';
import { Platform } from 'react-native';
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
    expect(() => files.fromUri('file:///tmp/invalid-%FF.txt')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/invalid-%C3%28.txt')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(() => files.fromUri('file:///tmp/raw-café.txt')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    expect(files.fromUri('file:///tmp/valid%20name.txt').uri).toBe(
      'file:///tmp/valid%20name.txt',
    );
    expect(files.fromUri('file:///tmp/valid-caf%C3%A9.txt').uri).toBe(
      'file:///tmp/valid-caf%C3%A9.txt',
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

  it('validates and inspects a local file source', async () => {
    const location = files.location(
      'temporary',
      'file-toolkit-harness/source-info.txt',
    );
    await files.writeText({
      destination: location,
      text: 'source',
      encoding: 'utf-8',
      mode: 'replace',
      atomicity: 'preferred',
      createParentDirectories: true,
    });

    const source = files.sourceFromUri(location.uri);
    expect(source).toEqual({ scheme: 'file', uri: location.uri });
    const info = await files.inspectSource(source);
    expect(info?.source).toEqual(source);
    expect(info?.byteCount).toBe(6n);
    expect(info?.name).toBe('source-info.txt');
    expect(
      await files.inspectSource(
        files.sourceFromUri(
          files.location(
            'temporary',
            'file-toolkit-harness/missing.txt',
          ).uri,
        ),
      ),
    ).toBeUndefined();
  });

  it('rejects unsupported and forged file sources', async () => {
    expect(() => files.sourceFromUri('https://example.com/file')).toThrow(
      '[file-toolkit/invalid-location]',
    );
    await expect(
      files.inspectSource({ scheme: 'content', uri: 'file:///tmp/file.txt' }),
    ).rejects.toThrow('[file-toolkit/invalid-location]');
  });

  it('imports a multi-buffer source with explicit collision behavior', async () => {
    const sourceLocation = files.location(
      'temporary',
      'file-toolkit-harness/import-source.txt',
    );
    const destination = files.location(
      'temporary',
      'file-toolkit-harness/imported.txt',
    );
    const payload = 'source-data-'.repeat(16_384);
    await files.writeText({
      destination: sourceLocation,
      text: payload,
      encoding: 'utf-8',
      mode: 'replace',
      atomicity: 'preferred',
      createParentDirectories: true,
    });
    const source = files.sourceFromUri(sourceLocation.uri);

    const imported = await files.importFile({
      source,
      destination,
      collision: 'fail',
      atomicity: 'preferred',
    });
    expect(imported.byteCount).toBe(BigInt(payload.length));
    expect(await files.hash({ source: destination, algorithm: 'sha-256' })).toBe(
      await files.hash({ source: sourceLocation, algorithm: 'sha-256' }),
    );

    await files.writeText({
      destination,
      text: 'preserve-me',
      encoding: 'utf-8',
      mode: 'replace',
      atomicity: 'preferred',
      createParentDirectories: true,
    });
    await expect(
      files.importFile({
        source,
        destination,
        collision: 'fail',
        atomicity: 'preferred',
      }),
    ).rejects.toThrow('[file-toolkit/invalid-operation]');
    expect(
      await files.readText({
        source: destination,
        encoding: 'utf-8',
        maxByteCount: 32n,
      }),
    ).toBe('preserve-me');

    const replaced = await files.importFile({
      source,
      destination,
      collision: 'replace',
      atomicity: 'preferred',
    });
    expect(replaced.byteCount).toBe(BigInt(payload.length));
    expect(await files.hash({ source: destination, algorithm: 'sha-256' })).toBe(
      await files.hash({ source: sourceLocation, algorithm: 'sha-256' }),
    );

    const page = await files.list({
      directory: testRoot,
      recursive: false,
      maxEntryCount: 100n,
    });
    expect(
      page.items.some(item => item.name.startsWith('.nitro-filetoolkit-')),
    ).toBe(false);
  });

  it('canonicalizes Android content source schemes', () => {
    if (Platform.OS !== 'android') return;

    expect(files.sourceFromUri('CONTENT://documents/report')).toEqual({
      scheme: 'content',
      uri: 'content://documents/report',
    });
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
