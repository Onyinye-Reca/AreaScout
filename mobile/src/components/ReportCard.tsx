import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { shortAgo } from '../lib/format';
import { colors, font, radius, space } from '../lib/theme';
import type { ReportGroup } from '../lib/types';
import { ReasonTag } from './admin';

export function ReportCard({ g }: { g: ReportGroup }) {
  const router = useRouter();
  const top = [...g.reports].sort((a, b) => Number(b.reason === 'scam') - Number(a.reason === 'scam'))[0].reason;
  return (
    <Pressable onPress={() => router.push(`/report-review/${g.listing_id}`)} style={s.card} accessibilityRole="button" accessibilityLabel={`Reports on ${g.listing_title}`}>
      <View style={s.top}><ReasonTag reason={top} /><Text style={s.ago}>{shortAgo(g.oldest_at)}</Text></View>
      <Text style={s.title}>{g.listing_title}</Text>
      <Text style={s.sub}>{g.report_count} {g.report_count === 1 ? 'report' : 'reports'} · {g.owner.verified ? 'verified' : 'unverified'} {g.owner.role}: “{g.owner.name}”</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.card + 4, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ago: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  title: { fontFamily: font.extrabold, fontSize: 19, color: colors.navy900 },
  sub: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
});
