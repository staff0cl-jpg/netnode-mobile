import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardMetrics, type DashboardMetrics, type Device } from '../../lib/api';
import { Colors } from '../../constants/colors';

const POLL_INTERVAL = 10000;

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

function KpiCard({ title, value, icon, color }: KpiCardProps) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );
}

function StatusDot({ status }: { status: Device['status'] }) {
  const color =
    status === 'online' ? Colors.green : status === 'warning' ? Colors.yellow : Colors.red;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function DeviceRow({ device }: { device: Device }) {
  return (
    <View style={styles.deviceRow}>
      <StatusDot status={device.status} />
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={styles.deviceMeta} numberOfLines={1}>
          {device.ip}
          {device.branch ? ` · ${device.branch}` : ''}
        </Text>
      </View>
      {device.cpu_load != null && (
        <Text style={styles.deviceLoad}>{Math.round(device.cpu_load)}%</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics();
      setMetrics(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading dashboard…</Text>
      </SafeAreaView>
    );
  }

  if (error && !metrics) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={48} color={Colors.muted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const kpiCards: KpiCardProps[] = [
    {
      title: 'Total Devices',
      value: metrics?.total_devices ?? 0,
      icon: 'server-outline',
      color: Colors.accent,
    },
    {
      title: 'Online',
      value: metrics?.online_devices ?? 0,
      icon: 'checkmark-circle-outline',
      color: Colors.green,
    },
    {
      title: 'Active Alerts',
      value: metrics?.active_alerts ?? (metrics?.offline_devices ?? 0) + (metrics?.warning_devices ?? 0),
      icon: 'warning-outline',
      color: Colors.red,
    },
    {
      title: 'Avg Load',
      value: metrics?.avg_cpu_load != null ? `${Math.round(metrics.avg_cpu_load)}%` : '–',
      icon: 'pulse-outline',
      color: Colors.yellow,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          {error && (
            <Text style={styles.errorBanner}>{error}</Text>
          )}
        </View>

        <View style={styles.kpiGrid}>
          {kpiCards.map((card) => (
            <KpiCard key={card.title} {...card} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Devices</Text>
          {metrics?.top_devices?.length ? (
            <View style={styles.card}>
              {metrics.top_devices.slice(0, 5).map((device, idx) => (
                <React.Fragment key={device.id ?? idx}>
                  {idx > 0 && <View style={styles.divider} />}
                  <DeviceRow device={device} />
                </React.Fragment>
              ))}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No device data available</Text>
            </View>
          )}
        </View>

        {(metrics?.down_trunks?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Down Trunk Ports</Text>
            <View style={styles.card}>
              {metrics!.down_trunks.map((trunk, idx) => (
                <React.Fragment key={`${trunk.device_id}-${trunk.interface_name}`}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.trunkRow}>
                    <View style={[styles.statusDot, { backgroundColor: Colors.red }]} />
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>{trunk.device_name}</Text>
                      <Text style={[styles.deviceMeta, styles.mono]}>{trunk.interface_name}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 96 },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.heading },
  errorBanner: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.red,
  },
  loadingText: { marginTop: 12, color: Colors.muted, fontSize: 14 },
  errorText: { marginTop: 12, color: Colors.text, textAlign: 'center', fontSize: 14 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  kpiCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    flex: 1,
    minWidth: '45%',
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: { fontSize: 24, fontWeight: '700', color: Colors.heading },
  kpiTitle: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.heading, marginBottom: 8 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 12 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  deviceInfo: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  deviceMeta: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  deviceLoad: { fontSize: 13, color: Colors.muted, fontVariant: ['tabular-nums'] },
  trunkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  emptyText: { color: Colors.muted, fontSize: 13, padding: 16, textAlign: 'center' },
  mono: { fontFamily: 'monospace' },
});
