import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Dashboard Diagnostic Screen</Text>
      <Text style={styles.subtitle}>Tab test color: blue</Text>
      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Dashboard Button</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1F3A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#C8D8F0', fontSize: 14, marginTop: 8, marginBottom: 20 },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
