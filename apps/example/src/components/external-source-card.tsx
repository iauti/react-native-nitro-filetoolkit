import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  FileToolkit,
  type FileLocation,
  type FileSourceScheme,
} from 'react-native-nitro-filetoolkit';

const files = FileToolkit.getFileSystem();

interface ImportResult {
  readonly sourceScheme: FileSourceScheme;
  readonly sourceByteCount?: bigint;
  readonly destination: FileLocation;
  readonly importedByteCount?: bigint;
}

const safeFileName = (name: string | undefined) =>
  (name || 'selected-file').replace(/[\\/\0]/g, '_');

export function ExternalSourceCard() {
  const [result, setResult] = useState<ImportResult>();
  const [message, setMessage] = useState(
    'Choose a document to import it into app-owned storage.',
  );
  const [isBusy, setIsBusy] = useState(false);
  const canChooseDocument = !isBusy && result === undefined;

  const pickAndImport = useCallback(async () => {
    setIsBusy(true);
    setMessage('Opening document picker…');

    try {
      const pickerResult = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: Platform.OS === 'ios',
        multiple: false,
      });
      if (pickerResult.canceled) {
        setMessage('Selection canceled.');
        return;
      }

      const asset = pickerResult.assets[0];
      if (asset === undefined) {
        setMessage('The picker returned no document.');
        return;
      }

      const source = files.sourceFromUri(asset.uri);
      const sourceInfo = await files.inspectSource(source);
      if (sourceInfo === undefined) {
        throw new Error('Selected source is unavailable.');
      }

      const destination = files.location(
        'documents',
        `imports/${Date.now()}-${safeFileName(asset.name)}`,
      );
      const imported = await files.importFile({
        source,
        destination,
        collision: 'fail',
        atomicity: 'preferred',
      });

      setResult({
        sourceScheme: source.scheme,
        sourceByteCount: sourceInfo.byteCount,
        destination: imported.location,
        importedByteCount: imported.byteCount,
      });
      setMessage('Document imported successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }, []);

  const cleanup = useCallback(async () => {
    if (result === undefined) return;
    setIsBusy(true);
    try {
      await files.remove({
        location: result.destination,
        recursive: false,
        missing: 'ignore',
      });
      setResult(undefined);
      setMessage('Imported document removed.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsBusy(false);
    }
  }, [result]);

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text style={styles.title}>Import an external document</Text>
        <Text style={styles.summary}>
          Exercises Android content URIs and iOS picker file URLs.
        </Text>
      </View>

      <View style={styles.details}>
        <Text style={styles.message}>{message}</Text>
        {result === undefined ? null : (
          <>
            <Text style={styles.detail}>Source: {result.sourceScheme}</Text>
            <Text style={styles.detail}>
              Reported source size:{' '}
              {result.sourceByteCount?.toString() ?? 'Unknown'} bytes
            </Text>
            <Text selectable style={styles.detail}>
              Destination: {result.destination.uri}
            </Text>
            <Text style={styles.detail}>
              Imported size: {result.importedByteCount?.toString() ?? 'Unknown'} bytes
            </Text>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isBusy, disabled: !canChooseDocument }}
          disabled={!canChooseDocument}
          onPress={() => void pickAndImport()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            !canChooseDocument && styles.buttonDisabled,
          ]}>
          {isBusy ? (
            <ActivityIndicator color="#052e2b" />
          ) : (
            <Text style={styles.primaryButtonText}>Choose document</Text>
          )}
        </Pressable>
        {result === undefined ? null : (
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void cleanup()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
              isBusy && styles.buttonDisabled,
            ]}>
            <Text style={styles.secondaryButtonText}>Remove import</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#065f46',
    backgroundColor: '#132e2a',
    padding: 18,
  },
  heading: { gap: 6 },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  summary: { color: '#a7f3d0', fontSize: 14, lineHeight: 20 },
  details: { gap: 5 },
  message: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  detail: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#6ee7b7',
    paddingHorizontal: 16,
  },
  primaryButtonText: { color: '#052e2b', fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#64748b',
    paddingHorizontal: 16,
  },
  secondaryButtonText: { color: '#e2e8f0', fontSize: 15, fontWeight: '800' },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.55 },
});
