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
      .map(
        (item) =>
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
    const source = (
      await writeText('operations/source.txt', 'Nitro stays fast.')
    ).location;
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
