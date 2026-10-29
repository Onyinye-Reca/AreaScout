import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { Chip, Tag } from '../../../components/ui';
import { api, errorMessage } from '../../../lib/api';
import { initials } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { AdminUser } from '../../../lib/types';

const ROLES = [{ label: 'All', v: '' }, { label: 'Renters', v: 'tenant' }, { label: 'Landlords', v: 'landlord' }, { label: 'Agents', v: 'agent' }];

export default function Users() {
  const { top } = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const data = useLoad(() => api<{ users: AdminUser[] }>(`/admin/users?${new URLSearchParams({ ...(q.trim() ? { q: q.trim() } : {}), ...(role ? { role } : {}) })}`).then((r) => r.users), [q, role]);

  async function patch(u: AdminUser, body: { verified?: boolean; suspended?: boolean }) {
    try { await api(`/admin/users/${u.id}`, { method: 'PATCH', body }); data.reload(); }
    catch (e) { Alert.alert('Couldn’t update this account', errorMessage(e)); }
  }
  const actions = (u: AdminUser) => {
    if (u.role === 'admin') return;
    Alert.alert(u.name, u.email, [
      { text: u.verified ? 'Remove verification' : 'Verify account', onPress: () => patch(u, { verified: !u.verified }) },
      u.suspended
        ? { text: 'Lift suspension', onPress: () => patch(u, { suspended: false }) }
        : { text: 'Suspend account', style: 'destructive', onPress: () => Alert.alert('Suspend this account?', `${u.name} will be signed out and their ${u.listing_count} active ${u.listing_count === 1 ? 'listing is' : 'listings are'} removed.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Suspend', style: 'destructive', onPress: () => patch(u, { suspended: true }) }]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl }}>
        <Text style={s.title}>Users</Text>
        <TextInput style={s.search} placeholder="Search name or email" placeholderTextColor="#8A93A5" value={q} onChangeText={setQ} autoCapitalize="none" returnKeyType="search" />
        <View style={s.chips}>{ROLES.map((r) => <Chip key={r.label} label={r.label} on={role === r.v} onPress={() => setRole(r.v)} />)}</View>
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={data.data ?? []} keyExtractor={(u) => String(u.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="No users found" body="Try a different name or filter." />}
          renderItem={({ item: u }) => (
            <Pressable onPress={() => actions(u)} style={s.row} accessibilityRole="button" accessibilityLabel={`${u.name}, ${u.role}`}>
              <View style={s.avatar}><Text style={s.avatarText}>{initials(u.name)}</Text></View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.name} numberOfLines={1}>{u.name}</Text>
                <Text style={s.email} numberOfLines={1}>{u.email}</Text>
                <View style={s.tags}>
                  <Tag label={u.role[0].toUpperCase() + u.role.slice(1)} tone="neutral" />
                  {u.verified ? <Tag label="Verified" tone="good" /> : null}
                  {u.suspended ? <Tag label="Suspended" tone="poor" /> : null}
                  {u.listing_count ? <Tag label={`${u.listing_count} listings`} tone="neutral" /> : null}
                </View>
              </View>
            </Pressable>
          )} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  search: { height: 48, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16, color: colors.navy900, marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginVertical: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.md },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.navy100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 15, color: colors.navy800 },
  name: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  email: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
