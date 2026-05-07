import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getApiUrl, saveApiUrl, getSession, clearSession, type SessionData } from '../../lib/storage';
import { testConnection } from '../../lib/api';
import { Colors } from '../../constants/colors';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const [apiUrl, setApiUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [url, sess] = await Promise.all([getApiUrl(), getSession()]);
    setApiUrl(url);
    setSavedUrl(url);
    setSession(sess);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveUrl = useCallback(async () => {
    if (!apiUrl.trim()) return;
    setSaving(true);
    setTestResult(null);
    try {
      await saveApiUrl(apiUrl.trim());
      setSavedUrl(apiUrl.trim());
      Alert.alert('Saved', 'API URL has been updated.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [apiUrl]);

  const handleTestConnection = useCallback(async () => {
    if (!apiUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    await saveApiUrl(apiUrl.trim());
    const result = await testConnection();
    setTestResult(result);
    setTesting(false);
  }, [apiUrl]);

  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await clearSession();
          setSession(null);
          router.replace('/login');
        },
      },
    ]);
  }, []);

  const urlChanged = apiUrl.trim() !== savedUrl.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        <SettingsSection title="API CONNECTION">
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Server URL</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.mono]}
                value={apiUrl}
                onChangeText={(t) => {
                  setApiUrl(t);
                  setTestResult(null);
                }}
                placeholder="https://netnode.domain.com"
                placeholderTextColor={Colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            {testResult && (
              <View style={[styles.testResultBanner, testResult.ok ? styles.testOk : styles.testFail]}>
                <Ionicons
                  name={testResult.ok ? 'checkmark-circle-outline' : 'close-circle-outline'}
                  size={14}
                  color={testResult.ok ? Colors.green : Colors.red}
                />
                <Text style={[styles.testResultText, { color: testResult.ok ? Colors.green : Colors.red }]}>
                  {testResult.message}
                </Text>
              </View>
            )}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleTestConnection}
                disabled={testing || !apiUrl.trim()}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={Colors.accent} />
                ) : (
                  <Ionicons name="pulse-outline" size={16} color={Colors.accent} />
                )}
                <Text style={[styles.btnText, { color: Colors.accent }]}>
                  {testing ? 'Testing...' : 'Test Connection'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, !urlChanged && styles.btnDisabled]}
                onPress={handleSaveUrl}
                disabled={!urlChanged || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="save-outline" size={16} color="#fff" />
                )}
                <Text style={[styles.btnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="SESSION">
          {session ? (
            <>
              <InfoRow label="User" value={session.username} />
              <View style={styles.divider} />
              <InfoRow label="Role" value={session.role || '—'} />
              <View style={styles.divider} />
              <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={18} color={Colors.red} />
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.noSessionRow}>
              <Ionicons name="person-circle-outline" size={20} color={Colors.muted} />
              <Text style={styles.noSessionText}>Not logged in</Text>
            </View>
          )}
        </SettingsSection>

        <SettingsSection title="ABOUT">
          <InfoRow label="App" value="NetNode Mobile" />
          <View style={styles.divider} />
          <InfoRow label="Version" value="1.01" />
          <View style={styles.divider} />
          <InfoRow label="API" value={savedUrl} mono />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.heading },
  section: { paddingHorizontal: 16, paddingBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 12,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  inputGroup: { padding: 14 },
  inputLabel: { fontSize: 12, color: Colors.muted, marginBottom: 6 },
  inputRow: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
  },
  input: {
    color: Colors.text,
    fontSize: 13,
    paddingVertical: 10,
  },
  testResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
  },
  testOk: { backgroundColor: Colors.green + '1a' },
  testFail: { backgroundColor: Colors.red + '1a' },
  testResultText: { fontSize: 12, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnPrimary: { backgroundColor: Colors.accent },
  btnSecondary: {
    backgroundColor: Colors.accent + '1a',
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 14, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoLabel: { fontSize: 14, color: Colors.text },
  infoValue: { fontSize: 14, color: Colors.muted },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  logoutText: { fontSize: 14, color: Colors.red, fontWeight: '500' },
  noSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noSessionText: { fontSize: 14, color: Colors.muted },
  mono: { fontFamily: 'monospace', fontSize: 12 },
});
