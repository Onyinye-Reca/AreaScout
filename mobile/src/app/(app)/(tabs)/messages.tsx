import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { initials, timeAgo } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { ConversationSummary } from '../../../lib/types';

export default function Messages() {
  const router = useRouter();
  const renter = useAuth().user?.role === 'tenant';
  const { top } = useSafeAreaInsets();
  const data = useLoad(() => api<{ conversations: ConversationSummary[] }>('/conversations').then((r) => r.conversations));

  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md }}>
        <Text style={s.title}>Messages</Text>
        <Text style={s.sub}>{renter ? 'Keep every conversation with agents on the platform.' : 'Renters who ask about your homes appear here.'}</Text>
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> :
        !data.data?.length ? <EmptyState title="No conversations yet" body={renter ? 'Message an agent from any home to start one.' : 'When a renter messages you about a listing, you can reply here.'}
          action={renter ? 'Browse homes' : undefined} onAction={() => router.push('/')} /> : (
          <FlatList data={data.data} keyExtractor={(c) => String(c.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.xl, gap: space.md }}
            renderItem={({ item: c }) => (
              <Pressable onPress={() => router.push(`/chat/${c.id}`)} style={s.row} accessibilityLabel={`Conversation with ${c.with} about ${c.listing_title}`}>
                <View style={s.avatar}><Text style={s.avatarText}>{initials(c.with)}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={s.rowTop}><Text style={s.name} numberOfLines={1}>{c.with}</Text><Text style={s.time}>{timeAgo(c.updated_at)}</Text></View>
                  <Text style={s.listing} numberOfLines={1}>{c.listing_title}</Text>
                  <Text style={[s.last, c.unread > 0 && { color: colors.navy900, fontFamily: font.semibold }]} numberOfLines={1}>{c.last_message}</Text>
                </View>
                {c.unread > 0 ? <View style={s.badge}><Text style={s.badgeText}>{c.unread}</Text></View> : null}
              </Pressable>
            )} />
        )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 4 },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.bold, fontSize: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  time: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  listing: { fontFamily: font.medium, fontSize: 14, color: colors.teal700, marginTop: 1 },
  last: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 2 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.teal500, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
});
