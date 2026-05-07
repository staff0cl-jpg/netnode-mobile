import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { getApiUrl } from '../lib/storage';

function makeSessionId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TerminalScreen() {
  const { host, name } = useLocalSearchParams<{ host?: string; name?: string }>();
  const sessionId = useMemo(() => makeSessionId(), []);
  const socketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(`42${JSON.stringify(['ssh:disconnect', { sessionId }])}`);
        }
        socketRef.current.close();
      }
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [logs]);

  const appendLog = (line: string) => {
    setLogs((prev) => [...prev, line]);
  };

  const sendEvent = (event: string, payload: Record<string, unknown>) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(`42${JSON.stringify([event, payload])}`);
  };

  const connect = async () => {
    if (!host || !username.trim()) return;
    setConnecting(true);
    setLogs([]);

    const apiUrl = await getApiUrl();
    const wsUrl = `${apiUrl.replace(/^http/i, 'ws').replace(/\/$/, '')}/socket.io/?EIO=4&transport=websocket`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      appendLog('[NETNODE] Socket connected');
      socket.send('40');
      sendEvent('ssh:connect', {
        sessionId,
        host,
        username: username.trim(),
        password,
        port: 22,
      });
    };

    socket.onmessage = (evt) => {
      const msg = String(evt.data ?? '');
      if (msg === '2') {
        socket.send('3');
        return;
      }
      if (!msg.startsWith('42')) return;
      try {
        const payload = JSON.parse(msg.slice(2)) as [string, { sessionId?: string; data?: string; status?: string }];
        const [event, data] = payload;
        if (data.sessionId !== sessionId) return;
        if (event === 'ssh:data' && data.data != null) {
          appendLog(String(data.data));
        }
        if (event === 'ssh:status') {
          const ok = data.status === 'connected';
          setConnected(ok);
          setConnecting(false);
          appendLog(ok ? '[NETNODE] SSH connected' : '[NETNODE] SSH disconnected');
        }
      } catch {
        // ignore malformed frame
      }
    };

    socket.onerror = () => {
      setConnected(false);
      setConnecting(false);
      appendLog('[NETNODE] Socket error');
    };

    socket.onclose = () => {
      setConnected(false);
      setConnecting(false);
      appendLog('[NETNODE] Socket disconnected');
    };
  };

  const sendInput = () => {
    const cmd = input.trim();
    if (!cmd || !connected) return;
    sendEvent('ssh:input', { sessionId, input: `${cmd}\n` });
    appendLog(`$ ${cmd}`);
    setInput('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{name || host || 'SSH Terminal'}</Text>
      </View>

      <View style={styles.connectCard}>
        <Text style={styles.label}>Host</Text>
        <Text style={styles.hostValue}>{host}</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity
          style={[styles.connectBtn, (connecting || connected) && styles.connectBtnDisabled]}
          onPress={connect}
          disabled={connecting || connected}
        >
          {connecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.connectBtnText}>{connected ? 'Connected' : 'Connect'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.terminal} contentContainerStyle={styles.terminalContent}>
        {logs.length === 0 ? <Text style={styles.empty}>No output yet</Text> : logs.map((line, idx) => <Text key={idx} style={styles.line}>{line}</Text>)}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.commandInput}
          value={input}
          onChangeText={setInput}
          placeholder="show version"
          placeholderTextColor={Colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={sendInput}
        />
        <TouchableOpacity style={[styles.sendBtn, !connected && styles.sendBtnDisabled]} onPress={sendInput} disabled={!connected}>
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  title: { color: Colors.heading, fontSize: 18, fontWeight: '700' },
  connectCard: { marginHorizontal: 16, padding: 12, borderRadius: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  label: { color: Colors.muted, fontSize: 12, marginTop: 6, marginBottom: 4 },
  hostValue: { color: Colors.text, fontSize: 13, fontFamily: 'monospace' },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, color: Colors.text, paddingHorizontal: 10, paddingVertical: 8 },
  connectBtn: { marginTop: 10, backgroundColor: Colors.accent, borderRadius: 8, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  connectBtnDisabled: { opacity: 0.7 },
  connectBtnText: { color: '#fff', fontWeight: '600' },
  terminal: { flex: 1, margin: 16, marginBottom: 8, backgroundColor: '#0f1115', borderWidth: 1, borderColor: Colors.border, borderRadius: 10 },
  terminalContent: { padding: 10, minHeight: 180 },
  empty: { color: Colors.muted, fontFamily: 'monospace', fontSize: 12 },
  line: { color: '#d8dee9', fontFamily: 'monospace', fontSize: 12, marginBottom: 2 },
  inputRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  commandInput: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, color: Colors.text, paddingHorizontal: 12, paddingVertical: 10 },
  sendBtn: { minWidth: 74, backgroundColor: Colors.accent, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600' },
});
