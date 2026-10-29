import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ErrorState, Loading } from '../../../components/States';
import { BottomBar, Button, Card, Header, Mono } from '../../../components/ui';
import { api } from '../../../lib/api';
import { naira, plain } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Listing } from '../../../lib/types';

export default function Cost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [years, setYears] = useState<1 | 2>(1);
  const [moving, setMoving] = useState(false);
  const [movingCost, setMovingCost] = useState('');
  const data = useLoad(() => api<{ listing: Listing }>(`/listings/${id}`).then((r) => r.listing), [id]);

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Total move-in cost" /><Loading /></View>;
  if (data.error && !data.data) return <View style={{ flex: 1 }}><Header title="Total move-in cost" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  if (!data.data) return null;
  const l = data.data;

  const extra = moving ? Number(movingCost.replace(/[^0-9]/g, '')) || 0 : 0;
  const rent = l.rent * years;
  const total = rent + l.agency_fee + l.legal_fee + l.caution_deposit + l.service_charge + l.utilities + extra;
  const lines: { title: string; sub: string; amount: number }[] = [
    { title: 'Rent', sub: `${naira(l.rent)} × ${years} ${years === 1 ? 'year' : 'years'}`, amount: rent },
    { title: 'Agency fee', sub: 'As stated by the agent · one-off', amount: l.agency_fee },
    { title: 'Legal / agreement fee', sub: 'As stated by the agent · one-off', amount: l.legal_fee },
    { title: 'Caution deposit', sub: 'Refundable at move-out', amount: l.caution_deposit },
    { title: 'Service charge', sub: 'Yearly · as stated by the agent', amount: l.service_charge },
    ...(l.utilities ? [{ title: 'Utilities', sub: 'As stated by the agent', amount: l.utilities }] : []),
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header title="Total move-in cost" subtitle={l.title} />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={s.hero}>
          <Text style={s.heroLead}>You’ll need about</Text>
          <Text style={s.heroTotal} adjustsFontSizeToFit numberOfLines={1}>{naira(total)}</Text>
          {l.caution_deposit ? <Text style={s.heroNote}>{naira(l.caution_deposit)} of this is refundable when you move out.</Text> : null}
        </View>

        <Text style={s.h}>Rent paid upfront</Text>
        <View style={s.seg}>
          {([1, 2] as const).map((y) => (
            <Text key={y} onPress={() => setYears(y)} accessibilityRole="button" accessibilityState={{ selected: years === y }}
              style={[s.segItem, years === y && s.segOn]}>{y} {y === 1 ? 'year' : 'years'}</Text>
          ))}
        </View>

        <Card style={{ paddingVertical: space.xs }}>
          {lines.map((r, i) => (
            <View key={r.title} style={[s.row, i > 0 && s.rowBorder]}>
              <View style={{ flex: 1 }}><Text style={s.rowTitle}>{r.title}</Text><Text style={s.rowSub}>{r.sub}</Text></View>
              <Mono style={s.amount}>{plain(r.amount)}</Mono>
            </View>
          ))}
          <View style={[s.row, s.rowBorder]}>
            <View style={{ flex: 1 }}><Text style={s.rowTitle}>Moving and setup</Text><Text style={s.rowSub}>Optional · your own estimate</Text></View>
            <Switch value={moving} onValueChange={setMoving} trackColor={{ true: colors.teal500, false: colors.line }} />
          </View>
          {moving ? <TextInput style={s.input} keyboardType="number-pad" placeholder="Estimated cost in ₦" placeholderTextColor="#8A93A5" value={movingCost} onChangeText={setMovingCost} /> : null}
        </Card>

        <View style={s.note}><Text style={s.noteText}>Fees are as stated by the agent on {new Date(l.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. Confirm every amount in writing before you pay.</Text></View>
      </ScrollView>
      <BottomBar>
        <Button label="Share" variant="outline" style={{ flex: 1 }} onPress={() => Share.share({ message: `${l.title}: about ${naira(total)} to move in (${years} ${years === 1 ? 'year' : 'years'} rent upfront). Estimated on AreaScout.` })} />
        <Button label="Request inspection" style={{ flex: 1.6 }} onPress={() => router.push(`/inspect/${l.id}`)} />
      </BottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { backgroundColor: colors.navy900, borderRadius: 28, padding: space.xl },
  heroLead: { fontFamily: font.regular, fontSize: 17, color: '#D5DCEA' },
  heroTotal: { fontFamily: font.extrabold, fontSize: 44, color: colors.teal400, marginVertical: space.sm },
  heroNote: { fontFamily: font.regular, fontSize: 15, color: '#D5DCEA' },
  h: { fontFamily: font.bold, fontSize: 18, color: colors.navy900, marginBottom: -space.sm },
  seg: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: 4 },
  segItem: { flex: 1, textAlign: 'center', paddingVertical: 14, borderRadius: radius.input, overflow: 'hidden', fontFamily: font.semibold, fontSize: 16, color: colors.navy900 },
  segOn: { backgroundColor: colors.navy800, color: '#fff', fontFamily: font.bold },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.lg, gap: space.md },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  rowTitle: { fontFamily: font.bold, fontSize: 17, color: colors.navy900 },
  rowSub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  amount: { fontSize: 17 },
  input: { height: 48, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16, marginBottom: space.md },
  note: { backgroundColor: colors.navy100, borderRadius: radius.card, padding: space.lg },
  noteText: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.navy900 },
});
