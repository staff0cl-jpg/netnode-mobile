import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '../constants/colors';
import { getApiUrl } from '../lib/storage';

function makeSessionId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractEngineOpenPacket(raw: string) {
  const parts = raw.split(String.fromCharCode(30));
  for (const part of parts) {
    if (part.startsWith('0{')) {
      try {
        return JSON.parse(part.slice(1)) as { sid?: string };
      } catch {
        return null;
      }
    }
  }
  return null;
}

export default function TerminalScreen() {
  const { host, name } = useLocalSearchParams<{ host?: string; name?: string }>();
  const sessionId = useMemo(() => makeSessionId(), []);
  const socketRef = useRef<WebSocket | null>(null);
  const pollingUrlRef = useRef<string | null>(null);
  const pollingActiveRef = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    return () => {
      pollingActiveRef.current = false;
      if (pollingUrlRef.current) {
        void fetch(pollingUrlRef.current, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: `42${JSON.stringify(['ssh:disconnect', { sessionId }])}`,
        }).catch(() => undefined);
      }
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

  const parseEnginePackets = (raw: string) => raw.split(String.fromCharCode(30)).filter(Boolean);

  const postPollingPacket = async (url: string, packet: string) => {
    await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: packet,
    });
  };

  const sendEvent = (event: string, payload: Record<string, unknown>) => {
    if (!socketReady) return;
    const packet = `42${JSON.stringify([event, payload])}`;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(packet);
      return;
    }
    if (pollingUrlRef.current && pollingActiveRef.current) {
      void postPollingPacket(pollingUrlRef.current, packet).catch(() => {
        appendLog('[NETNODE] Polling send failed');
      });
    }
  };

  const connect = async () => {
    if (!host || !username.trim()) return;
    pollingActiveRef.current = false;
    pollingUrlRef.current = null;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setConnecting(true);
    setSocketReady(false);
    setLogs([]);
    setConnected(false);

    const apiUrl = await getApiUrl();
    const parsed = new URL(apiUrl);
    const cleanPath = parsed.pathname.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    const httpBase = `${parsed.protocol}//${parsed.host}${cleanPath}`;
    const httpOrigin = `${parsed.protocol}//${parsed.host}`;
    const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = `${wsProtocol}//${parsed.host}${cleanPath}`;
    const fallbackBase = `${wsProtocol}//${parsed.host}`;
    const pollingCandidates = Array.from(new Set([
      `${httpBase}/socket.io/?EIO=4&transport=polling`,
      `${httpOrigin}/socket.io/?EIO=4&transport=polling`,
      `${httpOrigin}/api/socket.io/?EIO=4&transport=polling`,
    ]));
    const wsPathCandidates = Array.from(new Set([
      `${wsBase}/socket.io/`,
      `${fallbackBase}/socket.io/`,
      `${fallbackBase}/api/socket.io/`,
    ]));
    const handleSocketIoEvent = (rawPacket: string) => {
      if (!rawPacket.startsWith('42')) return;
      try {
        const payload = JSON.parse(rawPacket.slice(2)) as [string, { sessionId?: string; data?: string; status?: string }];
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
    let attemptIndex = 0;
    let completed = false;

    const tryConnect = async () => {
      const pollingUrl = pollingCandidates[attemptIndex];
      const wsPath = wsPathCandidates[attemptIndex];
      if (!pollingUrl || !wsPath) {
        setConnecting(false);
        appendLog('[NETNODE] Socket error: no reachable Socket.IO endpoint');
        return;
      }

      appendLog(`[NETNODE] Polling ${attemptIndex + 1}/${pollingCandidates.length}: ${pollingUrl}`);
      let sid = '';
      try {
        const pollingResp = await fetch(pollingUrl, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: '*/*' },
        });
        const body = await pollingResp.text();
        if (!pollingResp.ok) {
          throw new Error(`HTTP ${pollingResp.status}`);
        }
        const openPacket = extractEngineOpenPacket(body);
        if (!openPacket?.sid) {
          throw new Error('missing sid');
        }
        sid = openPacket.sid;
      } catch (e) {
        appendLog(`[NETNODE] Polling failed (${attemptIndex + 1}/${pollingCandidates.length}): ${(e as Error).message}`);
        attemptIndex += 1;
        tryConnect();
        return;
      }

      const wsUrl = `${wsPath}?EIO=4&transport=websocket&sid=${encodeURIComponent(sid)}`;
      appendLog(`[NETNODE] WebSocket ${attemptIndex + 1}/${wsPathCandidates.length}: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;
      let upgraded = false;
      let fallbackStarted = false;

      const startPollingTransport = async () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        const sidPollingUrl = `${pollingUrl}&sid=${encodeURIComponent(sid)}`;
        pollingUrlRef.current = sidPollingUrl;
        pollingActiveRef.current = true;
        setSocketReady(true);
        appendLog('[NETNODE] Falling back to polling transport');

        try {
          await postPollingPacket(sidPollingUrl, '40');
          await postPollingPacket(sidPollingUrl, `42${JSON.stringify(['ssh:connect', {
            sessionId,
            host,
            username: username.trim(),
            password,
            port: 22,
          }])}`);
        } catch (e) {
          setConnecting(false);
          appendLog(`[NETNODE] Polling setup failed: ${(e as Error).message}`);
          return;
        }

        while (pollingActiveRef.current && pollingUrlRef.current === sidPollingUrl) {
          try {
            const resp = await fetch(sidPollingUrl, {
              method: 'GET',
              credentials: 'include',
              headers: { Accept: '*/*' },
            });
            const body = await resp.text();
            if (!resp.ok) {
              throw new Error(`HTTP ${resp.status}`);
            }
            const packets = parseEnginePackets(body);
            for (const packet of packets) {
              if (packet === '2') {
                await postPollingPacket(sidPollingUrl, '3');
                continue;
              }
              if (packet === '40') continue;
              if (packet === '41') {
                pollingActiveRef.current = false;
                setConnected(false);
                setSocketReady(false);
                setConnecting(false);
                appendLog('[NETNODE] Polling disconnected');
                return;
              }
              handleSocketIoEvent(packet);
            }
          } catch (e) {
            pollingActiveRef.current = false;
            setConnected(false);
            setSocketReady(false);
            setConnecting(false);
            appendLog(`[NETNODE] Polling receive failed: ${(e as Error).message}`);
            return;
          }
        }
      };

      socket.onopen = () => {
        appendLog('[NETNODE] Socket connected');
        if (socket.readyState === WebSocket.OPEN) {
          socket.send('2probe');
        }
      };

      socket.onmessage = (evt) => {
        const msg = String(evt.data ?? '');
        if (msg === '3probe') {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send('5');
            socket.send('40');
            upgraded = true;
          }
          return;
        }
        if (msg === '40') {
          if (!upgraded) return;
          setSocketReady(true);
          completed = true;
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(`42${JSON.stringify(['ssh:connect', {
              sessionId,
              host,
              username: username.trim(),
              password,
              port: 22,
            }])}`);
          }
          return;
        }
        if (msg === '2') {
          socket.send('3');
          return;
        }
        handleSocketIoEvent(msg);
      };

      socket.onerror = () => {
        appendLog(`[NETNODE] Socket error (${attemptIndex + 1}/${wsPathCandidates.length})`);
      };

      socket.onclose = (evt) => {
        setConnected(false);
        setSocketReady(false);
        const detail = evt.reason ? `, reason: ${evt.reason}` : '';
        appendLog(`[NETNODE] Socket disconnected (code: ${evt.code}${detail})`);

        if (!completed) {
          if (evt.code === 1006 || evt.code === 1002 || /400/i.test(evt.reason || '')) {
            void startPollingTransport();
            return;
          }
          attemptIndex += 1;
          void tryConnect();
          return;
        }

        setConnecting(false);
      };
    };

    void tryConnect();
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
          editable={connected}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={sendInput}
        />
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
  inputRow: { paddingHorizontal: 16, paddingBottom: 14 },
  commandInput: { flex: 1, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, color: Colors.text, paddingHorizontal: 12, paddingVertical: 10 },
});
