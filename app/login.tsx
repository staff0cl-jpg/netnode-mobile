import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { login } from '../lib/api';
import { getApiUrl, getSession, saveApiUrl } from '../lib/storage';

export default function LoginScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedUrl, session] = await Promise.all([getApiUrl(), getSession()]);
      setApiUrl(savedUrl);
      if (session) {
        router.replace('/(tabs)');
        return;
      }
      setLoading(false);
    })();
  }, []);

  const handleLogin = useCallback(async () => {
    const url = apiUrl.trim();
    const user = username.trim();
    if (!url || !user || !password.trim()) {
      Alert.alert('Missing fields', 'Fill server URL, username, and password.');
      return;
    }

    setSubmitting(true);
    try {
      await saveApiUrl(url);
      await login(user, password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Login failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [apiUrl, username, password]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.card}>
        <Text style={styles.title}>NetNode Login</Text>
        <Text style={styles.subtitle}>Sign in to load dashboard and alerts</Text>

        <Text style={styles.label}>Server URL</Text>
        <TextInput
          style={[styles.input, styles.mono]}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://your-server:3000"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="admin"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={Colors.muted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: 20 },
  centered: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.heading },
  subtitle: { fontSize: 13, color: Colors.muted, marginTop: 6, marginBottom: 16 },
  label: { color: Colors.muted, fontSize: 12, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    color: Colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  mono: { fontFamily: 'monospace' },
});
