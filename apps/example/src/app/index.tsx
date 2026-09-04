import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExampleCard } from '@/components/example-card';
import { ExternalSourceCard } from '@/components/external-source-card';
import {
  ResultConsole,
  type ResultStatus,
} from '@/components/result-console';
import {
  fileSystemExampleList,
  type FileSystemExample,
  type FileSystemExampleId,
} from '@/examples/file-system-examples';

export default function FileToolkitScreen() {
  const [activeExample, setActiveExample] = useState<FileSystemExampleId>();
  const [status, setStatus] = useState<ResultStatus>('ready');
  const [output, setOutput] = useState(
    'Choose an example to run native Swift or Kotlin code.',
  );

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

        <ExternalSourceCard />

        <ResultConsole status={status} output={output} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: 20,
    padding: 24,
  },
  header: { gap: 8, marginBottom: 4 },
  eyebrow: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: '#f8fafc',
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  subtitle: {
    maxWidth: 520,
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
  },
  examples: { gap: 12 },
});
