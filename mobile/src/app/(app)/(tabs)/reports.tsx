import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReportCard } from '../../../components/ReportCard';
import { EmptyState, ErrorState, Loading } from '../../../components/States';
import { api } from '../../../lib/api';
import { useLoad } from '../../../lib/hooks';
import { colors, font, space } from '../../../lib/theme';
import type { ReportGroup } from '../../../lib/types';

export default function Reports() {
  const { top } = useSafeAreaInsets();
  const data = useLoad(() => api<{ reports: ReportGroup[] }>('/admin/reports').then((r) => r.reports));
  return (
    <View style={{ flex: 1, paddingTop: top }}>
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space.md }}>
        <Text style={s.title}>Reports</Text>
        <Text style={s.sub}>Grouped by listing, most urgent first.</Text>
      </View>
      {data.loading && !data.data ? <Loading /> : data.error && !data.data ? <ErrorState error={data.error} onRetry={data.reload} /> : (
        <FlatList data={data.data ?? []} keyExtractor={(g) => String(g.listing_id)} onRefresh={data.reload} refreshing={false}
          contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
          ListEmptyComponent={<EmptyState title="No open reports" body="When renters report a listing, it shows up here." />}
          renderItem={({ item }) => <ReportCard g={item} />} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.extrabold, fontSize: 30, color: colors.navy900, letterSpacing: -0.6 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginTop: 4 },
});
