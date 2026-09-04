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
  label: {
    color: '#6ee7b7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  errorLabel: { color: '#fca5a5' },
  output: {
    color: '#d1fae5',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
});
