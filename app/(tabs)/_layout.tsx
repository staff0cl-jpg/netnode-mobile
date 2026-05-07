import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import DashboardScreen from './index';
import InventoryScreen from './inventory';
import AlertsScreen from './alerts';
import SettingsScreen from './settings';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];
type TabName = 'index' | 'inventory' | 'alerts' | 'settings';

interface TabConfig {
  name: TabName;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'grid-outline', iconFocused: 'grid' },
  { name: 'inventory', title: 'Inventory', icon: 'server-outline', iconFocused: 'server' },
  { name: 'alerts', title: 'Alerts', icon: 'warning-outline', iconFocused: 'warning' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconFocused: 'settings' },
];

function ActiveScreen({ activeTab }: { activeTab: TabName }) {
  if (activeTab === 'inventory') return <InventoryScreen />;
  if (activeTab === 'alerts') return <AlertsScreen />;
  if (activeTab === 'settings') return <SettingsScreen />;
  return <DashboardScreen />;
}

function CustomTabBar({
  activeTab,
  onSelectTab,
}: {
  activeTab: TabName;
  onSelectTab: (tab: TabName) => void;
}) {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 6);

  return (
    <View
      collapsable={false}
      pointerEvents="auto"
      style={styles.tabBar}
    >
      {TABS.map((tab) => {
        const isFocused = activeTab === tab.name;

        return (
          <Pressable
            key={tab.name}
            onPress={() => {
              if (!isFocused) {
                onSelectTab(tab.name);
              }
            }}
            onLongPress={() => {}}
            delayLongPress={100000}
            collapsable={false}
            hitSlop={10}
            style={[styles.tabButton, { paddingBottom: bottomInset }]}
          >
            <Ionicons
              name={isFocused ? tab.iconFocused : tab.icon}
              size={22}
              color={isFocused ? Colors.tabActive : Colors.tabInactive}
            />
            <Text style={[styles.tabLabel, isFocused ? styles.tabLabelActive : styles.tabLabelInactive]}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState<TabName>('index');

  return (
    <View style={styles.shell}>
      <View key={activeTab} style={styles.screenHost}>
        <ActiveScreen activeTab={activeTab} />
      </View>
      <CustomTabBar activeTab={activeTab} onSelectTab={setActiveTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenHost: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.tabBarBorder,
    borderTopWidth: 1,
    paddingTop: 6,
    minHeight: 58,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 44,
    zIndex: 1001,
    elevation: 1001,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.tabActive,
  },
  tabLabelInactive: {
    color: Colors.tabInactive,
  },
});
