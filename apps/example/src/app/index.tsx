import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileToolkit } from 'react-native-nitro-filetoolkit';

const fileSystem = FileToolkit.getFileSystem();
const exampleFile = fileSystem.location(
  'temporary',
  'nitro-file-toolkit/example.txt',
);

export default function FileToolkitScreen() {
  const [result, setResult] = useState('Ready to exercise the native module.');
  const [isRunning, setIsRunning] = useState(false);

  const runExample = useCallback(async () => {
    setIsRunning(true);
    try {
      const info = await fileSystem.writeText({
        destination: exampleFile,
        text: 'Hello from Expo Router and Nitro!',
        encoding: 'utf-8',
        mode: 'replace',
        atomicity: 'preferred',
        createParentDirectories: true,
      });
      const text = await fileSystem.readText({
        source: exampleFile,
        encoding: 'utf-8',
        maxByteCount: 4_096n,
      });
      const sha256 = await fileSystem.hash({
        source: exampleFile,
        algorithm: 'sha-256',
      });
      setResult(
        [
          `URI: ${info.location.uri}`,
          `Bytes: ${info.byteCount ?? 0n}`,
          `Text: ${text}`,
          `SHA-256: ${sha256}`,
        ].join('\n\n'),
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EXPO SDK 57 · NITRO 0.37</Text>
        </View>
        <Text style={styles.title}>Nitro File Toolkit</Text>
        <Text style={styles.subtitle}>
          A typed Expo Router development-build example using the lazy native
          filesystem factory.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={isRunning}
          onPress={runExample}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isRunning && styles.buttonDisabled,
          ]}>
          {isRunning ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.buttonText}>Run native file round-trip</Text>
          )}
        </Pressable>

        <View style={styles.resultCard}>
          <Text selectable style={styles.resultText}>
            {result}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111827' },
  content: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 18 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgeText: { color: '#064E3B', fontSize: 12, fontWeight: '800' },
  title: { color: '#F9FAFB', fontSize: 38, fontWeight: '800' },
  subtitle: { color: '#CBD5E1', fontSize: 17, lineHeight: 26 },
  button: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#111827', fontSize: 16, fontWeight: '800' },
  resultCard: {
    minHeight: 190,
    borderRadius: 16,
    backgroundColor: '#1F2937',
    padding: 18,
  },
  resultText: {
    color: '#D1FAE5',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
