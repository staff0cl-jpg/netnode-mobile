import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: false,
        detachInactiveScreens: true,
        tabBarHideOnKeyboard: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.tabBarBorder,
          borderTopWidth: 1,
          position: 'absolute',
          zIndex: 1000,
          elevation: 1000,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 4,
          height: 52 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
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
