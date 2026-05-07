import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { login } from '../lib/api';
import { getApiUrl, getSession, saveApiUrl } from '../lib/storage';

const DEFAULT_API_URL = 'http://your-server:3000';
type LoginStep = 'server' | 'credentials';

export default function LoginScreen() {
  const [step, setStep] = useState<LoginStep>('server');
  const [apiUrl, setApiUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingServer, setSavingServer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedUrl, session] = await Promise.all([getApiUrl(), getSession()]);
      setApiUrl(savedUrl);
      if (session) {
        router.replace('/(tabs)');
        return;
      }
      if (savedUrl && savedUrl !== DEFAULT_API_URL) {
        setStep('credentials');
      }
      setLoading(false);
    })();
  }, []);

  const handleSaveServer = useCallback(async () => {
    const url = apiUrl.trim();
    if (!url) {
      Alert.alert('Missing server', 'Enter server URL first.');
      return;
    }

    setSavingServer(true);
    try {
      await saveApiUrl(url);
      setApiUrl(url);
      setStep('credentials');
    } catch (e) {
      Alert.alert('Save failed', (e as Error).message);
    } finally {
      setSavingServer(false);
    }
  }, [apiUrl]);

  const handleLogin = useCallback(async () => {
    const user = username.trim();
    if (!user || !password.trim()) {
      Alert.alert('Missing fields', 'Fill username and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(user, password);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Login failed', (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [username, password]);

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
        <Text style={styles.title}>NetNode</Text>
        <Text style={styles.subtitle}>
          {step === 'server' ? 'Step 1 of 2: Connect your server' : 'Step 2 of 2: Sign in'}
        </Text>

        {step === 'server' ? (
          <>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={[styles.input, styles.mono]}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder={DEFAULT_API_URL}
              placeholderTextColor={Colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.button, savingServer && styles.buttonDisabled]}
              onPress={handleSaveServer}
              disabled={savingServer}
            >
              {savingServer ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.serverHint}>Server: {apiUrl}</Text>
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

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('server')}>
              <Text style={styles.secondaryButtonText}>Change server</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Log in</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
  serverHint: {
    color: Colors.muted,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
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
  secondaryButton: { marginTop: 12, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: Colors.accent, fontWeight: '500', fontSize: 13 },
  mono: { fontFamily: 'monospace' },
});
