import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Photo } from '../../components/Photo';
import { ErrorState, Loading } from '../../components/States';
import { Button, Header, Mono } from '../../components/ui';
import { gradeText } from '../../components/AreaSignal';
import { api } from '../../lib/api';
import { naira } from '../../lib/format';
import { useLoad } from '../../lib/hooks';
import { colors, font, space } from '../../lib/theme';
import type { Area, Listing } from '../../lib/types';

const COL = 150;

export default function Compare() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const router = useRouter();
  const data = useLoad(async () => {
    const listings = await Promise.all((ids ?? '').split(',').filter(Boolean).map((i) => api<{ listing: Listing }>(`/listings/${i}`).then((r) => r.listing)));
    const slugs = [...new Set(listings.map((l) => l.area_slug))];
    const areas = Object.fromEntries(await Promise.all(slugs.map((sl) => api<{ area: Area }>(`/areas/${sl}`).then((r) => [sl, r.area] as const))));
    return { listings, areas };
  }, [ids]);

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Compare" /><Loading /></View>;
  if (data.error && !data.data) return <View style={{ flex: 1 }}><Header title="Compare" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  if (!data.data) return null;
  const { listings, areas } = data.data;

  const rows: { label: string; cell: (l: Listing) => string; grade?: (l: Listing) => Area[keyof Area] }[] = [
    { label: 'Annual rent', cell: (l) => naira(l.rent) },
    { label: 'Move-in total', cell: (l) => naira(l.move_in_total) },
    { label: 'Bedrooms', cell: (l) => String(l.bedrooms) },
    { label: 'Bathrooms', cell: (l) => String(l.bathrooms) },
    { label: 'Power', cell: (l) => areas[l.area_slug].power, grade: (l) => areas[l.area_slug].power },
    { label: 'Flooding', cell: (l) => areas[l.area_slug].flooding, grade: (l) => areas[l.area_slug].flooding },
    { label: 'Security', cell: (l) => areas[l.area_slug].security, grade: (l) => areas[l.area_slug].security },
    { label: 'Traffic', cell: (l) => areas[l.area_slug].transport, grade: (l) => areas[l.area_slug].transport },
    { label: 'Internet', cell: (l) => areas[l.area_slug].internet, grade: (l) => areas[l.area_slug].internet },
  ];
  const cheapest = Math.min(...listings.map((l) => l.move_in_total));

  return (
    <View style={{ flex: 1 }}>
      <Header title="Compare homes" subtitle={`${listings.length} homes side by side`} />
      <ScrollView>
        <ScrollView horizontal contentContainerStyle={{ padding: space.lg }}>
          <View>
            <View style={s.row}>
              <View style={s.label} />
              {listings.map((l) => (
                <View key={l.id} style={s.col}>
                  <Photo uri={l.photos[0]} tint={l.id} label="" style={{ height: 90, borderRadius: 12 }} />
                  <Text style={s.name} numberOfLines={2}>{l.title}</Text>
                  <Button label="Details" variant="outline" style={{ height: 40, marginTop: 8, paddingHorizontal: 8 }} onPress={() => router.push(`/listing/${l.id}`)} />
                </View>
              ))}
            </View>
            {rows.map((r) => (
              <View key={r.label} style={[s.row, s.cellRow]}>
                <View style={s.label}><Text style={s.labelText}>{r.label}</Text></View>
                {listings.map((l) => {
                  const best = r.label === 'Move-in total' && l.move_in_total === cheapest && listings.length > 1;
                  return (
                    <View key={l.id} style={s.col}>
                      {r.grade ? <Text style={[s.val, { color: gradeText(r.grade(l) as any), fontFamily: font.bold }]}>{r.cell(l)}</Text>
                        : <Mono style={[s.val, best && { color: colors.teal700 }]}>{r.cell(l)}{best ? '  ✓ lowest' : ''}</Mono>}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
        <Text style={s.foot}>Area conditions are for the neighbourhood, not the street. Confirm all fees with the agent.</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  cellRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: space.md },
  label: { width: 84, justifyContent: 'center' },
  labelText: { fontFamily: font.semibold, fontSize: 13, color: colors.muted },
  col: { width: COL },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.navy900, marginTop: 8 },
  val: { fontSize: 15, color: colors.navy900 },
  foot: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, padding: space.xl },
});
