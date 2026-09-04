import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
