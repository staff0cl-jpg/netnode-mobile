import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
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
import { getInventory, getInventoryMeta, type Device } from '../../lib/api';
import { Colors } from '../../constants/colors';

type StatusFilter = 'all' | 'online' | 'offline' | 'warning';

const FILTER_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
  { label: 'Warning', value: 'warning' },
];

function statusColor(status: Device['status']) {
  if (status === 'online') return Colors.green;
  if (status === 'warning') return Colors.yellow;
  return Colors.red;
}

function StatusBadge({ status }: { status: Device['status'] }) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '44' }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function DeviceCard({
  device,
  expanded,
  onToggle,
  onOpenWeb,
  onOpenSsh,
}: {
  device: Device;
  expanded: boolean;
  onToggle: () => void;
  onOpenWeb: () => void;
  onOpenSsh: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onToggle}>
      <View style={styles.cardHeader}>
        <Text style={styles.deviceName} numberOfLines={1}>
          {device.name}
        </Text>
        <StatusBadge status={device.status} />
      </View>
      <Text style={[styles.ipText, styles.mono]}>{device.ip}</Text>
      <View style={styles.cardMeta}>
        {device.vendor || device.model ? (
          <Text style={styles.metaText}>
            {[device.vendor, device.model].filter(Boolean).join(' ')}
          </Text>
        ) : null}
        {device.branch ? (
          <Text style={styles.metaText}>
            <Ionicons name="location-outline" size={11} color={Colors.muted} /> {device.branch}
          </Text>
        ) : null}
        {device.uptime ? (
          <Text style={[styles.metaText, styles.mono]}>↑ {device.uptime}</Text>
        ) : null}
        {device.category ? <Text style={styles.metaText}>#{device.category}</Text> : null}
      </View>
      {expanded && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.actionWeb]} onPress={onOpenWeb}>
            <Ionicons name="globe-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Open Web</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionSsh]} onPress={onOpenSsh}>
            <Ionicons name="terminal-outline" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Open SSH</Text>
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

export default function InventoryScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);

  const fetchDevices = useCallback(async () => {
    setError(null);
    try {
      const [data, meta] = await Promise.all([getInventory(), getInventoryMeta()]);
      setDevices(data);
      setCategories(meta.categories ?? []);
      setBranches(meta.branches ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevices();
  }, [fetchDevices]);

  const filtered = devices.filter((d) => {
    const matchesSearch =
      search === '' ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.ip.includes(search);
    const matchesFilter = filter === 'all' || d.status === filter;
    const matchesCategory =
      categoryFilter === 'all' || (d.category ?? '').toLowerCase() === categoryFilter.toLowerCase();
    const matchesBranch =
      branchFilter === 'all' || (d.branch ?? '').toLowerCase() === branchFilter.toLowerCase();
    return matchesSearch && matchesFilter && matchesCategory && matchesBranch;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Loading inventory…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>{filtered.length} devices</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={Colors.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or IP…"
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll} contentContainerStyle={styles.filtersScrollContent}>
        <View style={styles.filterRow}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.value}
              style={[styles.filterTab, filter === tab.value && styles.filterTabActive]}
              onPress={() => setFilter(tab.value)}
            >
              <Text style={[styles.filterTabText, filter === tab.value && styles.filterTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setShowBranchMenu(false);
              setShowCategoryMenu((v) => !v);
            }}
          >
            <Text style={styles.dropdownBtnText}>Category: {categoryFilter === 'all' ? 'All' : categoryFilter}</Text>
            <Ionicons name={showCategoryMenu ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => {
              setShowCategoryMenu(false);
              setShowBranchMenu((v) => !v);
            }}
          >
            <Text style={styles.dropdownBtnText}>Branch: {branchFilter === 'all' ? 'All' : branchFilter}</Text>
            <Ionicons name={showBranchMenu ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
      {(showCategoryMenu || showBranchMenu) && (
        <View style={styles.dropdownPanel}>
          {showCategoryMenu && (
            <View style={styles.dropdownGroup}>
              <Text style={styles.dropdownTitle}>Category</Text>
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setCategoryFilter('all'); setShowCategoryMenu(false); }}>
                  <Text style={styles.dropdownItemText}>All</Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={`cat-menu-${category}`}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCategoryFilter(category);
                      setShowCategoryMenu(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {showBranchMenu && (
            <View style={styles.dropdownGroup}>
              <Text style={styles.dropdownTitle}>Branch</Text>
              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                <TouchableOpacity style={styles.dropdownItem} onPress={() => { setBranchFilter('all'); setShowBranchMenu(false); }}>
                  <Text style={styles.dropdownItemText}>All</Text>
                </TouchableOpacity>
                {branches.map((branch) => (
                  <TouchableOpacity
                    key={`branch-menu-${branch}`}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setBranchFilter(branch);
                      setShowBranchMenu(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{branch}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {error && <Text style={styles.errorBanner}>{error}</Text>}

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id ?? item.ip)}
        renderItem={({ item }) => (
          <DeviceCard
            device={item}
            expanded={expandedId === String(item.id ?? item.ip)}
            onToggle={() =>
              setExpandedId((prev) => (prev === String(item.id ?? item.ip) ? null : String(item.id ?? item.ip)))
            }
            onOpenWeb={async () => {
              const raw = item.ip.trim();
              const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              try {
                await Linking.openURL(url);
              } catch {
                await Linking.openURL(`http://${raw}`);
              }
            }}
            onOpenSsh={() => {
              router.push({
                pathname: '/terminal',
                params: {
                  host: item.ip,
                  name: item.name,
                },
              });
            }}
          />
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="server-outline" size={40} color={Colors.muted} />
            <Text style={styles.emptyText}>
              {error ? 'Failed to load devices' : 'No devices found'}
            </Text>
            {error && (
              <TouchableOpacity style={styles.retryBtn} onPress={fetchDevices}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
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
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.heading },
  subtitle: { fontSize: 13, color: Colors.muted },
  searchRow: { paddingHorizontal: 16, paddingVertical: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14 },
  filtersScroll: { maxHeight: 52 },
  filtersScrollContent: { paddingHorizontal: 16, paddingBottom: 8 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterTabText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  filterTabTextActive: { color: '#fff' },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownBtnText: { fontSize: 13, color: Colors.muted, fontWeight: '500' },
  dropdownPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    padding: 8,
    gap: 8,
  },
  dropdownGroup: { gap: 4 },
  dropdownList: { maxHeight: 220 },
  dropdownTitle: { fontSize: 11, color: Colors.muted, fontWeight: '600' },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownItemText: { fontSize: 13, color: Colors.text },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, color: Colors.red, fontSize: 12 },
  listContent: { paddingHorizontal: 16, paddingBottom: 96, gap: 8 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  deviceName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.heading, marginRight: 8 },
  ipText: { fontSize: 13, color: Colors.muted, marginBottom: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
  },
  actionWeb: { backgroundColor: Colors.accent },
  actionSsh: { backgroundColor: Colors.orange },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  metaText: { fontSize: 12, color: Colors.muted },
  mono: { fontFamily: 'monospace' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { color: Colors.muted, fontSize: 14 },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '600' },
});
