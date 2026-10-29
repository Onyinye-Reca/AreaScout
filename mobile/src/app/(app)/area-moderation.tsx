import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SIGNALS } from '../../components/AreaSignal';
import { EmptyState, ErrorState, Loading } from '../../components/States';
import { Button, Card, Header } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { timeAgo } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { colors, font, space } from '../../lib/theme';
import type { PendingAreaReview } from '../../lib/types';

export default function AreaModeration() {
  const data = useLoad(() => api<{ area_reviews: PendingAreaReview[] }>('/admin/area-reviews').then((r) => r.area_reviews));
  const [busy, setBusy] = useState<number | null>(null);

  async function decide(r: PendingAreaReview, status: 'published' | 'rejected') {
    setBusy(r.id);
    try { await api(`/admin/area-reviews/${r.id}`, { method: 'PATCH', body: { status } }); data.reload(); }
    catch (e) { Alert.alert('Couldn’t update the report', errorMessage(e)); }
    setBusy(null);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Area reviews" subtitle="Approve only what’s accurate and free of personal details" />
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={data.data ?? []} keyExtractor={(r) => String(r.id)} onRefresh={data.reload} refreshing={false} contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="Nothing to moderate" body="Resident reports wait here until you approve them." />}
          renderItem={({ item: r }) => {
            const rated = SIGNALS.filter((x) => r[x.key] != null);
            return (
              <Card style={{ gap: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.area}>{r.area}</Text><Text style={s.time}>{timeAgo(r.created_at)}</Text></View>
                <Text style={s.by}>{r.reviewer} · {rated.map((x) => `${x.label} ${r[x.key]}/5`).join(', ')}</Text>
                <Text style={s.comment}>{r.comment}</Text>
                <View style={{ flexDirection: 'row', gap: space.md, marginTop: space.sm }}>
                  <Button label="Reject" variant="outline" style={{ flex: 1 }} disabled={busy === r.id} onPress={() => decide(r, 'rejected')} />
                  <Button label="Approve" variant="teal" style={{ flex: 1 }} loading={busy === r.id} onPress={() => decide(r, 'published')} />
                </View>
              </Card>
            );
          }} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  area: { fontFamily: font.extrabold, fontSize: 19, color: colors.navy900 },
  time: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  by: { fontFamily: font.medium, fontSize: 14, color: colors.teal700 },
  comment: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.navy900 },
});
