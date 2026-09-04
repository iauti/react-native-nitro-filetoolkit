import { StyleSheet, Text, View } from 'react-native';

export default function WebUnsupportedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>NITRO FILE TOOLKIT</Text>
      <Text style={styles.title}>Filesystem playground</Text>
      <Text style={styles.body}>
        These examples execute native Swift and Kotlin filesystem code. Run the
        iOS or Android development build to use the playground.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: '#0f172a',
  },
  eyebrow: {
    color: '#6ee7b7',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: { color: '#f8fafc', fontSize: 38, fontWeight: '900' },
  body: {
    maxWidth: 560,
    color: '#cbd5e1',
    fontSize: 17,
    lineHeight: 26,
  },
});
