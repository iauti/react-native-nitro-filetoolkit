import { StyleSheet, Text, View } from 'react-native';

export default function WebUnsupportedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nitro File Toolkit</Text>
      <Text style={styles.body}>
        This example exercises native Swift and Kotlin code. Run the iOS or
        Android development build to use the filesystem demo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    backgroundColor: '#111827',
  },
  title: { color: '#F9FAFB', fontSize: 38, fontWeight: '800' },
  body: { color: '#CBD5E1', fontSize: 17, lineHeight: 26 },
});
