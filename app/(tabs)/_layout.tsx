import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../constants/colors';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
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

const TAB_MAP = Object.fromEntries(TABS.map((tab) => [tab.name, tab])) as Record<string, TabConfig>;

function CustomTabBar({ state, navigation, insets }: any) {
  const bottomInset = Math.max(insets?.bottom ?? 0, 6);

  return (
    <View style={[styles.tabBar, { paddingBottom: bottomInset }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = TAB_MAP[route.name];
        if (!tab) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.jumpTo(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={() => {}}
            hitSlop={10}
            style={styles.tabButton}
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
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
