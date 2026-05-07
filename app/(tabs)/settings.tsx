import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Settings Diagnostic Screen</Text>
      <Text style={styles.subtitle}>Tab test color: red</Text>
      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Settings Button</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3A1010',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#F1C3C3', fontSize: 14, marginTop: 8, marginBottom: 20 },
  button: {
    backgroundColor: '#C73333',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
