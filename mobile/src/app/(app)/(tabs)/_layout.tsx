import { Tabs } from 'expo-router';
import { CalendarDays, Flag, Heart, House, LayoutGrid, MessageSquare, User, Users, type LucideIcon } from 'lucide-react-native';
import type { ColorValue } from 'react-native';
import { useAuth } from '../../../lib/auth';
import { colors, font } from '../../../lib/theme';

function TabIcon({ Icon, color, focused }: { Icon: LucideIcon; color: ColorValue; focused: boolean }) {
  return <Icon size={24} color={String(color)} strokeWidth={focused ? 2.2 : 1.8} />;
}
const icon = (Icon: LucideIcon) =>
  function renderTabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <TabIcon Icon={Icon} color={color} focused={focused} />;
  };

/**
 * Renters, listers and admins share one shell; each role sees only its own tabs.
 * `href: null` hides a tab but keeps its route reachable (admins reach Profile from the avatar).
 */
export default function TabsLayout() {
  const { user } = useAuth();
  const role = user?.role;
  const show = (...roles: string[]) => (role && roles.includes(role) ? undefined : null);
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.navy800,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontFamily: font.semibold, fontSize: 12 },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line },
    }}>
      <Tabs.Screen name="index" options={{ title: role === 'tenant' ? 'Home' : role === 'admin' ? 'Overview' : 'Dashboard', tabBarIcon: icon(role === 'tenant' ? House : LayoutGrid) }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: icon(Heart), href: show('tenant') }} />
      <Tabs.Screen name="inspections" options={{ title: 'Inspections', tabBarIcon: icon(CalendarDays), href: show('landlord', 'agent') }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: icon(Flag), href: show('admin') }} />
      <Tabs.Screen name="listings" options={{ title: 'Listings', tabBarIcon: icon(House), href: show('admin') }} />
      <Tabs.Screen name="users" options={{ title: 'Users', tabBarIcon: icon(Users), href: show('admin') }} />
      <Tabs.Screen name="messages" options={{ title: 'Messages', tabBarIcon: icon(MessageSquare), href: show('tenant', 'landlord', 'agent') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon(User), href: show('tenant', 'landlord', 'agent') }} />
    </Tabs>
  );
}
