import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Inventory Diagnostic Screen</Text>
      <Text style={styles.subtitle}>Tab test color: green</Text>
      <TouchableOpacity style={styles.button} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Inventory Button</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#11321B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#CBEFD0', fontSize: 14, marginTop: 8, marginBottom: 20 },
  button: {
    backgroundColor: '#1D8E46',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
