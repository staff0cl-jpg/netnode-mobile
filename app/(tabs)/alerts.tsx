import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDashboardMetrics, type DashboardMetrics, type Device, type TrunkPort } from '../../lib/api';
import { Colors } from '../../constants/colors';

type AlertItem =
  | { type: 'device'; data: Device }
  | { type: 'trunk'; data: TrunkPort };

interface Section {
  title: string;
  data: AlertItem[];
  count: number;
}

function DeviceAlertRow({ device }: { device: Device }) {
  const color = device.status === 'warning' ? Colors.yellow : Colors.red;
  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    device.status === 'warning' ? 'warning-outline' : 'close-circle-outline';

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: color + '1a' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{device.name}</Text>
        <Text style={[styles.rowSub, styles.mono]}>{device.ip}</Text>
        {device.branch && <Text style={styles.rowMeta}>{device.branch}</Text>}
      </View>
      <View style={[styles.severityBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.severityText, { color }]}>
          {device.status === 'warning' ? 'WARN' : 'DOWN'}
        </Text>
      </View>
    </View>
  );
}

function TrunkAlertRow({ trunk }: { trunk: TrunkPort }) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: Colors.orange + '1a' }]}>
        <Ionicons name="git-branch-outline" size={18} color={Colors.orange} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{trunk.device_name}</Text>
        <Text style={[styles.rowSub, styles.mono]}>{trunk.interface_name}</Text>
        {trunk.description && <Text style={styles.rowMeta}>{trunk.description}</Text>}
      </View>
      <View style={[styles.severityBadge, { backgroundColor: Colors.orange + '22' }]}>
        <Text style={[styles.severityText, { color: Colors.orange }]}>TRUNK</Text>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading alerts…</Text>
      </SafeAreaView>
    );
  }

  const offlineDevices: AlertItem[] = (metrics?.top_devices ?? [])
    .filter((d) => d.status === 'offline')
    .map((d) => ({ type: 'device', data: d }));

  const warningDevices: AlertItem[] = (metrics?.top_devices ?? [])
    .filter((d) => d.status === 'warning')
    .map((d) => ({ type: 'device', data: d }));

  const trunkAlerts: AlertItem[] = (metrics?.down_trunks ?? []).map((t) => ({
    type: 'trunk',
    data: t,
  }));

  const totalAlerts = offlineDevices.length + warningDevices.length + trunkAlerts.length;

  const sections: Section[] = [
    offlineDevices.length > 0 && {
      title: 'Offline Devices',
      data: offlineDevices,
      count: offlineDevices.length,
    },
    warningDevices.length > 0 && {
      title: 'Warning Devices',
      data: warningDevices,
      count: warningDevices.length,
    },
    trunkAlerts.length > 0 && {
      title: 'Down Trunk Ports',
      data: trunkAlerts,
      count: trunkAlerts.length,
    },
  ].filter(Boolean) as Section[];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        {totalAlerts > 0 && (
          <View style={styles.alertCount}>
            <Text style={styles.alertCountText}>{totalAlerts}</Text>
          </View>
        )}
      </View>

      {error && <Text style={styles.errorBanner}>{error}</Text>}

      {totalAlerts === 0 && !error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={52} color={Colors.green} />
          <Text style={styles.emptyTitle}>All Clear</Text>
          <Text style={styles.emptyText}>No active alerts at this time</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) =>
            item.type === 'device'
              ? `device-${item.data.id ?? index}`
              : `trunk-${(item.data as TrunkPort).device_id}-${(item.data as TrunkPort).interface_name}`
          }
          renderItem={({ item }) =>
            item.type === 'device' ? (
              <DeviceAlertRow device={item.data as Device} />
            ) : (
              <TrunkAlertRow trunk={item.data as TrunkPort} />
            )
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.sectionCount}>
                <Text style={styles.sectionCountText}>{section.count}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
              colors={[Colors.accent]}
            />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { marginTop: 12, color: Colors.muted, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: '700', color: Colors.heading },
  alertCount: {
    backgroundColor: Colors.red,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  alertCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, color: Colors.red, fontSize: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.heading },
  sectionCount: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionCountText: { fontSize: 11, color: Colors.muted, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.muted, marginTop: 1 },
  rowMeta: { fontSize: 11, color: Colors.muted, marginTop: 1 },
  severityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.heading },
  emptyText: { fontSize: 14, color: Colors.muted, textAlign: 'center' },
  mono: { fontFamily: 'monospace' },
});
