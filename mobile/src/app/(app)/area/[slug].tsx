import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AreaSignal, SIGNALS } from '../../../components/AreaSignal';
import { ErrorState, Loading } from '../../../components/States';
import { BottomBar, Button, Card, Header, Mono } from '../../../components/ui';
import { api } from '../../../lib/api';
import { initials, timeAgo } from '../../../lib/format';
import { useLoad } from '../../../lib/hooks';
import { colors, font, radius, space } from '../../../lib/theme';
import type { Area, AreaReviewItem } from '../../../lib/types';

export default function AreaReport() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const data = useLoad(() => api<{ area: Area; reviews: AreaReviewItem[] }>(`/areas/${slug}`), [slug]);

  if (data.loading && !data.data) return <View style={{ flex: 1 }}><Header title="Area report" /><Loading /></View>;
  if (data.error && !data.data) return <View style={{ flex: 1 }}><Header title="Area report" /><ErrorState error={data.error} onRetry={data.reload} /></View>;
  if (!data.data) return null;
  const { area: a, reviews } = data.data;

  return (
    <View style={{ flex: 1 }}>
      <Header title={`Living in ${a.name}`} subtitle="Area report" />
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
        <View style={s.hero}>
          <View style={s.score}><Text style={s.scoreNum}>{a.score || '–'}</Text>{a.score ? <Text style={s.scoreOf}>/100</Text> : null}</View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>{a.score >= 75 ? 'A good place to start your search' : a.score ? 'Worth a closer look' : 'No resident ratings yet'}</Text>
            <Text style={s.heroBody}>Based on {a.community_reports} resident {a.community_reports === 1 ? 'report' : 'reports'}. Conditions can vary from street to street.</Text>
          </View>
        </View>
        {a.description ? <Text style={s.about}>{a.description}</Text> : null}

        <Card>
          {SIGNALS.map((sig, i) => (
            <View key={sig.key} style={i > 0 && { borderTopWidth: 1, borderTopColor: colors.line }}>
              <AreaSignal label={sig.label} icon={sig.icon} grade={a[sig.key]}
                note={a.rating_averages[sig.key] ? `Residents rate this ${a.rating_averages[sig.key]}/5` : 'No resident ratings yet'} />
            </View>
          ))}
          <Mono style={s.source}>SOURCE · RESIDENT REPORTS AND LOCAL SOURCES</Mono>
        </Card>

        <Text style={s.h2}>What residents say</Text>
        {reviews.length === 0 ? <Text style={s.none}>No resident comments yet. Be the first to share.</Text> : reviews.map((r) => (
          <Card key={r.id} style={{ flexDirection: 'row', gap: space.md }}>
            <View style={s.avatar}><Text style={s.avatarText}>{initials(r.reviewer)}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.name}>{r.reviewer}</Text><Text style={s.time}>{timeAgo(r.created_at)}</Text></View>
              <Text style={s.comment}>{r.comment}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
      <BottomBar>
        <Button label="See homes here" variant="outline" style={{ flex: 1 }} onPress={() => router.push(`/results?area=${a.slug}`)} />
        <Button label="Add your report" style={{ flex: 1 }} onPress={() => router.push(`/area-review/${a.slug}`)} />
      </BottomBar>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', gap: space.lg, alignItems: 'center', backgroundColor: colors.navy900, borderRadius: radius.card + 8, padding: space.xl },
  score: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.teal500, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontFamily: font.extrabold, fontSize: 32, color: '#fff', lineHeight: 34 },
  scoreOf: { fontFamily: font.mono, fontSize: 11, color: '#DFF5F2' },
  heroTitle: { fontFamily: font.bold, fontSize: 19, color: '#fff' },
  heroBody: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: '#B9C5D9', marginTop: 4 },
  about: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.navy900 },
  source: { fontSize: 11, color: colors.muted, letterSpacing: 0.8, marginTop: space.sm },
  h2: { fontFamily: font.extrabold, fontSize: 20, color: colors.navy900, marginTop: space.sm },
  none: { fontFamily: font.regular, fontSize: 15, color: colors.muted },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.navy800, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: font.bold, fontSize: 14 },
  name: { fontFamily: font.bold, fontSize: 15, color: colors.navy900 },
  time: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  comment: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.navy900, marginTop: 4 },
});
