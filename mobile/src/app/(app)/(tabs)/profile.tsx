import { useRouter } from 'expo-router';
import { Bell, ChevronRight, Lock, LogOut, Search, ShieldCheck, ShieldHalf, UserPen } from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../../components/ui';
import { useAuth } from '../../../lib/auth';
import { initials } from '../../../lib/format';
import { useSaved } from '../../../lib/saved';
import { colors, font, space } from '../../../lib/theme';

export default function Profile() {
  const router = useRouter();
  const { top } = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { ids } = useSaved();
  if (!user) return null;
  const renter = user.role === 'tenant';

  const rows = renter ? [
    { icon: Bell, label: 'Inspections & updates', sub: 'Your requests and the agent’s replies', onPress: () => router.push('/notifications') },
    { icon: ShieldCheck, label: 'Safety tips', sub: 'Never pay before inspecting. AreaScout never asks for a fee in chat.', onPress: () => Alert.alert('Stay safe', 'Inspect the home and see the documents before you pay anything. AreaScout will never ask you to pay a fee through chat.') },
  ] : [
    { icon: ShieldCheck, label: 'Listing guidelines', sub: 'Keep listings accurate and renters safe', onPress: () => Alert.alert('Listing guidelines', 'Only list homes you are authorised to let. State every fee honestly. Never ask a renter to pay before they have inspected the home. AreaScout checks listings before they go live.') },
  ];

  const account = [
    { icon: UserPen, label: 'Edit profile', sub: 'Your name and phone number', onPress: () => router.push('/account/edit-profile') },
    { icon: Bell, label: 'Notifications', sub: 'Choose what updates you receive', onPress: () => router.push('/account/notifications') },
    ...(renter ? [{ icon: Search, label: 'Saved searches', sub: 'New matches for the homes you’re after', onPress: () => router.push('/account/saved-searches') }] : []),
    { icon: Lock, label: 'Password', sub: 'Change the password you sign in with', onPress: () => router.push('/account/password') },
    { icon: ShieldHalf, label: 'Privacy & data', sub: 'Download your data or delete your account', onPress: () => router.push('/account/privacy') },
  ];
  const all = [...rows.slice(0, 1), ...account, ...rows.slice(1)];

  return (
    <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: top + space.xl, gap: space.lg }}>
      <Text style={s.title}>Profile</Text>
      <Card style={{ alignItems: 'center', paddingVertical: space.xxl }}>
        <View style={s.avatar}><Text style={s.avatarText}>{initials(user.name)}</Text></View>
        <Text style={s.name}>{user.name}</Text>
        <Text style={s.email}>{user.email}{user.phone ? ` · ${user.phone}` : ''}</Text>
        <Text style={s.stat}>{renter ? `${ids.size} saved ${ids.size === 1 ? 'home' : 'homes'}` : `${user.role[0].toUpperCase()}${user.role.slice(1)} account${user.verified ? ' · Verified' : ''}`}</Text>
      </Card>
      <Card style={{ paddingVertical: space.xs }}>
        {all.map(({ icon: Icon, label, sub, onPress }, i) => (
          <Pressable key={label} onPress={onPress} style={[s.row, i > 0 && s.rowBorder]} accessibilityRole="button">
            <View style={s.icon}><Icon size={20} color={colors.navy800} strokeWidth={1.8} /></View>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>{label}</Text><Text style={s.rowSub}>{sub}</Text></View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        ))}
      </Card>
      <Pressable onPress={() => Alert.alert('Log out?', 'You can log back in any time.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: signOut }])} style={s.logout} accessibilityRole="button">
        <LogOut size={20} color={colors.poorText} strokeWidth={1.8} /><Text style={s.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.bold, fontSize: 24 },
  name: { fontFamily: font.bold, fontSize: 22, color: colors.navy900, marginTop: space.md },
  email: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  stat: { fontFamily: font.semibold, fontSize: 14, color: colors.teal700, marginTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: font.bold, fontSize: 16, color: colors.navy900 },
  rowSub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  logout: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', height: 52 },
  logoutText: { fontFamily: font.bold, fontSize: 16, color: colors.poorText },
});
