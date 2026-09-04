import { FileToolkit } from '../src/index'

export async function documentedTextWorkflow() {
  const files = FileToolkit.getFileSystem()
  const report = files.location('documents', 'reports/annual.txt')

  await files.writeText({
    destination: report,
    text: 'Annual report',
    encoding: 'utf-8',
    mode: 'replace',
    atomicity: 'preferred',
    createParentDirectories: true,
  })

  const contents = await files.readText({
    source: report,
    encoding: 'utf-8',
    maxByteCount: 1_048_576n,
  })
  const info = await files.stat(report)
  const digest = await files.hash({ source: report, algorithm: 'sha-256' })
  return { contents, info, digest }
}

export async function documentedStreamingWorkflow(): Promise<void> {
  const files = FileToolkit.getFileSystem()
  const source = files.location('cache', 'input.bin')
  const destination = files.location('documents', 'output.bin')
  const reader = await files.openReader(source)
  const writer = await files.openWriter({
    destination,
    mode: 'replace',
    atomicity: 'preferred',
    createParentDirectories: true,
  })

  try {
    while (true) {
      const chunk = await reader.read(64n * 1024n)
      if (chunk.data.byteLength > 0) await writer.write(chunk.data)
      if (chunk.isEndOfFile) break
    }
    await writer.commit()
  } catch (error) {
    await writer.abort()
    throw error
  } finally {
    reader.close()
    writer.close()
  }
}

export async function documentedImportWorkflow(uri: string) {
  const files = FileToolkit.getFileSystem()
  const source = files.sourceFromUri(uri)
  const sourceInfo = await files.inspectSource(source)
  if (sourceInfo === undefined) throw new Error('The selected file is unavailable')

  if (sourceInfo.byteCount === undefined) {
    // Import first, then use the returned local FileInfo.byteCount.
  }

  return files.importFile({
    source,
    destination: files.location('documents', 'imports/report.bin'),
    collision: 'replace',
    atomicity: 'preferred',
  })
}
